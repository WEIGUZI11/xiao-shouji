/**
 * TTS provider helpers for browser, local HTTP, OpenAI, Gemini, MiniMax, and Doubao speech.
 * Main functions: buildExternalTtsRequest, speakWithConfiguredTts, speakWithBrowserTts.
 * Dependencies: createId from src/lib/utils.
 * Maintenance note: keep provider-specific request shapes here instead of spreading them through App.tsx.
 */
import { createId } from './lib/utils';

export type TtsProvider = 'browser' | 'local' | 'openai' | 'gemini' | 'minimax' | 'doubao';

export interface TtsConfig {
  provider: TtsProvider;
  baseUrl: string;
  apiKey: string;
  appId?: string;
  model: string;
  voiceId: string;
}

export const defaultTtsConfig: TtsConfig = {
  provider: 'browser',
  baseUrl: '',
  apiKey: '',
  appId: '',
  model: 'gpt-4o-mini-tts',
  voiceId: 'alloy',
};

export type TtsResponseType = 'auto' | 'audio' | 'gemini-json' | 'minimax-json' | 'doubao-json' | 'doubao-stream-json';

export interface BuiltTtsRequest {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
  responseType: TtsResponseType;
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
  return Boolean(config.appId?.trim()) || model === 'volcano_tts' || /\/api\/v1\/tts$/i.test(base);
}

function createRequestId() {
  return createId('tts');
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
    if (!shouldUseLegacyDoubaoTts(config)) {
      const resourceId = config.model.trim() || 'seed-tts-2.0';
      return {
        url: normalizeDoubaoArkTtsUrl(config.baseUrl),
        responseType: 'doubao-stream-json',
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Api-Key': token } : {}),
            'X-Api-Resource-Id': resourceId,
            'X-Api-Request-Id': createRequestId(),
          },
          body: JSON.stringify({
            user: {
              uid: 'xiaophone-user',
            },
            req_params: {
              text: input,
              speaker: config.voiceId.trim(),
              audio_params: {
                format: 'mp3',
                sample_rate: 24000,
              },
            },
          }),
        },
      };
    }
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

function playAudioBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  return audio.play();
}

function playAudioUrl(url: string) {
  const audio = new Audio(url);
  return audio.play();
}

async function playJsonAudio(data: unknown) {
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
  if (url) return playAudioUrl(url);
  const inline = value.candidates?.[0]?.content?.parts?.find((part) => part.inlineData || part.inline_data);
  const inlineData = (inline?.inlineData || inline?.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
  const base64 = inlineData?.data || value.audio || value.data;
  if (!base64) throw new Error('TTS 没有返回可播放音频。');
  const mimeType = inlineData?.mimeType || inlineData?.mime_type || value.mimeType || value.mime_type || 'audio/wav';
  return playAudioBlob(base64ToBlob(base64, mimeType));
}

async function playMiniMaxJsonAudio(data: unknown) {
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
  return playAudioBlob(hexToBlob(audioHex, 'audio/mpeg'));
}

async function playDoubaoJsonAudio(data: unknown) {
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
  return playAudioBlob(base64ToBlob(value.data, 'audio/mpeg'));
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

async function playDoubaoStreamJsonAudio(text: string) {
  const chunks = extractDoubaoStreamAudioChunks(text);
  if (!chunks.length) {
    throw new Error('豆包 TTS 没有返回可播放音频。');
  }
  return playAudioBlob(base64ChunksToBlob(chunks, 'audio/mpeg'));
}

export async function speakWithConfiguredTts(text: string, config: TtsConfig) {
  if (config.provider === 'browser') {
    speakWithBrowserTts(text);
    return;
  }
  const request = buildExternalTtsRequest(config, text);
  if (!request) return;
  if (!request.url) throw new Error('先填写 TTS 接口地址。');
  const response = await fetch(request.url, request.init);
  if (!response.ok) throw new Error(`TTS 失败：${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (request.responseType === 'audio' || contentType.startsWith('audio/')) {
    await playAudioBlob(await response.blob());
    return;
  }
  if (request.responseType === 'minimax-json') {
    await playMiniMaxJsonAudio(await response.json());
    return;
  }
  if (request.responseType === 'doubao-json') {
    await playDoubaoJsonAudio(await response.json());
    return;
  }
  if (request.responseType === 'doubao-stream-json') {
    await playDoubaoStreamJsonAudio(await response.text());
    return;
  }
  await playJsonAudio(await response.json());
}
