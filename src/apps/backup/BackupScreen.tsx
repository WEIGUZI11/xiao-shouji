/**
 * Backup app screen for exporting, importing, and clearing local small phone data.
 * Main component: BackupScreen.
 * Dependencies: backupPayload helpers, shared App primitives, browser localStorage/FileReader APIs.
 * Maintenance note: keep storage format changes in src/backup/backupPayload.ts and store migrations.
 */
import { Copy, Database, FileText, Import, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { BACKUP_STORAGE_KEY, buildBackupFileName, buildBackupJson, buildNativeBackupMessage, parseBackupDocument, parseBackupStorageData } from '../../backup/backupPayload';
import { commitBackupImport } from '../../backup/commitBackupImport';
import { clearImageAssets, exportImageAssets, importImageAssetsPreservingExisting } from '../../lib/imageAssetStore';
import { migratePersistedAppState, useAppStore } from '../../store';
import { clearTtsAudioCache } from '../../ttsAudioCache';
import { Header, Panel, Row } from '../shared/AppPrimitives';
import { StorageManagerPanel } from './StorageManagerPanel';

const auxiliaryStorageKeys = ['wechat-moment-meta-v1', 'xiaophone.tts.voicePresets'];

export function BackupScreen() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('导出后可以在更新 APK 或网页版本后再导入，恢复聊天、角色、相册、设置和主题。');
  const [tab, setTab] = useState<'backup' | 'storage'>('backup');
  const [isImporting, setIsImporting] = useState(false);
  const nativeWindow = window as Window & {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __SMALL_PHONE_NATIVE__?: boolean;
    __SMALL_PHONE_BROKEN_ORIGIN_MODE__?: boolean;
  };
  const isNativeApk = Boolean(nativeWindow.ReactNativeWebView && nativeWindow.__SMALL_PHONE_NATIVE__);
  const isBrokenOriginMode = Boolean(nativeWindow.__SMALL_PHONE_BROKEN_ORIGIN_MODE__);

  const switchStorageOrigin = (mode: 'stable' | 'broken-v1161') => {
    if (!isNativeApk) return;
    if (mode === 'broken-v1161' && !window.confirm('这里只用于找回 1.16.1 错误版本期间新录入的数据。进入后先导出 JSON，不要清空数据。继续吗？')) return;
    nativeWindow.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'small-phone-switch-storage-origin', mode }));
  };

  const exportBackup = async () => {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) {
      setStatus('还没有可导出的本地数据。');
      return;
    }
    const exportedAt = new Date();
    const filename = buildBackupFileName(exportedAt);
    setStatus('正在整理设置和图片资产…');
    const imageAssets = await exportImageAssets().catch(() => ({}));
    const auxiliaryStorage = Object.fromEntries(auxiliaryStorageKeys.flatMap((key) => {
      const value = window.localStorage.getItem(key);
      return value == null ? [] : [[key, value]];
    }));
    const backupJson = buildBackupJson(raw, exportedAt, imageAssets, auxiliaryStorage);
    const nativeBridge = nativeWindow.ReactNativeWebView;
    if (nativeBridge && nativeWindow.__SMALL_PHONE_NATIVE__) {
      nativeBridge.postMessage(buildNativeBackupMessage(filename, backupJson));
      setStatus('备份文件已经交给手机系统保存/分享。');
      return;
    }
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('备份文件已经导出。');
  };

  const importBackup = (file?: File) => {
    if (!file) return;
    setIsImporting(true);
    setStatus(`正在检查 ${file.name || '备份文件'}…`);
    const reader = new FileReader();
    reader.onload = async () => {
      let committed = false;
      try {
        const parsed = parseBackupDocument(String(reader.result || ''));
        const data = parseBackupStorageData(parsed);
        const version = useAppStore.persist.getOptions().version ?? 78;
        if (Number(data.version) > version) throw new Error('这份备份来自更新版本，请先更新小手机再导入。');
        const normalized = { state: migratePersistedAppState(data.state, Number(data.version) || 0), version };
        if (!window.confirm('将安全合并这份备份：当前聊天、角色、设置和图片都会保留，只补入备份中缺少的内容。继续吗？')) {
          setStatus('已取消，没有修改任何数据。');
          return;
        }
        const importedImages = await importImageAssetsPreservingExisting(parsed?.imageAssets);
        commitBackupImport(window.localStorage, normalized, () => {
          void useAppStore.persist.rehydrate();
          if (!useAppStore.persist.hasHydrated()) throw new Error('数据加载失败');
        });
        committed = true;
        if (parsed?.auxiliaryStorage && typeof parsed.auxiliaryStorage === 'object') {
          auxiliaryStorageKeys.forEach((key) => {
            const value = parsed.auxiliaryStorage[key];
            if (typeof value === 'string' && window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
          });
        }
        setStatus(`安全合并成功${importedImages ? `，补入 ${importedImages} 张图片` : ''}；当前数据均已保留，正在重新打开小手机。`);
        window.setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        const message = error instanceof Error ? error.message : '导入失败，请确认是小手机备份 JSON。';
        // Image import only adds missing assets. Never clear the gallery on an error.
        setStatus(`${message}；${committed ? '主体数据已合并，附加设置未全部导入，可重新尝试' : '原有数据和图片均未删除'}。`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      setStatus('备份文件读取失败，请重新选择 JSON。');
    };
    reader.readAsText(file);
  };

  const clearLocalData = async () => {
    if (!window.confirm('确认清空当前小手机本地数据？建议先导出备份。')) return;
    window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    auxiliaryStorageKeys.forEach((key) => window.localStorage.removeItem(key));
    await clearImageAssets().catch(() => undefined);
    await clearTtsAudioCache().catch(() => undefined);
    setStatus('本地数据已清空，正在重新打开小手机。');
    window.setTimeout(() => window.location.reload(), 350);
  };

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header
        title="数据备份"
        subtitle="备份恢复 / 手动存储管理"
        tabs={(
          <>
            <button type="button" className={`pill ${tab === 'backup' ? 'active' : ''}`} onClick={() => setTab('backup')}><FileText className="h-4 w-4" />备份恢复</button>
            <button type="button" className={`pill ${tab === 'storage' ? 'active' : ''}`} onClick={() => setTab('storage')}><Database className="h-4 w-4" />存储管理</button>
          </>
        )}
      />
      {tab === 'storage' ? <StorageManagerPanel /> : (
        <>
      {isNativeApk && (
        <Panel>
          <Row
            icon={<Database />}
            title={isBrokenOriginMode ? '正在查看 1.16.1 临时数据' : '1.16.1 数据找回'}
            desc={isBrokenOriginMode
              ? '这里是错误版本使用过的独立存储。先导出 JSON，再返回旧数据并使用安全合并。'
              : '如果你曾在错误版里重新录入内容，可以进入临时存储导出；旧版数据不会被覆盖。'}
          />
          <button
            type="button"
            onClick={() => switchStorageOrigin(isBrokenOriginMode ? 'stable' : 'broken-v1161')}
            className="fetch-button mt-3"
          >
            <Database className="h-5 w-5" />
            {isBrokenOriginMode ? '返回原来的旧数据' : '查看 1.16.1 临时数据'}
          </button>
        </Panel>
      )}
      <Panel>
        <Row icon={<Import />} title="导入备份（安全合并）" desc="支持旧版和新版备份；保留当前数据，只补入备份中缺少的内容。" />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          importBackup(file);
        }} />
        <button type="button" onClick={() => fileRef.current?.click()} className="fetch-button mt-3" disabled={isImporting}>
          <Import className="h-5 w-5" />
          {isImporting ? '正在导入…' : '选择 JSON 并导入'}
        </button>
        <p className="mt-3 text-sm font-black leading-5 opacity-70" role="status">{status}</p>
      </Panel>
      <Panel>
        <Row icon={<FileText />} title="导出备份" desc="保存当前所有本地数据，更新版本前先导出。" />
        <button type="button" onClick={exportBackup} className="fetch-button mt-3">
          <Copy className="h-5 w-5" />
          导出 JSON
        </button>
      </Panel>
      <Panel>
        <Row icon={<Trash2 />} title="清空本地数据" desc="只在确认备份已经可用时使用。" />
        <button type="button" onClick={clearLocalData} className="fetch-button mt-3 bg-[#ffd6d6]">
          <Trash2 className="h-5 w-5" />
          清空数据
        </button>
      </Panel>
        </>
      )}
    </section>
  );
}
