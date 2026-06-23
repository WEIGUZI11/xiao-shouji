import assert from 'node:assert/strict';

import {
  buildQqGroupSharedSpace,
  createQqGroupFile,
  createQqGroupNotice,
  createQqGroupPhoto,
} from './qqGroupProfileLogic';

const characters = [
  { id: 'char-a', name: '阿岚', avatar: 'avatar-a.png' },
  { id: 'char-b', name: '小夏', avatar: '' },
];

const group = {
  id: 'group-a',
  name: '今晚开黑',
  memberIds: ['char-a', 'char-b'],
  announcement: '八点上线',
  files: [
    { id: 'file-a', name: '副本攻略.md', uploaderId: 'char-a', uploaderName: '阿岚', sizeLabel: '文档', createdAt: 100 },
  ],
  photos: [
    { id: 'photo-a', title: '赛后截图', sourceMemberId: 'char-b', sourceMemberName: '小夏', url: '', createdAt: 120 },
  ],
  notices: [
    { id: 'notice-a', content: '今晚八点集合。', publisherId: 'char-a', publisherName: '阿岚', createdAt: 140, unread: true },
    { id: 'notice-b', content: '装备整理好了。', publisherId: 'char-b', publisherName: '小夏', createdAt: 160, unread: false },
  ],
  memberCards: {
    'char-a': '队长阿岚',
  },
};

const sharedSpace = buildQqGroupSharedSpace({ group, characters });
assert.equal(sharedSpace.fileCount, 1);
assert.equal(sharedSpace.photoCount, 1);
assert.equal(sharedSpace.unreadNoticeCount, 1);
assert.deepEqual(sharedSpace.memberCards.map((card) => card.cardName), ['队长阿岚', '小夏']);
assert.equal(sharedSpace.cardPreview, '队长阿岚、小夏');

const createdFile = createQqGroupFile({ group, characters, name: '作战表.png', now: 200 });
assert.equal(createdFile.name, '作战表.png');
assert.equal(createdFile.uploaderName, '阿岚');
assert.equal(createdFile.sizeLabel, '图片');

const createdNotice = createQqGroupNotice({ group, characters, content: '都把麦克风调好。', now: 220 });
assert.equal(createdNotice.publisherName, '阿岚');
assert.equal(createdNotice.unread, true);

const createdPhoto = createQqGroupPhoto({ group, characters, title: '大厅合照', now: 240 });
assert.equal(createdPhoto.sourceMemberName, '阿岚');
assert.equal(createdPhoto.url, 'avatar-a.png');

console.log('qq group profile logic tests passed');
