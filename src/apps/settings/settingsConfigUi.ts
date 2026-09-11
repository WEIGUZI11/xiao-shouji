/**
 * UI-only provider labels, placeholders, local voice-preset loading, and model-list fetching.
 * Keeps SettingsScreen focused on state and interaction instead of provider formatting details.
 */
import { buildHttpErrorMessage, readHttpErrorDetail } from '../../lib/httpErrors';
import type { ImageGenerationConfig } from '../../lib/naiImage';
import type { TtsProvider } from '../../tts';
import { getModelListEndpoint } from '../shared/aiText';
import { normalizeCustomVoicePresets, voicePresetStorageKey } from './settingsTtsPresets';

export type SettingsTab = 'model' | 'tts' | 'image' | 'feedback' | 'self-check';

export const imageProviderLabels: Record<ImageGenerationConfig['provider'], string> = {
  novelai: 'NovelAI',
  comfyui: 'ComfyUI',
  custom: '自定义',
};

export function getImageProviderLabel(provider: ImageGenerationConfig['provider'] | string | undefined) {
  if (provider === 'comfyui') return imageProviderLabels.comfyui;
  if (provider === 'custom') return imageProviderLabels.custom;
  return imageProviderLabels.novelai;
}

export function getProviderPlaceholder(provider: TtsProvider) {
  if (provider === 'local') return '例如：http://127.0.0.1:9880/tts';
  if (provider === 'gemini') return '默认：Google Gemini v1beta，可留空';
  if (provider === 'minimax') return '默认：https://api.minimax.io/v1/t2a_v2，可留空';
  if (provider === 'doubao') return '默认：https://openspeech.bytedance.com/api/v3/tts/unidirectional，可留空';
  return '默认：https://api.openai.com/v1，可留空';
}

export function getModelPlaceholder(provider: TtsProvider) {
  if (provider === 'gemini') return 'gemini-2.5-flash-preview-tts';
  if (provider === 'minimax') return 'speech-2.8-hd';
  if (provider === 'doubao') return 'seed-tts-2.0';
  return 'gpt-4o-mini-tts';
}

export function getImageProviderPlaceholder(config: ImageGenerationConfig) {
  if (config.provider === 'comfyui') return 'http://127.0.0.1:8188';
  if (config.provider === 'custom' && config.customFormat === 'mj-task') return 'https://your-mj-relay.example/mj/submit/imagine';
  if (config.provider === 'custom' && config.customFormat === 'nai') return 'https://your-nai-relay.example/generate-image';
  if (config.provider === 'custom' && config.customFormat === 'openai-images') return 'https://your-image-api.example/v1/images/generations';
  if (config.provider === 'custom') return 'https://your-image-relay.example/mj/submit/imagine';
  return '/api/nai/generate-image';
}

export function readVoicePresets() {
  try {
    return normalizeCustomVoicePresets(JSON.parse(window.localStorage.getItem(voicePresetStorageKey) || '[]'));
  } catch {
    return [];
  }
}

export async function fetchModelList(baseUrl: string, apiKey: string) {
  const endpoint = getModelListEndpoint(baseUrl);
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage('拉取模型失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    }));
  }
  const data = await response.json();
  return Array.isArray(data?.data)
    ? data.data.map((item: { id?: string }) => item.id).filter(Boolean) as string[]
    : [];
}
