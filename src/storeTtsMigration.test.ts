import assert from 'node:assert/strict';

import { normalizeMigratedTtsConfig } from './store';

assert.equal(
  normalizeMigratedTtsConfig({
    provider: 'doubao',
    model: 'seed-tts-2.0',
    voiceId: 'zh_female_cancan_uranus_bigtts',
  }).voiceId,
  '',
);

assert.equal(
  normalizeMigratedTtsConfig({
    provider: 'doubao',
    model: 'seed-tts-2.0',
    voiceId: 'zh_male_custom_voice',
  }).voiceId,
  'zh_male_custom_voice',
);

assert.equal(
  normalizeMigratedTtsConfig({
    provider: 'openai',
    model: 'gpt-4o-mini-tts',
    voiceId: 'alloy',
  }).voiceId,
  'alloy',
);

console.log('store tts migration ok');
