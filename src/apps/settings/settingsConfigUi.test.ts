import assert from 'node:assert/strict';

import {
  getImageProviderLabel,
  getImageProviderPlaceholder,
  getModelPlaceholder,
  getProviderPlaceholder,
} from './settingsConfigUi';

assert.equal(getImageProviderLabel('novelai'), 'NovelAI');
assert.equal(getImageProviderLabel('custom'), '自定义');
assert.match(getProviderPlaceholder('minimax'), /t2a_v2/);
assert.equal(getModelPlaceholder('doubao'), 'seed-tts-2.0');
assert.match(getImageProviderPlaceholder({ provider: 'custom', customFormat: 'openai-images' } as never), /images\/generations/);

console.log('settings config UI helpers ok');
