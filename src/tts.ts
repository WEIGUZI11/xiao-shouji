/**
 * TTS provider helpers for browser, local HTTP, OpenAI, Gemini, MiniMax, and Doubao speech.
 * Main functions: buildExternalTtsRequest, speakWithConfiguredTts, speakWithBrowserTts.
 * Dependencies: createId from src/lib/utils.
 * Maintenance note: keep provider-specific request shapes here instead of spreading them through App.tsx.
 */
import { createId } from './lib/utils';
import { runPaidTask } from './lib/paidTaskManager';
import { buildTtsAudioCacheKey, getTtsAudioCache, saveTtsAudioCache } from './ttsAudioCache';
import {
  enqueueTtsPlayback,
  getTtsQueueSnapshot,
  stopAllTtsQueue,
  subscribeTtsQueue,
  type TtsQueueEntryStatus,
} from './ttsQueue';
import { isTrustedTtsProxyUrl } from './ttsProxyPolicy';

export { getTtsQueueSnapshot, subscribeTtsQueue } from './ttsQueue';

export type TtsProvider = 'browser' | 'local' | 'openai' | 'gemini' | 'minimax' | 'doubao';

export interface TtsConfig {
  provider: TtsProvider;
  baseUrl: string;
  apiKey: string;
  appId?: string;
  model: string;
  doubaoModel?: 'seed-tts-2.0-standard' | 'seed-tts-2.0-expressive';
  voiceId: string;
  speechRate?: number;
  loudnessRate?: number;
}

export const defaultTtsConfig: TtsConfig = {
  provider: 'browser',
  baseUrl: '',
  apiKey: '',
  appId: '',
  model: 'gpt-4o-mini-tts',
  doubaoModel: 'seed-tts-2.0-standard',
  voiceId: 'alloy',
  speechRate: 0,
  loudnessRate: 0,
};

export type TtsResponseType = 'auto' | 'audio' | 'gemini-json' | 'minimax-json' | 'doubao-json' | 'doubao-stream-json';

export interface BuiltTtsRequest {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
  responseType: TtsResponseType;
}

declare global {
  interface Window {
    __SMALL_PHONE_NATIVE__?: boolean;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

type MinimalTtsResponse = Pick<Response, 'ok' | 'status' | 'headers' | 'text' | 'json' | 'blob'>;

interface NativeTtsBridgeResponse {
  id: string;
  ok?: boolean;
  status?: number;
  headers?: Record<string, string>;
  bodyText?: string;
  error?: string;
}

function trimSlash(url: string) {
  return url.trim().replace(/\/+$/, '');
}

function normalizeOpenAiBaseUrl(url: string) {
  const base = trimSlash(url) || 'https://api.openai.com/v1';
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

function normalizeGeminiBaseUrl(url: string) {
  return trimSlash(url) || 'https://generativelanguage.googleapis.com/v1beta';
}

function normalizeMiniMaxTtsUrl(url: string) {
  const base = trimSlash(url);
  if (!base) return 'https://api.minimax.io/v1/t2a_v2';
  if (/\/v1\/t2a_v2$/i.test(base)) return base;
  if (base.endsWith('/v1')) return `${base}/t2a_v2`;
  return `${base}/v1/t2a_v2`;
}

function normalizeDoubaoTtsUrl(url: string) {
  return trimSlash(url) || 'https://openspeech.bytedance.com/api/v1/tts';
}

function normalizeDoubaoArkTtsUrl(url: string) {
  const base = trimSlash(url);
  if (!base || /\/api\/v1\/tts$/i.test(base)) return 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
  if (/\/api\/v3\/tts\/unidirectional$/i.test(base)) return base;
  return `${base}/api/v3/tts/unidirectional`;
}

function shouldUseLegacyDoubaoTts(config: TtsConfig) {
  const base = trimSlash(config.baseUrl);
  const model = config.model.trim().toLowerCase();
  return model === 'volcano_tts' || /\/api\/v1\/tts$/i.test(base);
}

function normalizeDoubaoResourceAndModel(config: TtsConfig) {
  const configured = config.model.trim() || 'seed-tts-2.0';
  if (configured === 'seed-tts-2.0-standard' || configured === 'seed-tts-2.0-expressive') {
    return { resourceId: 'seed-tts-2.0', model: configured };
  }
  const supportsTts2Submodel = configured === 'seed-tts-2.0' || configured === 'seed-icl-2.0';
  return {
    resourceId: configured,
    model: supportsTts2Submodel ? config.doubaoModel || 'seed-tts-2.0-standard' : undefined,
  };
}

function createRequestId() {
  return createId('tts');
}

function clampDoubaoRate(value: number | undefined, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(-50, Math.min(100, Math.round(value || 0)));
}

function isAbsoluteHttpUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

function canUseNativeTtsBridge() {
  return typeof window !== 'undefined' && Boolean(window.__SMALL_PHONE_NATIVE__ && window.ReactNativeWebView);
}

function shouldUseSameOriginTtsProxy(url: string) {
  if (typeof window === 'undefined' || canUseNativeTtsBridge() || !isAbsoluteHttpUrl(url)) return false;
  try {
    const target = new URL(url);
    return target.origin !== window.location.origin && isTrustedTtsProxyUrl(url);
  } catch {
    return false;
  }
}

function createTextResponse(payload: { ok?: boolean; status?: number; headers?: Record<string, string>; bodyText?: string }): MinimalTtsResponse {
  const headers = new Headers(payload.headers || {});
  const bodyText = payload.bodyText || '';
  return {
    ok: Boolean(payload.ok),
    status: payload.status || 0,
    headers,
    text: async () => bodyText,
    json: async () => JSON.parse(bodyText || '{}'),
    blob: async () => new Blob([bodyText], { type: headers.get('content-type') || 'text/plain' }),
  };
}

async function fetchViaNativeTtsBridge(request: BuiltTtsRequest, signal?: AbortSignal): Promise<MinimalTtsResponse> {
  if (!canUseNativeTtsBridge() || !window.ReactNativeWebView) {
    throw new Error('Native TTS bridge is unavailable.');
  }
  const id = createRequestId();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('small-phone-native-tts-response', onResponse as EventListener);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'small-phone-tts-cancel', id }));
      cleanup();
      reject(signal?.reason || new DOMException('TTS request aborted.', 'AbortError'));
    };
    const timeout = window.setTimeout(() => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'small-phone-tts-cancel', id }));
      cleanup();
      reject(new Error('Native TTS bridge timed out.'));
    }, 45000);
    const onResponse = (event: CustomEvent<NativeTtsBridgeResponse>) => {
      const detail = event.detail;
      if (!detail || detail.id !== id) return;
      cleanup();
      if (detail.error) {
        reject(new Error(detail.error));
        return;
      }
      resolve(createTextResponse(detail));
    };
    window.addEventListener('small-phone-native-tts-response', onResponse as EventListener);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'small-phone-tts-fetch',
      id,
      url: request.url,
      init: {
        method: request.init.method || 'GET',
        headers: request.init.headers,
        body: typeof request.init.body === 'string' ? request.init.body : undefined,
      },
      responseType: request.responseType,
    }));
  });
}

async function fetchViaSameOriginTtsProxy(request: BuiltTtsRequest, signal?: AbortSignal): Promise<Response> {
  return fetch('/api/tts/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: request.url,
      init: {
        method: request.init.method || 'GET',
        headers: request.init.headers,
        body: typeof request.init.body === 'string' ? request.init.body : undefined,
      },
      responseType: request.responseType,
    }),
    signal,
  });
}

async function fetchTtsRequest(request: BuiltTtsRequest, signal?: AbortSignal): Promise<MinimalTtsResponse> {
  if (canUseNativeTtsBridge()) return fetchViaNativeTtsBridge(request, signal);
  if (shouldUseSameOriginTtsProxy(request.url)) {
    try {
      const proxyResponse = await fetchViaSameOriginTtsProxy(request, signal);
      if (proxyResponse.ok || proxyResponse.status !== 404) return proxyResponse;
    } catch {
      // Fall back to the direct request below. Some static hosts do not expose the proxy.
    }
  }
  return fetch(request.url, { ...request.init, signal });
}

export function buildExternalTtsRequest(config: TtsConfig, text: string): BuiltTtsRequest | null {
  const input = text.trim();
  if (!input || config.provider === 'browser') return null;
  if (config.provider === 'openai') {
    return {
      url: `${normalizeOpenAiBaseUrl(config.baseUrl)}/audio/speech`,
      responseType: 'audio',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          model: config.model.trim() || 'gpt-4o-mini-tts',
          voice: config.voiceId.trim() || 'alloy',
          input,
          format: 'mp3',
        }),
      },
    };
  }
  if (config.provider === 'gemini') {
    const model = config.model.trim() || 'gemini-2.5-flash-preview-tts';
    const key = encodeURIComponent(config.apiKey.trim());
    return {
      url: `${normalizeGeminiBaseUrl(config.baseUrl)}/models/${encodeURIComponent(model)}:generateContent${key ? `?key=${key}` : ''}`,
      responseType: 'gemini-json',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: config.voiceId.trim() || 'Kore',
                },
              },
            },
          },
        }),
      },
    };
  }
  if (config.provider === 'minimax') {
    return {
      url: normalizeMiniMaxTtsUrl(config.baseUrl),
      responseType: 'minimax-json',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          model: config.model.trim() || 'speech-2.8-hd',
          text: input,
          stream: false,
          voice_setting: {
            voice_id: config.voiceId.trim() || 'female-shaonv',
            speed: 1,
            vol: 1,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1,
          },
        }),
      },
    };
  }
  if (config.provider === 'doubao') {
    const token = config.apiKey.trim();
    const appid = config.appId?.trim() || '';
    if (!token) throw new Error('先填写豆包 TTS API Key。');
    if (!shouldUseLegacyDoubaoTts(config)) {
      const speaker = config.voiceId.trim();
      if (!speaker) throw new Error('先填写豆包音色 ID；公版音色可点预设，复刻音色填写控制台生成的 Speaker ID。');
      const { resourceId, model } = normalizeDoubaoResourceAndModel(config);
      return {
        url: normalizeDoubaoArkTtsUrl(config.baseUrl),
        responseType: 'doubao-stream-json',
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(appid
              ? { 'X-Api-App-Id': appid, 'X-Api-Access-Key': token }
              : { 'X-Api-Key': token }),
            'X-Api-Resource-Id': resourceId,
            'X-Api-Request-Id': createRequestId(),
          },
          body: JSON.stringify({
            user: {
              uid: 'xiaophone-user',
            },
            req_params: {
              text: input,
              speaker,
              ...(model ? { model } : {}),
              audio_params: {
                format: 'mp3',
                sample_rate: 24000,
                speech_rate: clampDoubaoRate(config.speechRate, 0),
                loudness_rate: clampDoubaoRate(config.loudnessRate, 0),
              },
            },
          }),
        },
      };
    }
    if (!appid) throw new Error('豆包旧版 v1 接口还需要填写 App ID。');
    return {
      url: normalizeDoubaoTtsUrl(config.baseUrl),
      responseType: 'doubao-json',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer;${token}` } : {}),
        },
        body: JSON.stringify({
          app: {
            appid,
            token,
            cluster: config.model.trim() || 'volcano_tts',
          },
          user: {
            uid: 'xiaophone-user',
          },
          audio: {
            voice_type: config.voiceId.trim() || 'BV001_streaming',
            encoding: 'mp3',
            speed_ratio: 1,
            volume_ratio: 1,
            pitch_ratio: 1,
          },
          request: {
            reqid: createRequestId(),
            text: input,
            text_type: 'plain',
            operation: 'query',
            with_frontend: 1,
            frontend_type: 'unitTson',
          },
        }),
      },
    };
  }
  return {
    url: config.baseUrl.trim(),
    responseType: 'auto',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input,
        input,
        voice: config.voiceId.trim() || 'default',
        voiceId: config.voiceId.trim() || 'default',
      }),
    },
  };
}

export function speakWithBrowserTts(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    throw new Error('当前浏览器不支持内置 TTS。');
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64ToBlob(base64: string, mimeType: string) {
  const bytes = base64ToBytes(base64);
  return new Blob([bytes], { type: mimeType || 'audio/wav' });
}

function base64ChunksToBlob(chunks: string[], mimeType: string) {
  const byteChunks = chunks.map(base64ToBytes);
  const totalLength = byteChunks.reduce((sum, bytes) => sum + bytes.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const bytes of byteChunks) {
    merged.set(bytes, offset);
    offset += bytes.length;
  }
  return new Blob([merged], { type: mimeType || 'audio/mpeg' });
}

function hexToBlob(hex: string, mimeType: string) {
  const clean = hex.trim().replace(/^0x/i, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let index = 0; index < clean.length; index += 2) {
    bytes[index / 2] = Number.parseInt(clean.slice(index, index + 2), 16);
  }
  return new Blob([bytes], { type: mimeType || 'audio/mpeg' });
}

let pendingAudioPlayback: {
  url: string;
  revoke: boolean;
  signal?: AbortSignal;
  resolve: () => void;
  reject: (error: unknown) => void;
} | null = null;
let pendingAudioReplayBound = false;
let activeAudio: HTMLAudioElement | null = null;

function isPlaybackBlocked(error: unknown) {
  const value = error as { name?: string; message?: string };
  const message = `${value?.name || ''} ${value?.message || ''}`.toLowerCase();
  return message.includes('notallowed') || message.includes('interact') || message.includes('user gesture');
}

function bindPendingAudioReplay() {
  if (typeof window === 'undefined' || pendingAudioReplayBound) return;
  pendingAudioReplayBound = true;
  const replay = () => {
    void replayPendingAudio();
  };
  window.addEventListener('pointerdown', replay, true);
  window.addEventListener('touchend', replay, true);
  window.addEventListener('keydown', replay, true);
}

function playAudioUrlOnce(url: string, revoke: boolean, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    activeAudio = audio;
    let settled = false;
    const cleanup = () => {
      if (activeAudio === audio) activeAudio = null;
      signal?.removeEventListener('abort', onAbort);
      if (revoke) URL.revokeObjectURL(url);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      audio.pause();
      audio.removeAttribute('src');
      fail(signal?.reason || new DOMException('TTS playback aborted.', 'AbortError'));
    };
    audio.onended = finish;
    audio.onerror = () => fail(new Error('TTS 音频播放失败。'));
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    audio.play().catch((error) => {
      if (!isPlaybackBlocked(error)) {
        fail(error);
        return;
      }
      if (activeAudio === audio) activeAudio = null;
      signal?.removeEventListener('abort', onAbort);
      pendingAudioPlayback = { url, revoke, signal, resolve, reject };
      bindPendingAudioReplay();
    });
  });
}

async function replayPendingAudio() {
  if (!pendingAudioPlayback) return;
  const target = pendingAudioPlayback;
  pendingAudioPlayback = null;
  try {
    await playAudioUrlOnce(target.url, target.revoke, target.signal);
    target.resolve();
  } catch (error) {
    if (isPlaybackBlocked(error)) {
      pendingAudioPlayback = target;
      return;
    }
    target.reject(error);
  }
}

function playAudioUrlWithAutoplayFallback(url: string, revoke: boolean, signal?: AbortSignal) {
  return playAudioUrlOnce(url, revoke, signal);
}

function playAudioBlob(blob: Blob, signal?: AbortSignal) {
  return playAudioUrlWithAutoplayFallback(URL.createObjectURL(blob), true, signal);
}

function playAudioUrl(url: string, signal?: AbortSignal) {
  return playAudioUrlWithAutoplayFallback(url, false, signal);
}

function readJsonAudioSource(data: unknown): { blob?: Blob; url?: string } {
  const value = data as {
    audioUrl?: string;
    audio_url?: string;
    url?: string;
    audio?: string;
    data?: string;
    mimeType?: string;
    mime_type?: string;
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
          inline_data?: { data?: string; mime_type?: string };
        }>;
      };
    }>;
  };
  const url = value.audioUrl || value.audio_url || value.url;
  if (url) return { url };
  const inline = value.candidates?.[0]?.content?.parts?.find((part) => part.inlineData || part.inline_data);
  const inlineData = (inline?.inlineData || inline?.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
  const base64 = inlineData?.data || value.audio || value.data;
  if (!base64) throw new Error('TTS 没有返回可播放音频。');
  const mimeType = inlineData?.mimeType || inlineData?.mime_type || value.mimeType || value.mime_type || 'audio/wav';
  return { blob: base64ToBlob(base64, mimeType) };
}

function readMiniMaxJsonAudio(data: unknown) {
  const value = data as {
    data?: {
      audio?: string;
      status?: number;
    };
    trace_id?: string;
    base_resp?: {
      status_code?: number;
      status_msg?: string;
    };
  };
  const statusCode = value.base_resp?.status_code;
  if (typeof statusCode === 'number' && statusCode !== 0) {
    throw new Error(value.base_resp?.status_msg || `MiniMax TTS 失败：${statusCode}`);
  }
  const audioHex = value.data?.audio;
  if (!audioHex) {
    throw new Error(value.base_resp?.status_msg || 'MiniMax TTS 没有返回可播放音频。');
  }
  return hexToBlob(audioHex, 'audio/mpeg');
}

function readDoubaoJsonAudio(data: unknown) {
  const value = data as {
    code?: number;
    message?: string;
    data?: string;
  };
  if (typeof value.code === 'number' && value.code !== 3000) {
    throw new Error(value.message || `豆包 TTS 失败：${value.code}`);
  }
  if (!value.data) {
    throw new Error(value.message || '豆包 TTS 没有返回可播放音频。');
  }
  return base64ToBlob(value.data, 'audio/mpeg');
}

export function extractDoubaoStreamAudioChunks(text: string) {
  const chunks: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaping) escaping = false;
      else if (char === '\\') escaping = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const packet = JSON.parse(text.slice(start, index + 1)) as { code?: number; message?: string; data?: string | null };
        if (typeof packet.code === 'number' && packet.code !== 0 && packet.code !== 20000000) {
          throw new Error(packet.message || `豆包 TTS 失败：${packet.code}`);
        }
        if (typeof packet.data === 'string' && packet.data) chunks.push(packet.data);
        start = -1;
      }
    }
  }
  return chunks;
}

function readDoubaoStreamJsonAudio(text: string) {
  const chunks = extractDoubaoStreamAudioChunks(text);
  if (!chunks.length) {
    throw new Error('豆包 TTS 没有返回可播放音频。');
  }
  return base64ChunksToBlob(chunks, 'audio/mpeg');
}

async function readTtsErrorDetail(response: MinimalTtsResponse) {
  try {
    const detail = await response.text();
    if (!detail.trim()) return '';
    try {
      const parsed = JSON.parse(detail) as {
        error?: { message?: string };
        header?: { message?: string };
        message?: string;
      };
      return parsed.error?.message || parsed.header?.message || parsed.message || detail.slice(0, 240);
    } catch {
      return detail.slice(0, 240);
    }
  } catch {
    return '';
  }
}

function playBrowserTtsQueued(text: string, signal: AbortSignal) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.reject(new Error('当前浏览器不支持内置 TTS。'));
  }
  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      window.speechSynthesis.cancel();
      cleanup();
      reject(signal.reason || new DOMException('TTS playback aborted.', 'AbortError'));
    };
    utterance.onend = () => { cleanup(); resolve(); };
    utterance.onerror = () => { cleanup(); reject(new Error('浏览器 TTS 播放失败。')); };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

async function readConfiguredTtsAudio(text: string, config: TtsConfig, signal: AbortSignal) {
  const request = buildExternalTtsRequest(config, text);
  if (!request) throw new Error('TTS 请求内容为空。');
  if (!request.url) throw new Error('先填写 TTS 接口地址。');
  const response = await runPaidTask({
    kind: 'tts-synthesis',
    key: buildTtsAudioCacheKey(config, text),
    signal,
    run: (paidSignal) => fetchTtsRequest(request, paidSignal),
  });
  if (!response.ok) {
    const detail = await readTtsErrorDetail(response);
    throw new Error(detail ? `TTS 失败：${response.status} ${detail}` : `TTS 失败：${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (request.responseType === 'audio' || contentType.startsWith('audio/')) {
    return { blob: await response.blob() };
  }
  if (request.responseType === 'minimax-json') {
    return { blob: readMiniMaxJsonAudio(await response.json()) };
  }
  if (request.responseType === 'doubao-json') {
    return { blob: readDoubaoJsonAudio(await response.json()) };
  }
  if (request.responseType === 'doubao-stream-json') {
    return { blob: readDoubaoStreamJsonAudio(await response.text()) };
  }
  return readJsonAudioSource(await response.json());
}

async function runQueuedTts(
  text: string,
  config: TtsConfig,
  signal: AbortSignal,
  setStatus: (status: TtsQueueEntryStatus) => void,
) {
  if (config.provider === 'browser') {
    setStatus('playing');
    await playBrowserTtsQueued(text, signal);
    return;
  }
  const cacheKey = buildTtsAudioCacheKey(config, text);
  const cached = await getTtsAudioCache(cacheKey).catch(() => undefined);
  if (cached?.blob) {
    setStatus('playing');
    await playAudioBlob(cached.blob, signal);
    return;
  }
  setStatus('synthesizing');
  const source = await readConfiguredTtsAudio(text, config, signal);
  if (source.blob) {
    await saveTtsAudioCache(config, text, source.blob).catch(() => undefined);
    setStatus('playing');
    await playAudioBlob(source.blob, signal);
    return;
  }
  if (source.url) {
    setStatus('playing');
    await playAudioUrl(source.url, signal);
    return;
  }
  throw new Error('TTS 没有返回可播放音频。');
}

export function stopAllTts() {
  stopAllTtsQueue();
  if (pendingAudioPlayback) {
    const pending = pendingAudioPlayback;
    pendingAudioPlayback = null;
    if (pending.revoke) URL.revokeObjectURL(pending.url);
    pending.reject(new DOMException('TTS playback stopped.', 'AbortError'));
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speakWithConfiguredTts(text: string, config: TtsConfig, source = '小手机') {
  const input = text.trim();
  if (!input) return Promise.resolve();
  const dedupeKey = buildTtsAudioCacheKey(config, input);
  return enqueueTtsPlayback({
    id: createRequestId(),
    dedupeKey,
    text: input,
    source,
    provider: config.provider,
    run: (signal, setStatus) => runQueuedTts(input, { ...config }, signal, setStatus),
  });
}
