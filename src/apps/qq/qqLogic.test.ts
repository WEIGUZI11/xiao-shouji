import assert from 'node:assert/strict';

import {
  QQ_TABS,
  QQ_TOP_ACTIONS,
  buildQqDeviceRows,
  buildQqGroupProfileSummary,
  buildQqHeaderSummary,
  buildQqGroupRows,
  buildQqHomeRows,
  buildQqMessageShortcuts,
  buildQqPhonebookRows,
  buildQqProfileSummary,
  filterQqHomeRows,
  getQqGroupEmptyStateText,
  getQqEmptyStateText,
  getQqTabLabel,
} from './qqLogic';

const characters = [
  { id: 'char-a', name: '阿岚', firstMessage: '晚上打游戏吗', avatar: '' },
  { id: 'char-b', name: '小夏', firstMessage: '', avatar: '' },
];

const rows = buildQqHomeRows({
  characters,
  groupChats: [
    { id: 'group-a', name: '今晚开黑', memberIds: ['char-a', 'char-b'], createdAt: 100, announcement: '八点上线' },
  ],
  pinnedChatIds: {
    'qq:char-b': 900,
  },
  chatSessions: {
    'wechat:char-a': {
      characterId: 'char-a',
      channel: 'wechat',
      lastUpdated: 300,
      messages: [{ id: 'w1', role: 'user', content: '微信消息', timestamp: 300, kind: 'text' }],
    },
    'qq:char-b': {
      characterId: 'char-b',
      channel: 'qq',
      lastUpdated: 500,
      messages: [{ id: 'q1', role: 'model', content: 'QQ消息', timestamp: 500, kind: 'text' }],
    },
    'qq:group-a': {
      characterId: 'group-a',
      channel: 'qq',
      lastUpdated: 700,
      unread: 3,
      messages: [{ id: 'g1', role: 'model', content: '群消息', timestamp: 700, kind: 'text' }],
    },
  },
});

const shortcuts = buildQqMessageShortcuts({
  userName: '凡人歌',
  characters,
  groupChats: [
    {
      id: 'group-a',
      name: '今晚开黑',
      memberIds: ['char-a', 'char-b'],
      announcement: '八点上线',
      notices: [
        { id: 'notice-a', content: '今晚八点集合', publisherId: 'char-a', publisherName: '阿岚', createdAt: 1000, unread: true },
      ],
    },
  ],
  chatSessions: {
    'qq:group-a': {
      characterId: 'group-a',
      channel: 'qq',
      lastUpdated: 700,
      unread: 2,
      messages: [
        { id: 'g1', role: 'model', content: '@凡人歌 来一下', timestamp: 700, kind: 'text' },
      ],
    },
  },
});

assert.deepEqual(shortcuts.map((shortcut) => shortcut.id), ['friend-requests', 'mentions', 'group-notices']);
assert.equal(shortcuts[0].count, 2);
assert.equal(shortcuts[1].targetId, 'group-a');
assert.equal(shortcuts[1].preview, '今晚开黑：@凡人歌 来一下');
assert.equal(shortcuts[2].count, 1);

assert.deepEqual(rows.map((row) => row.targetId), ['char-b', 'group-a', 'char-a']);
assert.equal(rows[0].type, 'friend');
assert.equal(rows[0].isPinned, true);
assert.equal(rows[0].lastMessageText, 'QQ消息');
assert.equal(rows[0].hasSession, true);
assert.equal(rows[1].type, 'group');
assert.equal(rows[1].lastMessageText, '群消息');
assert.equal(rows[1].memberPreview, '阿岚、小夏');
assert.equal(rows[1].unread, 3);
assert.equal(rows[2].lastMessageText, '晚上打游戏吗');
assert.equal(rows[2].hasSession, false);
assert.deepEqual(filterQqHomeRows(rows, '小').map((row) => row.targetId), ['char-b', 'group-a']);
assert.deepEqual(filterQqHomeRows(rows, '八点').map((row) => row.targetId), ['group-a']);
assert.deepEqual(filterQqHomeRows(rows, '游戏').map((row) => row.targetId), ['char-a']);
assert.deepEqual(filterQqHomeRows(rows, '不存在').map((row) => row.targetId), []);
assert.equal(getQqEmptyStateText(0), '还没有角色。先去通讯录导入 PNG/JSON 酒馆卡。');
assert.equal(getQqEmptyStateText(2), '还没有 QQ 会话，找个好友聊一句吧。');
assert.equal(getQqGroupEmptyStateText(0), '先导入联系人，再在 QQ 联系人里拉一个群。');
assert.equal(getQqGroupEmptyStateText(2), '还没有 QQ 群聊，点右上角发起群聊。');
assert.deepEqual(QQ_TABS.map((tab) => tab.id), ['messages', 'channels', 'contacts', 'dynamic']);
assert.deepEqual(QQ_TABS.map((tab) => tab.label), ['消息', '频道', '联系人', '动态']);
assert.deepEqual(QQ_TOP_ACTIONS.map((action) => action.label), ['加好友', '发起群聊', '扫一扫', '创建频道']);
assert.equal(getQqTabLabel('messages'), '消息');
assert.equal(getQqTabLabel('contacts'), '联系人');
assert.deepEqual(buildQqHeaderSummary({ userName: '凡人歌', userAvatar: 'avatar.png' }), {
  name: '凡人歌',
  status: '手机在线',
  avatar: 'avatar.png',
});
assert.equal(buildQqHeaderSummary({ userName: '', userAvatar: null }).name, '我');

const profile = buildQqProfileSummary({
  id: 'char-a',
  name: '阿岚',
  description: '雨夜电台主播',
  personality: '温柔但嘴硬',
  firstMessage: '晚上打游戏吗',
  avatar: '',
});

assert.equal(profile.name, '阿岚');
assert.equal(profile.subtitle, '雨夜电台主播');
assert.equal(profile.startChatLabel, '发 QQ 消息');
assert.equal(profile.backLabel, '返回联系人');
assert.deepEqual(profile.actions.map((action) => action.label), ['发消息', '语音通话', '视频通话', '看动态']);
assert.ok(profile.details.some((detail) => detail.label === '个性签名'));

const groupRows = buildQqGroupRows({
  groupChats: [
    { id: 'group-a', name: '今晚开黑', memberIds: ['char-a', 'missing', 'char-b'], createdAt: 100 },
    { id: 'group-b', name: '旧书店', memberIds: ['char-a'], createdAt: 200 },
  ],
  characters,
});

assert.deepEqual(groupRows.map((row) => row.id), ['group-b', 'group-a']);
assert.equal(groupRows[0].memberCount, 1);
assert.equal(groupRows[0].memberPreview, '阿岚');
assert.equal(groupRows[1].memberCount, 3);
assert.equal(groupRows[1].memberPreview, '阿岚、小夏');

const groupProfile = buildQqGroupProfileSummary({
  group: { id: 'group-a', name: '今晚开黑', memberIds: ['char-a', 'missing', 'char-b'], announcement: '' },
  characters,
});
assert.equal(groupProfile.name, '今晚开黑');
assert.equal(groupProfile.memberCount, 3);
assert.equal(groupProfile.memberPreview, '阿岚、小夏');
assert.equal(groupProfile.announcement, '还没有群公告。');
assert.deepEqual(groupProfile.memberNames, ['阿岚', '小夏']);

assert.deepEqual(buildQqDeviceRows().map((row) => row.title), ['我的电脑', '文件助手', 'QQ邮箱提醒']);
assert.deepEqual(buildQqPhonebookRows({ userName: '凡人歌', characterCount: 2 }).map((row) => row.title), ['凡人歌', 'QQ好友同步', '手机联系人']);

console.log('qqLogic tests passed');
