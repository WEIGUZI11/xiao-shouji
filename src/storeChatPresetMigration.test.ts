import assert from 'node:assert/strict';

import { smallPhonePresetEntries } from './apps/wechat/presets/smallPhonePreset';
import { migratePersistedAppState } from './store';

const localImportedCharacter = {
  id: 'local-imported-character',
  name: '本地角色卡',
  avatar: 'data:image/png;base64,avatar',
  description: '本地导入的人设不能删除',
  personality: '保留',
  firstMessage: '你好',
  systemPrompt: '',
};

const migratedCombinedRpPreset = migratePersistedAppState({
  characters: [localImportedCharacter],
  chatPresetName: '小手机专用 · 短长 RP',
  chatReplyStyle: 'single',
  chatPresetEntries: [
    ...smallPhonePresetEntries.map((entry) => entry.id === 'small-phone-head'
      ? { ...entry, content: '玩家保存的自定义头部' }
      : { ...entry, enabled: true }),
    { id: 'small-phone-auto-rp', name: '聊天模式 · 自动判断', role: 'system' as const, content: '旧自动规则', enabled: true },
  ],
}, 72);

assert.equal(migratedCombinedRpPreset.chatPresetName, '小手机 · 长 RP');
assert.equal(migratedCombinedRpPreset.chatReplyStyle, 'single');
assert.equal(migratedCombinedRpPreset.chatPresetEntries.find((entry) => entry.id === 'small-phone-short-rp')?.enabled, false);
assert.equal(migratedCombinedRpPreset.chatPresetEntries.find((entry) => entry.id === 'small-phone-long-rp')?.enabled, true);
assert.equal(migratedCombinedRpPreset.chatPresetEntries.some((entry) => entry.id === 'small-phone-auto-rp'), false);
assert.equal(migratedCombinedRpPreset.chatPresetEntries.find((entry) => entry.id === 'small-phone-head')?.content, '玩家保存的自定义头部');
assert.equal(migratedCombinedRpPreset.appPresets.wechat.prompt, migratedCombinedRpPreset.chatPresetPrompt);
assert.equal(migratedCombinedRpPreset.appPresets.qq.prompt, migratedCombinedRpPreset.chatPresetPrompt);
assert.deepEqual(migratedCombinedRpPreset.characters, [localImportedCharacter]);

const migratedRemovedBuiltIn = migratePersistedAppState({
  chatPresetName: 'AI助手',
  chatPresetPrompt: '旧 AI 助手规则',
  chatReplyStyle: 'auto',
}, 72);
assert.equal(migratedRemovedBuiltIn.chatPresetName, '小手机 · 短 RP');
assert.equal(migratedRemovedBuiltIn.chatReplyStyle, 'burst');
assert.equal(migratedRemovedBuiltIn.chatPresetEntries.length, smallPhonePresetEntries.length);

const migratedCustomPreset = migratePersistedAppState({
  chatPresetName: '我的导入预设',
  chatPresetPrompt: '保留自定义文本',
  chatReplyStyle: 'auto',
}, 72);
assert.equal(migratedCustomPreset.chatPresetName, '我的导入预设');
assert.equal(migratedCustomPreset.chatPresetPrompt, '保留自定义文本');
assert.deepEqual(migratedCustomPreset.chatPresetEntries, []);

console.log('chat preset migration ok');
