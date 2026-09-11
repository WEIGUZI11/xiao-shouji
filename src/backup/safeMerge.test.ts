import assert from 'node:assert/strict';

import { mergeBackupPreservingCurrent } from './safeMerge';

const current = {
  state: {
    characters: [
      { id: 'same', name: '当前名字', messages: [{ id: 'new', text: '当前消息' }] },
      { id: 'current-only', name: '当前角色' },
    ],
    theme: 'current-theme',
  },
  version: 77,
};
const backup = {
  state: {
    characters: [
      { id: 'same', name: '备份名字', messages: [{ id: 'old', text: '备份消息' }] },
      { id: 'backup-only', name: '备份角色' },
    ],
    theme: 'backup-theme',
  },
  version: 68,
};

const merged = mergeBackupPreservingCurrent(current, backup) as typeof current;
assert.equal(merged.version, 77, 'current persistence version must win');
assert.equal(merged.state.theme, 'current-theme', 'current settings must not be overwritten');
assert.deepEqual(merged.state.characters.map((item) => item.id), ['same', 'current-only', 'backup-only']);
assert.equal(merged.state.characters[0].name, '当前名字');
assert.deepEqual(merged.state.characters[0].messages?.map((item) => item.id), ['new', 'old']);
assert.deepEqual(mergeBackupPreservingCurrent(undefined, backup), backup);

console.log('safe backup merge preserves current data and adds missing backup records');
