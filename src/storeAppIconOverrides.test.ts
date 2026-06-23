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

const { useAppStore } = await import('./store');

useAppStore.setState({ appIconOverrides: {} } as any);

useAppStore.getState().setAppIconOverride('wechat', ' data:image/png;base64,abc ');
assert.deepEqual(useAppStore.getState().appIconOverrides, {
  wechat: 'data:image/png;base64,abc',
});

useAppStore.getState().clearAppIconOverride('wechat');
assert.deepEqual(useAppStore.getState().appIconOverrides, {});

console.log('store app icon override actions ok');
