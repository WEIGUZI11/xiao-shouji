import assert from 'node:assert/strict';

import { buildContextPackage } from './contextPackage';

const now = Date.now();
const character = {
  id: 'char-a',
  name: '阿岚',
  avatar: '',
  description: '',
  personality: '',
  firstMessage: '',
  systemPrompt: '',
};
const state = {
  characters: [character],
  chatSessions: {
    'qq:group-a': {
      messages: [
        {
          id: 'm-qq-group',
          role: 'model',
          speakerId: 'char-a',
          content: 'QQ群里说过要晚上一起打游戏。',
          timestamp: now,
          kind: 'text',
        },
      ],
    },
    'wechat:group-a': {
      messages: [
        {
          id: 'm-wechat-group',
          role: 'model',
          speakerId: 'char-a',
          content: '微信群里说过要带伞。',
          timestamp: now,
          kind: 'text',
        },
      ],
    },
  },
  groupChats: [{ id: 'group-a', name: '今晚开黑', memberIds: ['char-a'], createdAt: now }],
  diaries: [],
  browserSearches: [],
  browserHistory: [],
  browserBookmarks: [],
  browserWorldBook: '',
  xiaohongshuNotes: [],
  musicListenRecords: [],
  musicTracks: [],
  galleryPhotos: [],
  memos: [],
  calendarEvents: [],
} as unknown as Parameters<typeof buildContextPackage>[0]['state'];

const contextPackage = buildContextPackage({
  character,
  range: '1d',
  wechatLimit: 50,
  qqLimit: 50,
  state,
});

assert.match(contextPackage.text, /QQ群聊/);
assert.match(contextPackage.text, /晚上一起打游戏/);
assert.match(contextPackage.text, /微信群聊/);
assert.match(contextPackage.text, /带伞/);
assert(contextPackage.previewRows.some((row) => row.app === 'QQ群聊' && /晚上一起打游戏/.test(row.detail)));

const excludedPackage = buildContextPackage({
  character,
  range: '1d',
  wechatLimit: 50,
  qqLimit: 50,
  state,
  excludedSectionIds: ['qq-groups'],
});
assert.equal(excludedPackage.previewRows.find((row) => row.sectionId === 'qq-groups')?.excluded, true);
assert.equal(excludedPackage.previewRows.find((row) => row.sectionId === 'wechat-groups')?.excluded, false);
assert.equal(excludedPackage.text.includes(contextPackage.previewRows.find((row) => row.sectionId === 'qq-groups')?.detail || '__missing__'), false);

console.log('aiContextPackage tests passed');
