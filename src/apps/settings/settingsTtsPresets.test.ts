import assert from 'node:assert/strict';

import {
  builtInModelPresets,
  builtInVoicePresets,
  canPullTtsModelsFromProvider,
  getTtsModelListBaseUrl,
  getProviderModelPresets,
  getProviderDefaultTtsConfig,
  getVoiceIdForModelPreset,
  getVoicePresetsForProvider,
  shouldShowTtsVoiceControls,
  shouldUseTtsModelPresets,
  getVoicePlaceholder,
} from './settingsTtsPresets';

const doubaoDefaults = getProviderDefaultTtsConfig('doubao');
assert.equal(doubaoDefaults.voiceId, 'zh_female_vv_uranus_bigtts');
assert.equal(doubaoDefaults.model, 'seed-tts-2.0');
assert.equal(getVoicePlaceholder('doubao').includes('cancan'), false);
assert.equal(getVoicePlaceholder('doubao').includes('zh_female'), false);

const openAiDefaults = getProviderDefaultTtsConfig('openai');
assert.equal(openAiDefaults.voiceId, 'alloy');
assert.equal(getVoicePlaceholder('openai'), 'alloy');

assert.equal(shouldShowTtsVoiceControls(), true, 'TTS settings should expose voice controls so MiniMax/Doubao voice IDs can be changed');
assert(builtInModelPresets.some((preset) => preset.provider === 'minimax' && preset.model === 'speech-2.8-hd'));
assert(builtInModelPresets.some((preset) => preset.provider === 'doubao' && preset.model === 'seed-tts-2.0'));
assert(builtInModelPresets.some((preset) => preset.provider === 'doubao' && preset.model === 'seed-tts-1.0'));
assert(builtInModelPresets.some((preset) => preset.provider === 'doubao' && preset.model === 'seed-icl-2.0'));
assert(builtInVoicePresets.some((preset) => preset.provider === 'minimax' && preset.voiceId === 'female-shaonv'));
assert(builtInVoicePresets.some((preset) => preset.provider === 'doubao' && preset.voiceId === 'zh_female_cancan_uranus_bigtts'));
assert(builtInVoicePresets.some((preset) => preset.provider === 'doubao' && preset.voiceId === 'zh_female_vv_uranus_bigtts'));
assert(builtInVoicePresets.some((preset) => preset.provider === 'doubao' && preset.voiceId === 'zh_male_beijingxiaoye_emo_v2_mars_bigtts'));
assert.deepEqual(getProviderModelPresets('minimax').map((preset) => preset.model), ['speech-2.8-hd', 'speech-2.8-turbo', 'speech-2.6-hd', 'speech-2.6-turbo']);
assert.deepEqual(getProviderModelPresets('doubao').map((preset) => preset.model), ['seed-tts-2.0', 'seed-tts-1.0', 'seed-icl-2.0']);
assert(getVoicePresetsForProvider('doubao', [], 'seed-tts-2.0').every((preset) => preset.provider === 'doubao' && preset.model === 'seed-tts-2.0'));
assert.equal(getVoicePresetsForProvider('doubao', [], 'seed-tts-2.0').some((preset) => preset.provider === 'openai'), false);
const doubaoTts1Preset = getProviderModelPresets('doubao').find((preset) => preset.model === 'seed-tts-1.0')!;
const doubaoTts2Preset = getProviderModelPresets('doubao').find((preset) => preset.model === 'seed-tts-2.0')!;
const doubaoIcl2Preset = getProviderModelPresets('doubao').find((preset) => preset.model === 'seed-icl-2.0')!;
assert.equal(getVoiceIdForModelPreset('zh_female_vv_uranus_bigtts', doubaoTts1Preset), 'zh_female_wanwanxiaohe_moon_bigtts');
assert.equal(getVoiceIdForModelPreset('', doubaoTts2Preset), 'zh_female_vv_uranus_bigtts');
assert.equal(getVoiceIdForModelPreset('zh_female_vv_uranus_bigtts', doubaoIcl2Preset), '');
assert.equal(getVoiceIdForModelPreset('S_MY_CLONE', doubaoIcl2Preset), 'S_MY_CLONE');
assert.equal(canPullTtsModelsFromProvider('browser'), false);
assert.equal(canPullTtsModelsFromProvider('openai'), true);
assert.equal(canPullTtsModelsFromProvider('local'), true);
assert.equal(canPullTtsModelsFromProvider('gemini'), true);
assert.equal(canPullTtsModelsFromProvider('minimax'), true);
assert.equal(canPullTtsModelsFromProvider('doubao'), false);
assert.equal(shouldUseTtsModelPresets('minimax'), false);
assert.equal(shouldUseTtsModelPresets('doubao'), false);
assert.equal(shouldUseTtsModelPresets('gemini'), false);
assert.equal(getTtsModelListBaseUrl('openai', ''), 'https://api.openai.com/v1');
assert.equal(getTtsModelListBaseUrl('openai', 'https://public.example/v1/audio/speech'), 'https://public.example/v1');
assert.equal(getTtsModelListBaseUrl('openai', 'https://public.example/v1/chat/completions'), 'https://public.example/v1');
assert.equal(getTtsModelListBaseUrl('minimax', 'https://api.minimax.io/v1/t2a_v2'), 'https://api.minimax.io/v1');
assert.equal(getTtsModelListBaseUrl('doubao', 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'), 'https://openspeech.bytedance.com/api/v3');
assert.equal(getTtsModelListBaseUrl('doubao', 'https://openspeech.bytedance.com/api/v1/tts'), 'https://openspeech.bytedance.com/api/v1');
console.log('settings tts presets ok');
