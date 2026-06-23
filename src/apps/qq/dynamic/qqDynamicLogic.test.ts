import assert from 'node:assert/strict';

import {
  buildPersonaQqDynamicDraft,
  buildQqDynamicPost,
  buildQqDynamicTextImage,
  formatQqDynamicTime,
  sortQqDynamicPosts,
  toggleQqDynamicLikeIds,
  withQqDynamicComment,
} from './qqDynamicLogic';

const first = buildQqDynamicPost({
  id: 'post-a',
  authorId: 'user',
  authorName: '我',
  content: '今天把 QQ 空间做起来。',
  createdAt: 1000,
});
const second = buildQqDynamicPost({
  id: 'post-b',
  authorId: 'char-a',
  authorName: '阿岚',
  content: '频道里好像热闹起来了。',
  imageUrl: 'data:image/png;base64,abc',
  imageSource: 'generated',
  createdAt: 2000,
});

assert.deepEqual(sortQqDynamicPosts([first, second]).map((post) => post.id), ['post-b', 'post-a']);
assert.equal(first.likes.length, 0);
assert.deepEqual(toggleQqDynamicLikeIds(first.likes, 'user'), ['user']);
assert.deepEqual(toggleQqDynamicLikeIds(['user', 'char-a'], 'user'), ['char-a']);

const commented = withQqDynamicComment(first, {
  id: 'comment-a',
  authorId: 'char-a',
  authorName: '阿岚',
  content: '看起来像 QQ 空间了。',
  createdAt: 3000,
});

assert.equal(commented.comments.length, 1);
assert.equal(commented.comments[0].authorName, '阿岚');
assert.equal(commented.comments[0].content, '看起来像 QQ 空间了。');
assert.equal(formatQqDynamicTime(1710000000000, 1710000300000), '5分钟前');
assert.equal(formatQqDynamicTime(1710000000000, 1710086400000), '3月10日');

const textImage = buildQqDynamicTextImage({
  authorName: '我',
  content: '没有生图接口时，也要有一张能看的空间文字图片。',
  seed: 2,
});

assert.match(textImage, /^data:image\/svg\+xml;utf8,/);
assert.match(decodeURIComponent(textImage), /没有生图接口时/);
assert.match(decodeURIComponent(textImage), /QQ空间/);

const personaDynamic = buildPersonaQqDynamicDraft({
  character: {
    id: 'char-rain',
    name: '阿岚',
    avatar: 'avatar.png',
    description: '雨夜电台主播',
    personality: '温柔但嘴硬',
    firstMessage: '晚上打游戏吗',
    imagePromptTags: 'rainy radio room, blue light',
  },
  createdAt: 5000,
});

assert.equal(personaDynamic.authorId, 'char-rain');
assert.equal(personaDynamic.authorName, '阿岚');
assert.equal(personaDynamic.authorAvatar, 'avatar.png');
assert.match(personaDynamic.content, /雨夜电台主播/);
assert.match(personaDynamic.content, /温柔但嘴硬|晚上打游戏吗/);
assert.match(personaDynamic.imagePrompt || '', /rainy radio room/);
assert.equal(personaDynamic.createdAt, 5000);

console.log('qqDynamicLogic tests passed');
