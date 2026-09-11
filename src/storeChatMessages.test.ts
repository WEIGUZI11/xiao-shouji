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

const { useAppStore } = await import('./store');

useAppStore.setState({ chatSessions: {} });
const messages = [
  { id: 'msg-1', role: 'model' as const, kind: 'text' as const, content: '完整回复第一条', timestamp: 100 },
  { id: 'msg-2', role: 'model' as const, kind: 'text' as const, content: '完整回复第二条', timestamp: 101 },
  { id: 'msg-3', role: 'model' as const, kind: 'text' as const, content: '完整回复第三条', timestamp: 102 },
];

useAppStore.getState().addMessages('char-a', 'wechat', messages);

assert.deepEqual(
  useAppStore.getState().chatSessions['wechat:char-a'].messages.map((message) => message.content),
  ['完整回复第一条', '完整回复第二条', '完整回复第三条'],
);

useAppStore.getState().addMessages('char-a', 'wechat', []);
assert.equal(useAppStore.getState().chatSessions['wechat:char-a'].messages.length, 3);

console.log('store chat message batch tests passed');
