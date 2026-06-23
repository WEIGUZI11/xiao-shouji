import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});
Object.defineProperty(globalThis, 'window', {
  value: globalThis,
});

const { REMOVED_DEFAULT_CHARACTER_IDS, stripRemovedDefaultCharacters } = await import('./removedDefaultCharacters');
const { useAppStore } = await import('./store');

const importedCard = {
  id: 'imported-card',
  name: '玩家导入的卡',
  avatar: '',
  description: '应该保留',
  personality: '',
  firstMessage: '',
  systemPrompt: '',
};

const stripped = stripRemovedDefaultCharacters([
  importedCard,
  { ...importedCard, id: REMOVED_DEFAULT_CHARACTER_IDS[0], name: '洛小满' },
]);

assert.deepEqual(stripped.map((character) => character.id), ['imported-card']);
assert.deepEqual(useAppStore.getState().characters, []);

useAppStore.setState({
  characters: [importedCard],
  apiBaseUrl: 'https://api.deepseek.example/v1',
  apiKey: 'local-secret',
  selectedModel: 'deepseek-chat',
  pinnedChatIds: {},
} as Partial<ReturnType<typeof useAppStore.getState>>);

useAppStore.getState().togglePinnedChat(importedCard.id, 'qq');
assert.ok(useAppStore.getState().pinnedChatIds[`qq:${importedCard.id}`]);
assert.equal(useAppStore.getState().apiBaseUrl, 'https://api.deepseek.example/v1');
assert.equal(useAppStore.getState().apiKey, 'local-secret');
assert.equal(useAppStore.getState().selectedModel, 'deepseek-chat');
assert.deepEqual(useAppStore.getState().characters.map((character) => character.id), ['imported-card']);

console.log('store no default characters ok');
