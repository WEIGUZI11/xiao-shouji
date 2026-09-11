import assert from 'node:assert/strict';

import { defaultImageGenerationConfig } from '../../lib/naiImage';
import { defaultTtsConfig } from '../../tts';
import {
  buildSettingsSelfCheckReport,
  summarizeSettingsSelfCheck,
  type SettingsSelfCheckInput,
} from './settingsSelfCheck';

const baseInput: SettingsSelfCheckInput = {
  apiBaseUrl: '',
  availableModels: [],
  selectedModel: '',
  ttsEnabled: false,
  ttsConfig: defaultTtsConfig,
  imageGenerationEnabled: true,
  imageGenerationConfig: defaultImageGenerationConfig,
};

const emptyReport = buildSettingsSelfCheckReport(baseInput);
assert.equal(emptyReport.find((item) => item.id === 'model')?.status, 'error');
assert.equal(emptyReport.find((item) => item.id === 'tts')?.status, 'warn');
assert.equal(emptyReport.find((item) => item.id === 'image')?.status, 'ok');
assert.equal(emptyReport.length, 3);

const readyReport = buildSettingsSelfCheckReport({
  ...baseInput,
  apiBaseUrl: 'https://api.example.com/v1',
  availableModels: ['model-a'],
  selectedModel: 'model-a',
  ttsEnabled: true,
  ttsConfig: { ...defaultTtsConfig, provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini-tts', voiceId: 'alloy' },
  imageGenerationConfig: { ...defaultImageGenerationConfig, baseUrl: 'https://image.example.com/generate', apiKey: 'nai-key' },
});

assert.deepEqual(
  readyReport.map((item) => item.status),
  ['ok', 'ok', 'ok'],
);
assert.equal(summarizeSettingsSelfCheck(readyReport).status, 'ok');

const brokenImageReport = buildSettingsSelfCheckReport({
  ...baseInput,
  imageGenerationConfig: { ...defaultImageGenerationConfig, baseUrl: '', apiKey: '' },
});
assert.equal(brokenImageReport.find((item) => item.id === 'image')?.status, 'error');
assert.equal(summarizeSettingsSelfCheck(brokenImageReport).status, 'error');

console.log('settings self check ok');
