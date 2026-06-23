import assert from 'node:assert/strict';

import {
  getProviderDefaultTtsConfig,
  shouldShowTtsVoiceControls,
  getVoicePlaceholder,
} from './settingsTtsPresets';

const doubaoDefaults = getProviderDefaultTtsConfig('doubao');
assert.equal(doubaoDefaults.voiceId, '', 'Doubao provider should not auto-select one persona voice');
assert.equal(doubaoDefaults.model, 'seed-tts-2.0');
assert.equal(getVoicePlaceholder('doubao').includes('cancan'), false);
assert.equal(getVoicePlaceholder('doubao').includes('zh_female'), false);

const openAiDefaults = getProviderDefaultTtsConfig('openai');
assert.equal(openAiDefaults.voiceId, 'alloy');
assert.equal(getVoicePlaceholder('openai'), 'alloy');

assert.equal(shouldShowTtsVoiceControls(), false, 'TTS settings should default to model selection without voice controls');

console.log('settings tts presets ok');
