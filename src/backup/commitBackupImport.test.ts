import assert from 'node:assert/strict';
import { commitBackupImport } from './commitBackupImport';
import { BACKUP_STORAGE_KEY, parseBackupDocument, parseBackupStorageData } from './backupPayload';

const values = new Map<string, string>();
let failWrites = false;
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (failWrites) throw new Error('QuotaExceededError');
    values.set(key, value);
  },
  removeItem: (key: string) => { values.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
const { useAppStore, migratePersistedAppState } = await import('../store');
useAppStore.getState().setModelConfig({ selectedModel: 'current-model' });
const version = useAppStore.persist.getOptions().version!;
const incoming = {
  version,
  state: migratePersistedAppState({ diaries: [{ id: 'backup-diary', content: '备份原文', title: '恢复测试' }] }, 0),
};
// Simulate a background update while image import is pending: commit must read the latest disk state.
useAppStore.getState().setModelConfig({ selectedModel: 'latest-model' });
commitBackupImport(storage, incoming, () => {
  void useAppStore.persist.rehydrate();
  assert.equal(useAppStore.persist.hasHydrated(), true);
});
assert.equal(useAppStore.getState().selectedModel, 'latest-model');
assert.equal(useAppStore.getState().diaries.find((item) => item.id === 'backup-diary')?.content, '备份原文');
// A regular live store save immediately after import must retain imported records.
useAppStore.getState().setModelConfig({ chatTemperature: 0.8 });
assert.match(storage.getItem(BACKUP_STORAGE_KEY)!, /备份原文/);
commitBackupImport(storage, incoming, () => { void useAppStore.persist.rehydrate(); });
assert.equal(useAppStore.getState().diaries.filter((item) => item.id === 'backup-diary').length, 1);
const before = storage.getItem(BACKUP_STORAGE_KEY);
failWrites = true;
assert.throws(() => commitBackupImport(storage, incoming, () => assert.fail('must not hydrate')), /QuotaExceeded/);
assert.equal(storage.getItem(BACKUP_STORAGE_KEY), before);
failWrites = false;
assert.throws(() => commitBackupImport(storage, { state: null }, () => assert.fail()), /state/);
assert.equal(storage.getItem(BACKUP_STORAGE_KEY), before);
let hydrationAttempts = 0;
assert.throws(() => commitBackupImport(storage, incoming, () => {
  if (++hydrationAttempts === 1) throw new Error('hydrate failed');
}), /hydrate failed/);
assert.equal(storage.getItem(BACKUP_STORAGE_KEY), before);
assert.deepEqual(parseBackupStorageData('\uFEFF' + JSON.stringify({ state: {}, version: 78 })), { state: {}, version: 78 });
assert.deepEqual(parseBackupStorageData({ [BACKUP_STORAGE_KEY]: '{"state":{},"version":70}' }), { state: {}, version: 70 });
for (const state of [null, [], 'broken', 0]) assert.throws(() => parseBackupStorageData({ state }));
const wrapped = { app: 'small-phone', data: { state: {} }, imageAssets: { saved: 'data:image/png;base64,AA==' } };
assert.deepEqual(parseBackupDocument(JSON.stringify(JSON.stringify(wrapped))), wrapped, 'double-encoded backups must retain image assets too');
console.log('backup import: live hydration, background save, repeat import, quota and invalid-file preservation passed');
