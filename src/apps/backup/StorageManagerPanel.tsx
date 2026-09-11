import { Database, Image as ImageIcon, RefreshCw, Trash2, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  collectImageAssetReferences,
  deleteImageAssets,
  listImageAssets,
  type ImageAssetInfo,
} from '../../lib/imageAssetStore';
import {
  clearTtsAudioCache,
  deleteTtsAudioCache,
  listTtsAudioCache,
  TTS_AUDIO_CACHE_LIMIT_BYTES,
  type TtsAudioCacheEntry,
} from '../../ttsAudioCache';
import { useAppStore } from '../../store';
import { Panel, Row } from '../shared/AppPrimitives';

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(2)} MiB`;
}

export function StorageManagerPanel() {
  const [images, setImages] = useState<ImageAssetInfo[]>([]);
  const [audio, setAudio] = useState<TtsAudioCacheEntry[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string[]>([]);
  const [status, setStatus] = useState('这里只统计和手动清理，不会自动删除任何图片或音频。');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const references = collectImageAssetReferences(useAppStore.getState());
      const [nextImages, nextAudio] = await Promise.all([
        listImageAssets(references).catch(() => []),
        listTtsAudioCache().catch(() => []),
      ]);
      setImages(nextImages);
      setAudio(nextAudio);
      setSelectedImages((current) => current.filter((reference) => nextImages.some((item) => item.reference === reference && !item.referenced)));
      setSelectedAudio((current) => current.filter((key) => nextAudio.some((item) => item.key === key)));
      setStatus('统计已刷新。所有删除操作仍需手动确认。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const imageBytes = useMemo(() => images.reduce((sum, item) => sum + item.byteSize, 0), [images]);
  const audioBytes = useMemo(() => audio.reduce((sum, item) => sum + item.byteSize, 0), [audio]);
  const orphanImages = useMemo(() => images.filter((item) => !item.referenced), [images]);

  const deleteSelectedImages = async (references = selectedImages) => {
    const safeReferences = references.filter((reference) => images.some((item) => item.reference === reference && !item.referenced));
    if (!safeReferences.length) return;
    if (!window.confirm(`确认删除 ${safeReferences.length} 张未引用图片？删除后无法恢复。`)) return;
    await deleteImageAssets(safeReferences);
    setStatus(`已手动删除 ${safeReferences.length} 张未引用图片。`);
    await refresh();
  };

  const deleteSelectedAudio = async () => {
    if (!selectedAudio.length) return;
    if (!window.confirm(`确认删除 ${selectedAudio.length} 条 TTS 音频缓存？之后再次播放会重新调用接口。`)) return;
    await deleteTtsAudioCache(selectedAudio);
    setStatus(`已手动删除 ${selectedAudio.length} 条 TTS 缓存。`);
    await refresh();
  };

  const clearAudio = async () => {
    if (!audio.length || !window.confirm('确认清空全部 TTS 音频缓存？之后再次播放会重新调用接口。')) return;
    await clearTtsAudioCache();
    setStatus('全部 TTS 音频缓存已手动清空。');
    await refresh();
  };

  return (
    <>
      <Panel>
        <Row icon={<Database />} title="手动存储管理" desc="不按时间、不按容量自动删除；只有点击并确认后才会清理。" />
        <button type="button" className="fetch-button mt-3" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="h-4 w-4" /> {loading ? '统计中' : '刷新统计'}
        </button>
        <p className="mt-3 text-sm font-black leading-5 opacity-70">{status}</p>
      </Panel>

      <Panel>
        <Row icon={<ImageIcon />} title={`图片资产 ${images.length} 张`} desc={`${formatBytes(imageBytes)} · 已引用 ${images.length - orphanImages.length} · 未引用 ${orphanImages.length}`} />
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {orphanImages.length === 0 ? <p className="text-sm font-bold opacity-60">没有可手动清理的未引用图片。</p> : orphanImages.slice(0, 100).map((item) => (
            <label key={item.id} className="flex items-center gap-2 rounded-xl border-2 border-[#111]/20 bg-white/60 p-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={selectedImages.includes(item.reference)}
                onChange={(event) => setSelectedImages((current) => event.target.checked ? [...current, item.reference] : current.filter((value) => value !== item.reference))}
              />
              <span className="min-w-0 flex-1 truncate">{item.id}</span>
              <span>{formatBytes(item.byteSize)}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="save-button bg-[#ffd6d6]" disabled={!selectedImages.length} onClick={() => void deleteSelectedImages()}><Trash2 className="h-4 w-4" />删除选中</button>
          <button type="button" className="save-button bg-[#ffd6d6]" disabled={!orphanImages.length} onClick={() => void deleteSelectedImages(orphanImages.map((item) => item.reference))}><Trash2 className="h-4 w-4" />清空未引用</button>
        </div>
      </Panel>

      <Panel>
        <Row icon={<Volume2 />} title={`TTS 缓存 ${audio.length} 条`} desc={`${formatBytes(audioBytes)} / ${formatBytes(TTS_AUDIO_CACHE_LIMIT_BYTES)}；达到上限只停止新增，不自动删除。`} />
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {audio.length === 0 ? <p className="text-sm font-bold opacity-60">还没有 TTS 音频缓存。</p> : audio.slice(0, 100).map((item) => (
            <label key={item.key} className="flex items-start gap-2 rounded-xl border-2 border-[#111]/20 bg-white/60 p-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={selectedAudio.includes(item.key)}
                onChange={(event) => setSelectedAudio((current) => event.target.checked ? [...current, item.key] : current.filter((value) => value !== item.key))}
              />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{item.textPreview || '无文本摘要'}</b>
                <small className="block opacity-60">{item.provider} · {item.model || '默认模型'} · {item.voiceId || '默认音色'}</small>
              </span>
              <span>{formatBytes(item.byteSize)}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="save-button bg-[#ffd6d6]" disabled={!selectedAudio.length} onClick={() => void deleteSelectedAudio()}><Trash2 className="h-4 w-4" />删除选中</button>
          <button type="button" className="save-button bg-[#ffd6d6]" disabled={!audio.length} onClick={() => void clearAudio()}><Trash2 className="h-4 w-4" />清空缓存</button>
        </div>
      </Panel>
    </>
  );
}
