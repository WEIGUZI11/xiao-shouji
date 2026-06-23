import assert from 'node:assert/strict';
import {
  buildChatRequestPreview,
  buildChatSystemPrompt,
  buildWeChatSystemPrompt,
  getWeChatApiConnectionIssue,
  resolveGroupReplyPartSpeaker,
  weChatLifeActionInstruction,
} from './wechatAi';

assert.match(weChatLifeActionInstruction, /\[image prompt=/);
assert.match(weChatLifeActionInstruction, /主动发图|视觉|照片|画面/);

const prompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '像真实微信一样回复。',
  styleInstruction: '这次自然回复。',
});

assert.match(prompt, /\[image prompt=/);
assert(prompt.indexOf('你是林秋。') < prompt.indexOf('[image prompt='), 'image action should stay after character prompt');

const qqPrompt = buildChatSystemPrompt({
  channel: 'qq',
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '像真实 QQ 私聊一样回复。',
  styleInstruction: '这次自然回复。',
});

assert.match(qqPrompt, /QQ/);
assert.match(qqPrompt, /QQ消息内容/);
assert.doesNotMatch(qqPrompt, /微信气泡|微信消息|真人微信|微信里/);
assert.match(qqPrompt, /不要输出思考过程/);
assert.match(prompt, /不要输出思考过程/);

const qqGroupPrompt = buildChatSystemPrompt({
  channel: 'qq',
  characterPrompt: '你正在模拟QQ群聊「今晚开黑」。每条回复用「成员名：消息内容」格式。',
  characterName: '今晚开黑',
  memberInstruction: '请挑选 1 到 4 位成员发言，不是所有人都必须回复。',
  chatPresetPrompt: '像真实 QQ 群聊一样回复。',
  styleInstruction: '这次自然回复。',
  isGroupChat: true,
});

assert.match(qqGroupPrompt, /QQ群聊/);
assert.match(qqGroupPrompt, /成员名：消息内容/);
assert.match(qqGroupPrompt, /不要写旁白/);
assert.doesNotMatch(qqGroupPrompt, /不要写角色名/);

const speakers = [
  { id: 'char-a', name: '艾尔' },
  { id: 'char-s', name: '塞尔' },
  { id: 'char-p', name: '裴羽' },
];
const resolvedPrefixed = resolveGroupReplyPartSpeaker(
  { kind: 'text', content: '塞尔：darling，我在。' },
  speakers[0],
  speakers,
);
assert.equal(resolvedPrefixed.speaker.id, 'char-s');
assert.deepEqual(resolvedPrefixed.part, { kind: 'text', content: 'darling，我在。' });

const resolvedFallback = resolveGroupReplyPartSpeaker(
  { kind: 'text', content: '我刚刚看到消息。' },
  speakers[0],
  speakers,
);
assert.equal(resolvedFallback.speaker.id, 'char-a');
assert.equal(resolvedFallback.part.kind, 'text');
assert.equal(resolvedFallback.part.content, '我刚刚看到消息。');

const preview = buildChatRequestPreview([
  { role: 'system', content: '系统提示\n第二行' },
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '我在' },
]);
assert.match(preview, /1\. system/);
assert.match(preview, /2\. user/);
assert.match(preview, /3\. assistant/);
assert.match(preview, /系统提示 第二行/);

assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: '', selectedModel: '' }), /API 未连接/);
assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: '', selectedModel: 'model-a' }), /接口地址/);
assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: 'https://example.test/v1', selectedModel: '' }), /模型/);
assert.equal(getWeChatApiConnectionIssue({ apiBaseUrl: 'https://example.test/v1', selectedModel: 'model-a' }), '');

console.log('wechatAi tests passed');
