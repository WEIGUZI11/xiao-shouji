import type { TtsProvider } from '../../tts';

export type VoicePreset = {
  id: string;
  label: string;
  provider: TtsProvider;
  voiceId: string;
  model?: string;
};

export type ModelPreset = {
  id: string;
  label: string;
  provider: TtsProvider;
  model: string;
  baseUrl?: string;
};

export const voicePresetStorageKey = 'xiaophone.tts.voicePresets';
export const defaultDoubaoVoiceId = 'zh_female_vv_uranus_bigtts';

export const builtInModelPresets: ModelPreset[] = [
  { id: 'openai-gpt-4o-mini-tts', label: 'OpenAI gpt-4o-mini-tts', provider: 'openai', model: 'gpt-4o-mini-tts' },
  { id: 'openai-gpt-4o-mini-tts-2025-03-20', label: 'OpenAI 2025-03-20', provider: 'openai', model: 'gpt-4o-mini-tts-2025-03-20' },
  { id: 'gemini-2-5-flash-preview-tts', label: 'Gemini 2.5 Flash Preview', provider: 'gemini', model: 'gemini-2.5-flash-preview-tts' },
  { id: 'minimax-speech-28-hd', label: 'MiniMax speech-2.8-hd', provider: 'minimax', model: 'speech-2.8-hd', baseUrl: 'https://api.minimax.io/v1/t2a_v2' },
  { id: 'minimax-speech-28-turbo', label: 'MiniMax speech-2.8-turbo', provider: 'minimax', model: 'speech-2.8-turbo', baseUrl: 'https://api.minimax.io/v1/t2a_v2' },
  { id: 'minimax-speech-26-hd', label: 'MiniMax speech-2.6-hd', provider: 'minimax', model: 'speech-2.6-hd', baseUrl: 'https://api.minimax.io/v1/t2a_v2' },
  { id: 'minimax-speech-26-turbo', label: 'MiniMax speech-2.6-turbo', provider: 'minimax', model: 'speech-2.6-turbo', baseUrl: 'https://api.minimax.io/v1/t2a_v2' },
  { id: 'doubao-seed-tts-20', label: 'TTS 2.0 公版服务', provider: 'doubao', model: 'seed-tts-2.0', baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional' },
  { id: 'doubao-seed-tts-10', label: 'TTS 1.0 公版服务', provider: 'doubao', model: 'seed-tts-1.0', baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional' },
  { id: 'doubao-seed-icl-20', label: 'ICL 2.0 复刻服务', provider: 'doubao', model: 'seed-icl-2.0', baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional' },
];

export const builtInVoicePresets: VoicePreset[] = [
  { id: 'openai-alloy', label: 'OpenAI Alloy', provider: 'openai', voiceId: 'alloy', model: 'gpt-4o-mini-tts' },
  { id: 'openai-verse', label: 'OpenAI Verse', provider: 'openai', voiceId: 'verse', model: 'gpt-4o-mini-tts' },
  { id: 'gemini-kore', label: 'Gemini Kore', provider: 'gemini', voiceId: 'Kore', model: 'gemini-2.5-flash-preview-tts' },
  { id: 'gemini-puck', label: 'Gemini Puck', provider: 'gemini', voiceId: 'Puck', model: 'gemini-2.5-flash-preview-tts' },
  { id: 'minimax-girl', label: 'MiniMax girl', provider: 'minimax', voiceId: 'female-shaonv', model: 'speech-2.8-hd' },
  { id: 'minimax-clear', label: 'MiniMax clear male', provider: 'minimax', voiceId: 'male-qn-qingse', model: 'speech-2.8-hd' },
  { id: 'doubao-cancan-example', label: '豆包 灿灿 2.0', provider: 'doubao', voiceId: 'zh_female_cancan_uranus_bigtts', model: 'seed-tts-2.0' },
  { id: 'doubao-vivi', label: '豆包 Vivi 2.0', provider: 'doubao', voiceId: 'zh_female_vv_uranus_bigtts', model: 'seed-tts-2.0' },
  { id: 'doubao-wanwan', label: '豆包 湾湾小何 1.0', provider: 'doubao', voiceId: 'zh_female_wanwanxiaohe_moon_bigtts', model: 'seed-tts-1.0' },
  { id: 'doubao-xiaoye', label: '豆包 北京小爷 1.0', provider: 'doubao', voiceId: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', model: 'seed-tts-1.0' },
  { id: 'doubao-shuangkuaisisi', label: '豆包 双快思思 1.0', provider: 'doubao', voiceId: 'zh_female_shuangkuaisisi_emo_v2_mars_bigtts', model: 'seed-tts-1.0' },
];

export const providerDefaults: Record<TtsProvider, Partial<VoicePreset> & { baseUrl?: string }> = {
  browser: { voiceId: 'default' },
  local: { baseUrl: 'http://127.0.0.1:9880/tts', voiceId: 'default' },
  openai: { baseUrl: '', model: 'gpt-4o-mini-tts', voiceId: 'alloy' },
  gemini: { baseUrl: '', model: 'gemini-2.5-flash-preview-tts', voiceId: 'Kore' },
  minimax: { baseUrl: 'https://api.minimax.io/v1/t2a_v2', model: 'speech-2.8-hd', voiceId: 'female-shaonv' },
  doubao: { baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional', model: 'seed-tts-2.0', voiceId: defaultDoubaoVoiceId },
};

const defaultProviderBaseUrls = new Set(
  Object.values(providerDefaults)
    .map((item) => item.baseUrl)
    .filter((item): item is string => typeof item === 'string' && item.length > 0),
);

const officialProviderHosts: Partial<Record<TtsProvider, string[]>> = {
  openai: ['api.openai.com'],
  gemini: ['generativelanguage.googleapis.com'],
  minimax: ['api.minimax.io', 'api.minimaxi.com'],
  doubao: ['openspeech.bytedance.com', 'voice.ap-southeast-1.bytepluses.com'],
};

export function getProviderDefaultTtsConfig(provider: TtsProvider) {
  const defaults = providerDefaults[provider];
  return {
    provider,
    baseUrl: defaults.baseUrl || '',
    model: defaults.model || '',
    voiceId: defaults.voiceId || '',
  };
}

export function getVoicePlaceholder(provider: TtsProvider) {
  if (provider === 'gemini') return 'Kore';
  if (provider === 'openai') return 'alloy';
  if (provider === 'minimax') return 'female-shaonv';
  if (provider === 'doubao') return '填写豆包音色 ID，或点下方某个豆包示例预设';
  return 'default';
}

export function shouldShowTtsVoiceControls() {
  return true;
}

export function getProviderModelPresets(provider: TtsProvider) {
  return builtInModelPresets.filter((preset) => preset.provider === provider);
}

export function getVoicePresetsForProvider(provider: TtsProvider, customPresets: VoicePreset[], model = '') {
  return [...builtInVoicePresets, ...customPresets].filter((preset) => {
    if (preset.provider !== provider) return false;
    if (provider !== 'doubao' || !model || model === 'volcano_tts') return true;
    return !preset.model || preset.model === model;
  });
}

export function getVoiceIdForModelPreset(currentVoiceId: string, preset: ModelPreset) {
  if (preset.provider !== 'doubao') return currentVoiceId;
  const currentBuiltIn = builtInVoicePresets.find(
    (voice) => voice.provider === 'doubao' && voice.voiceId === currentVoiceId,
  );
  if (preset.model === 'seed-icl-2.0') {
    return currentBuiltIn ? '' : currentVoiceId;
  }
  if (currentBuiltIn?.model === preset.model) return currentVoiceId;
  if (preset.model === 'seed-tts-2.0') return defaultDoubaoVoiceId;
  return builtInVoicePresets.find(
    (voice) => voice.provider === 'doubao' && voice.model === preset.model,
  )?.voiceId || '';
}

export function canPullTtsModelsFromProvider(provider: TtsProvider) {
  return provider !== 'browser' && provider !== 'doubao';
}

export function shouldUseTtsModelPresets(_provider: TtsProvider) {
  return false;
}

export function getTtsModelListBaseUrl(provider: TtsProvider, baseUrl: string) {
  const configured = baseUrl.trim() || (provider === 'openai' ? 'https://api.openai.com/v1' : providerDefaults[provider].baseUrl || '');
  if (!configured) return '';
  return configured
    .replace(/\/+$/, '')
    .replace(/\/models$/i, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/audio\/speech$/i, '')
    .replace(/\/t2a_v2$/i, '')
    .replace(/\/tts\/unidirectional$/i, '')
    .replace(/\/api\/v1\/tts$/i, '/api/v1');
}

export function canCarryBaseUrl(provider: TtsProvider, baseUrl: string) {
  const value = baseUrl.trim();
  if (!value) return false;
  if (defaultProviderBaseUrls.has(value)) return false;
  try {
    const host = new URL(value).host;
    return !(officialProviderHosts[provider] || []).some((officialHost) => host === officialHost || host.endsWith(`.${officialHost}`));
  } catch {
    return false;
  }
}

export function normalizeCustomVoicePresets(value: unknown): VoicePreset[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is VoicePreset => {
    const candidate = item as Partial<VoicePreset>;
    return Boolean(candidate.id && candidate.label && candidate.provider && candidate.voiceId);
  });
}
