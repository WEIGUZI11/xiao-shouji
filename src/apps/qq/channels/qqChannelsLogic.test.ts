import assert from 'node:assert/strict';

import {
  buildPersonaQqChannelMessageDraft,
  buildQqChannelMessage,
  buildQqChannelRows,
  getDefaultQqChannels,
} from './qqChannelsLogic';

const channels = getDefaultQqChannels(1000);

assert.deepEqual(channels.map((channel) => channel.name), ['日常闲聊', '角色小圈子', '素材分享']);
assert.equal(channels[0].followed, true);
assert.equal(channels[1].topic, '角色日常');

const messages = [
  buildQqChannelMessage({
    channelId: 'qq-channel-life',
    authorId: 'user',
    authorName: '我',
    content: '今晚想在频道里聊天。',
    createdAt: 2000,
  }),
  buildQqChannelMessage({
    channelId: 'qq-channel-role',
    authorId: 'char-a',
    authorName: '阿岚',
    content: '角色频道第一条广播。',
    createdAt: 3000,
  }),
];

const rows = buildQqChannelRows({ channels, messages });

assert.deepEqual(rows.map((row) => row.id), ['qq-channel-role', 'qq-channel-life', 'qq-channel-assets']);
assert.equal(rows[0].lastMessageText, '角色频道第一条广播。');
assert.equal(rows[0].messageCount, 1);
assert.equal(rows[1].lastMessageText, '今晚想在频道里聊天。');
assert.equal(rows[2].lastMessageText, '还没有消息，发一条频道动态吧。');
assert.deepEqual(
  rows.filter((row) => row.followed).map((row) => row.id),
  ['qq-channel-life', 'qq-channel-assets'],
);

const personaDraft = buildPersonaQqChannelMessageDraft({
  channel: channels[1],
  character: {
    id: 'char-rain',
    name: '阿岚',
    avatar: 'avatar.png',
    description: '雨夜电台主播',
    personality: '温柔但嘴硬',
    firstMessage: '晚上打游戏吗',
    imagePromptTags: 'rainy radio room, blue light',
  },
  createdAt: 4000,
});

assert.equal(personaDraft.channelId, 'qq-channel-role');
assert.equal(personaDraft.authorId, 'char-rain');
assert.equal(personaDraft.authorName, '阿岚');
assert.equal(personaDraft.authorAvatar, 'avatar.png');
assert.match(personaDraft.content, /雨夜电台主播|温柔但嘴硬/);
assert.match(personaDraft.content, /晚上打游戏吗/);

console.log('qqChannelsLogic tests passed');
