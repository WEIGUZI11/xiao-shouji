import assert from 'node:assert/strict';

import { migratePersistedAppState, normalizeMigratedTtsConfig } from './store';

assert.equal(
  normalizeMigratedTtsConfig({
    provider: 'doubao',
    model: 'seed-tts-2.0',
    voiceId: 'zh_female_cancan_uranus_bigtts',
  }).voiceId,
  'zh_female_vv_uranus_bigtts',
);

assert.equal(normalizeMigratedTtsConfig({ provider: 'doubao', model: 'seed-tts-2.0', voiceId: '' }).voiceId, 'zh_female_vv_uranus_bigtts');
assert.equal(normalizeMigratedTtsConfig({ provider: 'doubao', model: 'seed-icl-2.0', voiceId: '' }).voiceId, '');
assert.equal(normalizeMigratedTtsConfig({ provider: 'browser', model: '', voiceId: 'default' }).model, '');

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

const migratedV67 = migratePersistedAppState({
  layoutPositions: { settings: { page: 1, x: 12, y: 34 } },
  ttsConfig: { provider: 'minimax', baseUrl: 'https://tts.example/v1/t2a_v2', apiKey: 'tts-key', model: 'speech-2.8-hd', voiceId: 'voice-a' },
  ttsProviderConfigs: {
    doubao: { provider: 'doubao', baseUrl: 'https://doubao.example/v3/tts', apiKey: 'doubao-key', model: 'seed-tts-2.0', voiceId: 'voice-b' },
  },
  imageGenerationConfig: { provider: 'custom', baseUrl: 'https://image.example/v1/images/generations', apiKey: 'image-key', model: 'image-model' },
  imageProviderConfigs: {
    customProfiles: [{ id: 'ln', name: 'LN 公益站', config: { provider: 'custom', baseUrl: 'https://ln.example/v1/images/generations', apiKey: 'ln-key', model: 'ln-model' } }],
    activeCustomProfileId: 'ln',
  },
  imageGenerationTasks: [{
    id: 'task-running',
    source: 'settings-test',
    status: 'running',
    provider: 'custom',
    model: 'ln-model',
    promptText: 'test',
    promptHash: 'hash',
    createdAt: 1,
    startedAt: 2,
  }],
}, 67);

assert.deepEqual(migratedV67.layoutPositions.settings, { page: 1, x: 12, y: 34 });
assert.equal(migratedV67.ttsProviderConfigs.doubao?.apiKey, 'doubao-key');
assert.equal(migratedV67.ttsProviderConfigs.minimax?.apiKey, 'tts-key');
assert.equal(migratedV67.imageProviderConfigs.customProfiles[0].name, 'LN 公益站');
assert.equal(migratedV67.imageProviderConfigs.customProfiles[0].config.apiKey, 'ln-key');
assert.equal(migratedV67.imageGenerationConfig.apiKey, 'ln-key');
assert.equal(migratedV67.imageGenerationTasks[0].status, 'interrupted');

const migratedV66 = migratePersistedAppState({ layoutPositions: { settings: { page: 1, x: 12, y: 34 } } }, 66);
assert.deepEqual(migratedV66.layoutPositions, {});

const migratedV68 = migratePersistedAppState({
  aiContextExcludedSectionsByCharacter: {
    'char-a': ['qq-groups', 'qq-groups', '', 123],
  },
}, 68);
assert.deepEqual(migratedV68.aiContextExcludedSectionsByCharacter, { 'char-a': ['qq-groups'] });

const migratedWithoutExclusions = migratePersistedAppState({}, 68);
assert.deepEqual(migratedWithoutExclusions.aiContextExcludedSectionsByCharacter, {});
assert.equal(migratedWithoutExclusions.bubbleStyle, 'theme');

const migratedBubbleStyle = migratePersistedAppState({ bubbleStyle: 'glass' }, 69);
assert.equal(migratedBubbleStyle.bubbleStyle, 'holographic-jelly');

const migratedInvalidBubbleStyle = migratePersistedAppState({ bubbleStyle: 'old-neon' }, 69);
assert.equal(migratedInvalidBubbleStyle.bubbleStyle, 'theme');

const migratedLegacyChatLength = migratePersistedAppState({ chatMaxTokens: 520 }, 70);
assert.equal(migratedLegacyChatLength.chatMaxTokens, 1200);

const migratedCustomChatLength = migratePersistedAppState({ chatMaxTokens: 900 }, 70);
assert.equal(migratedCustomChatLength.chatMaxTokens, 900);

const currentChatLength = migratePersistedAppState({ chatMaxTokens: 520 }, 71);
assert.equal(currentChatLength.chatMaxTokens, 520);

const migratedStructuredPreset = migratePersistedAppState({
  chatPresetName: 'Monster Hone',
  chatPresetPrompt: '旧的扁平文本',
  chatPresetEntries: [
    { id: 'entry-a', name: '开启规则', role: 'system', content: '规则正文', enabled: true },
    { id: 'entry-b', name: '关闭规则', role: 'user', content: '不能发送', enabled: false },
  ],
}, 71);
assert.equal(migratedStructuredPreset.chatPresetEntries.length, 2);
assert.equal(migratedStructuredPreset.chatPresetPrompt, '规则正文');
assert.doesNotMatch(migratedStructuredPreset.chatPresetPrompt, /不能发送/);

const migratedWithoutStructuredPreset = migratePersistedAppState({ chatPresetName: '旧版自定义', chatPresetPrompt: '保留旧文本' }, 71);
assert.deepEqual(migratedWithoutStructuredPreset.chatPresetEntries, []);
assert.equal(migratedWithoutStructuredPreset.chatPresetPrompt, '保留旧文本');

const localImportedCharacter = {
  id: 'local-imported-character',
  name: '本地角色卡',
  avatar: 'data:image/png;base64,avatar',
  description: '本地导入的人设不能删除',
  personality: '保留',
  firstMessage: '你好',
  systemPrompt: '',
};
const migratedWithLocalCharacter = migratePersistedAppState({ characters: [localImportedCharacter] }, 71);
assert.deepEqual(migratedWithLocalCharacter.characters, [localImportedCharacter]);

console.log('store tts migration ok');
