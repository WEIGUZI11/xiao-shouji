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

useAppStore.setState({
  userProfileCharacterBindings: {},
  userProfiles: [
    {
      id: 'user-a',
      name: '玩家A',
      profile: { sendToAi: true, identity: 'A身份', location: '', personality: '', likes: '', boundaries: '', relationship: '', longTermMemory: '' },
      updatedAt: 1,
    },
    {
      id: 'user-b',
      name: '玩家B',
      profile: { sendToAi: true, identity: 'B身份', location: '', personality: '', likes: '', boundaries: '', relationship: '', longTermMemory: '' },
      updatedAt: 2,
    },
  ],
  activeUserProfileId: 'user-a',
  userName: '玩家A',
  userProfile: { sendToAi: true, identity: 'A身份', location: '', personality: '', likes: '', boundaries: '', relationship: '', longTermMemory: '' },
} as any);

useAppStore.getState().bindUserProfileToCharacter('char-1', 'user-b');
assert.deepEqual(useAppStore.getState().userProfileCharacterBindings, { 'char-1': 'user-b' });

useAppStore.getState().bindUserProfileToCharacter('char-1', null);
assert.deepEqual(useAppStore.getState().userProfileCharacterBindings, {});

useAppStore.getState().bindUserProfileToCharacter('char-2', 'user-b');
useAppStore.getState().deleteUserProfilePreset('user-b');
assert.deepEqual(useAppStore.getState().userProfileCharacterBindings, {});

console.log('store user profile bindings ok');
