import assert from 'node:assert/strict';

import { normalizeImageProviderConfigs, normalizeTtsProviderConfigs } from './store';

const activeTts = {
  provider: 'doubao' as const,
  baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional',
  apiKey: 'doubao-only-key',
  model: 'seed-tts-2.0',
  voiceId: 'custom-doubao-voice',
};
const ttsProfiles = normalizeTtsProviderConfigs({
  minimax: { provider: 'minimax', apiKey: 'minimax-only-key', model: 'speech-2.8-hd', voiceId: 'female-shaonv' },
}, activeTts);

assert.equal(ttsProfiles.doubao?.apiKey, 'doubao-only-key');
assert.equal(ttsProfiles.minimax?.apiKey, 'minimax-only-key');
assert.notEqual(ttsProfiles.doubao?.apiKey, ttsProfiles.minimax?.apiKey);

const activeImage = {
  provider: 'custom' as const,
  baseUrl: 'https://ln.example.test/v1/images/generations',
  apiKey: 'ln-image-only-key',
  model: 'public-image-model',
  width: 512,
  height: 512,
  steps: 8,
  scale: 5,
  sampler: 'k_euler',
  noiseSchedule: 'native',
  negativePrompt: '',
  promptPreset: '',
  promptExtra: '',
};
const imageProfiles = normalizeImageProviderConfigs(undefined, activeImage);

assert.equal(imageProfiles.customProfiles[0].config.apiKey, 'ln-image-only-key');
assert.notEqual(imageProfiles.customProfiles[0].config.apiKey, ttsProfiles.doubao?.apiKey);
assert.notEqual(imageProfiles.customProfiles[0].config.apiKey, ttsProfiles.minimax?.apiKey);

console.log('provider-specific TTS and image profiles stay isolated');
