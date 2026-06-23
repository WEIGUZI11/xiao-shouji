/**
 * Backup app screen for exporting, importing, and clearing local small phone data.
 * Main component: BackupScreen.
 * Dependencies: backupPayload helpers, shared App primitives, browser localStorage/FileReader APIs.
 * Maintenance note: keep storage format changes in src/backup/backupPayload.ts and store migrations.
 */
import { Copy, FileText, Import, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { BACKUP_STORAGE_KEY, buildBackupFileName, buildBackupJson, buildNativeBackupMessage } from '../../backup/backupPayload';
import { Header, Panel, Row } from '../shared/AppPrimitives';

export function BackupScreen() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('导出后可以在更新 APK 或网页版本后再导入，恢复聊天、角色、相册、设置和主题。');

  const exportBackup = () => {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) {
      setStatus('还没有可导出的本地数据。');
      return;
    }
    const exportedAt = new Date();
    const filename = buildBackupFileName(exportedAt);
    const backupJson = buildBackupJson(raw, exportedAt);
    const nativeBridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void }; __SMALL_PHONE_NATIVE__?: boolean }).ReactNativeWebView;
    if (nativeBridge && (window as Window & { __SMALL_PHONE_NATIVE__?: boolean }).__SMALL_PHONE_NATIVE__) {
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
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const data = parsed?.storageKey === BACKUP_STORAGE_KEY ? parsed.data : parsed;
        if (!data || typeof data !== 'object' || !('state' in data)) {
          throw new Error('备份格式不正确');
        }
        window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(data));
        setStatus('导入成功，正在重新打开小手机。');
        window.setTimeout(() => window.location.reload(), 350);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '导入失败，请确认是小手机备份 JSON。');
      }
    };
    reader.readAsText(file);
  };

  const clearLocalData = () => {
    if (!window.confirm('确认清空当前小手机本地数据？建议先导出备份。')) return;
    window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    setStatus('本地数据已清空，正在重新打开小手机。');
    window.setTimeout(() => window.location.reload(), 350);
  };

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="数据备份" subtitle="导出 / 导入小手机本地数据" />
      <Panel>
        <Row icon={<FileText />} title="导出备份" desc="保存当前所有本地数据，更新版本前先导出。" />
        <button type="button" onClick={exportBackup} className="fetch-button mt-3">
          <Copy className="h-5 w-5" />
          导出 JSON
        </button>
      </Panel>
      <Panel>
        <Row icon={<Import />} title="导入备份" desc="选择之前导出的 JSON，导入后会自动刷新小手机。" />
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="fetch-button mt-3">
          <Import className="h-5 w-5" />
          导入 JSON
        </button>
      </Panel>
      <Panel>
        <Row icon={<Trash2 />} title="清空本地数据" desc="只在确认备份已经可用时使用。" />
        <button type="button" onClick={clearLocalData} className="fetch-button mt-3 bg-[#ffd6d6]">
          <Trash2 className="h-5 w-5" />
          清空数据
        </button>
        <p className="mt-3 text-sm font-black leading-5 opacity-70">{status}</p>
      </Panel>
    </section>
  );
}
