import assert from 'node:assert/strict';
import {
  BACKUP_STORAGE_KEY,
  buildBackupFileName,
  buildBackupJson,
  buildNativeBackupMessage,
} from './backupPayload';

const exportedAt = new Date('2026-05-21T08:09:10.000Z');
const rawStore = JSON.stringify({ state: { characters: [{ id: 'char-a', name: '艾尔' }] }, version: 0 });

assert.equal(buildBackupFileName(exportedAt), 'small-phone-backup-2026-05-21.json');

const backupJson = buildBackupJson(rawStore, exportedAt);
const parsed = JSON.parse(backupJson);
assert.equal(parsed.app, 'small-phone');
assert.equal(parsed.exportedAt, exportedAt.toISOString());
assert.equal(parsed.storageKey, BACKUP_STORAGE_KEY);
assert.deepEqual(parsed.data, JSON.parse(rawStore));

const nativeMessage = JSON.parse(buildNativeBackupMessage('safe.json', backupJson));
assert.equal(nativeMessage.type, 'small-phone-backup-export');
assert.equal(nativeMessage.filename, 'safe.json');
assert.equal(nativeMessage.mimeType, 'application/json');
assert.equal(nativeMessage.content, backupJson);

console.log('backupPayload tests passed');
