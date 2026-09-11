import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
  configurable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: globalThis.localStorage },
  configurable: true,
});

const { migratePersistedAppState, useAppStore } = await import('./store');
const characterIdsBeforePresetChange = useAppStore.getState().characters.map((character) => character.id);

useAppStore.getState().setChatPresetEntries([
  { id: 'entry-system', name: '系统规则', role: 'system', content: '保持人设', enabled: true },
  { id: 'entry-user', name: '用户补充', role: 'user', content: '短句回复', enabled: false },
], 'Monster Hone');

assert.equal(useAppStore.getState().chatPresetName, 'Monster Hone');
assert.equal(useAppStore.getState().chatPresetEntries.length, 2);
assert.match(useAppStore.getState().chatPresetPrompt, /保持人设/);
assert.doesNotMatch(useAppStore.getState().chatPresetPrompt, /短句回复/);
assert.equal(useAppStore.getState().appPresets.wechat.name, 'Monster Hone');
assert.equal(useAppStore.getState().appPresets.qq.name, 'Monster Hone');
assert.equal(useAppStore.getState().appPresets.qq.prompt, useAppStore.getState().chatPresetPrompt);
assert.deepEqual(useAppStore.getState().characters.map((character) => character.id), characterIdsBeforePresetChange, 'changing prompt entries must not delete character cards');

useAppStore.getState().resetAppPreset('wechat');
assert.equal(useAppStore.getState().chatPresetName, '小手机 · 短 RP');
assert.equal(useAppStore.getState().chatPresetEntries.length, 14);
assert.equal(useAppStore.getState().chatPresetEntries.find((entry) => entry.id === 'small-phone-short-rp')?.enabled, true);
assert.equal(useAppStore.getState().chatPresetEntries.find((entry) => entry.id === 'small-phone-long-rp')?.enabled, false);
assert.equal(useAppStore.getState().chatPromptRoleMode, 'default');
assert.equal(useAppStore.getState().chatContextDepth, 120);
assert.equal(useAppStore.getState().chatMaxTokens, 900);

const migratedBuiltInDefaults = migratePersistedAppState({
  chatPresetName: '小手机 · 短 RP',
  chatPresetEntries: useAppStore.getState().chatPresetEntries,
  chatReplyStyle: 'burst',
  chatContextDepth: 600,
  chatTemperature: 0.82,
  chatMaxTokens: 1800,
}, 77);
assert.equal(migratedBuiltInDefaults.chatContextDepth, 120);
assert.equal(migratedBuiltInDefaults.chatMaxTokens, 900);

const migratedCustomValues = migratePersistedAppState({
  chatPresetName: '小手机 · 短 RP',
  chatPresetEntries: useAppStore.getState().chatPresetEntries,
  chatReplyStyle: 'burst',
  chatContextDepth: 20,
  chatTemperature: 1.05,
  chatMaxTokens: 777,
}, 77);
assert.equal(migratedCustomValues.chatContextDepth, 20, 'custom history depth must not be replaced during migration');
assert.equal(migratedCustomValues.chatTemperature, 1.05);
assert.equal(migratedCustomValues.chatMaxTokens, 777);

useAppStore.getState().setChatPresetEntries([
  { id: 'entry-after-reset', name: '再次导入', role: 'system', content: '仍可保存', enabled: true },
], '再次导入');
useAppStore.getState().resetAllAppPresets();
assert.equal(useAppStore.getState().chatPresetName, '小手机 · 短 RP');
assert.equal(useAppStore.getState().chatPresetEntries.length, 14);
assert.equal(useAppStore.getState().appPresets.wechat.prompt, useAppStore.getState().appPresets.qq.prompt);

console.log('store chat preset entries ok');
