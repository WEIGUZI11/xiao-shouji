import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
  configurable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: globalThis.localStorage },
  configurable: true,
});

const { useAppStore } = await import('./store');

useAppStore.setState({
  qqChannels: [
    {
      id: 'qq-channel-life',
      name: '日常闲聊',
      description: '测试频道',
      topic: '生活',
      followed: true,
      createdAt: 100,
      color: '#dff0ff',
    },
  ],
  qqChannelMessages: [],
  qqDynamicPosts: [],
});

const channelMessageId = useAppStore.getState().addQqChannelMessage({
  channelId: 'qq-channel-life',
  content: '频道消息会保存。',
  authorId: 'user',
  authorName: '我',
  createdAt: 200,
});

assert.ok(channelMessageId);
assert.equal(useAppStore.getState().qqChannelMessages[0].content, '频道消息会保存。');
assert.equal(useAppStore.getState().qqChannelMessages[0].channelId, 'qq-channel-life');

const postId = useAppStore.getState().addQqDynamicPost({
  content: '空间说说会保存。',
  imageUrl: 'data:image/svg+xml;utf8,test',
  imageSource: 'fallback',
  authorId: 'user',
  authorName: '我',
  createdAt: 300,
});

assert.ok(postId);
assert.equal(useAppStore.getState().qqDynamicPosts[0].content, '空间说说会保存。');
assert.equal(useAppStore.getState().qqDynamicPosts[0].imageSource, 'fallback');

useAppStore.getState().toggleQqDynamicLike(postId, 'user');
assert.deepEqual(useAppStore.getState().qqDynamicPosts[0].likes, ['user']);
useAppStore.getState().toggleQqDynamicLike(postId, 'user');
assert.deepEqual(useAppStore.getState().qqDynamicPosts[0].likes, []);

const commentId = useAppStore.getState().addQqDynamicComment(postId, {
  content: '评论也会保存。',
  authorId: 'char-a',
  authorName: '阿岚',
  createdAt: 400,
});

assert.ok(commentId);
assert.equal(useAppStore.getState().qqDynamicPosts[0].comments[0].content, '评论也会保存。');

console.log('store QQ feeds tests passed');
