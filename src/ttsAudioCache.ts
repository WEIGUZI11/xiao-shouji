import type { TtsConfig } from './tts';

const TTS_CACHE_DB = 'xiaophone-tts-audio-cache';
const TTS_CACHE_STORE = 'audio';
const TTS_CACHE_VERSION = 1;
export const TTS_AUDIO_CACHE_LIMIT_BYTES = 64 * 1024 * 1024;

export interface TtsAudioCacheEntry {
  key: string;
  blob: Blob;
  byteSize: number;
  provider: TtsConfig['provider'];
  model: string;
  voiceId: string;
  textPreview: string;
  createdAt: number;
  lastPlayedAt: number;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildTtsAudioCacheKey(config: TtsConfig, text: string) {
  return `tts-${stableHash(JSON.stringify({
    provider: config.provider,
    baseUrl: config.baseUrl.trim().replace(/\/+$/, '').toLowerCase(),
    model: config.model.trim(),
    doubaoModel: config.doubaoModel || '',
    voiceId: config.voiceId.trim(),
    speechRate: config.speechRate || 0,
    loudnessRate: config.loudnessRate || 0,
    text,
  }))}`;
}

export function canStoreTtsAudio(currentBytes: number, nextBytes: number, replacedBytes = 0) {
  return Math.max(0, currentBytes - replacedBytes) + Math.max(0, nextBytes) <= TTS_AUDIO_CACHE_LIMIT_BYTES;
}

function openCacheDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB 音频缓存。'));
      return;
    }
    const request = indexedDB.open(TTS_CACHE_DB, TTS_CACHE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TTS_CACHE_STORE)) db.createObjectStore(TTS_CACHE_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('TTS 音频缓存打开失败。'));
  });
}

async function readAllEntries() {
  const db = await openCacheDb();
  try {
    return await new Promise<TtsAudioCacheEntry[]>((resolve, reject) => {
      const request = db.transaction(TTS_CACHE_STORE, 'readonly').objectStore(TTS_CACHE_STORE).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error || new Error('TTS 音频缓存读取失败。'));
    });
  } finally {
    db.close();
  }
}

export async function getTtsAudioCache(key: string) {
  const db = await openCacheDb();
  try {
    return await new Promise<TtsAudioCacheEntry | undefined>((resolve, reject) => {
      const transaction = db.transaction(TTS_CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(TTS_CACHE_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as TtsAudioCacheEntry | undefined;
        if (!entry) {
          resolve(undefined);
          return;
        }
        const next = { ...entry, lastPlayedAt: Date.now() };
        store.put(next);
        resolve(next);
      };
      request.onerror = () => reject(request.error || new Error('TTS 音频缓存读取失败。'));
    });
  } finally {
    db.close();
  }
}

export async function saveTtsAudioCache(config: TtsConfig, text: string, blob: Blob) {
  const key = buildTtsAudioCacheKey(config, text);
  const entries = await readAllEntries();
  const existing = entries.find((entry) => entry.key === key);
  const totalBytes = entries.reduce((sum, entry) => sum + Math.max(0, entry.byteSize || entry.blob?.size || 0), 0);
  if (!canStoreTtsAudio(totalBytes, blob.size, existing?.byteSize || 0)) {
    return { stored: false as const, key, reason: 'limit' as const };
  }
  const now = Date.now();
  const entry: TtsAudioCacheEntry = {
    key,
    blob,
    byteSize: blob.size,
    provider: config.provider,
    model: config.model,
    voiceId: config.voiceId,
    textPreview: text.trim().slice(0, 80),
    createdAt: existing?.createdAt || now,
    lastPlayedAt: now,
  };
  const db = await openCacheDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TTS_CACHE_STORE, 'readwrite');
      transaction.objectStore(TTS_CACHE_STORE).put(entry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('TTS 音频缓存写入失败。'));
    });
  } finally {
    db.close();
  }
  return { stored: true as const, key };
}

export async function listTtsAudioCache() {
  return (await readAllEntries()).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export async function getTtsAudioCacheStats() {
  const entries = await readAllEntries();
  return {
    count: entries.length,
    byteSize: entries.reduce((sum, entry) => sum + Math.max(0, entry.byteSize || entry.blob?.size || 0), 0),
    limitBytes: TTS_AUDIO_CACHE_LIMIT_BYTES,
  };
}

export async function deleteTtsAudioCache(keys: string[]) {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (!unique.length) return 0;
  const db = await openCacheDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TTS_CACHE_STORE, 'readwrite');
      const store = transaction.objectStore(TTS_CACHE_STORE);
      unique.forEach((key) => store.delete(key));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('TTS 音频缓存删除失败。'));
    });
  } finally {
    db.close();
  }
  return unique.length;
}

export async function clearTtsAudioCache() {
  const db = await openCacheDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TTS_CACHE_STORE, 'readwrite');
      transaction.objectStore(TTS_CACHE_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('TTS 音频缓存清空失败。'));
    });
  } finally {
    db.close();
  }
}
