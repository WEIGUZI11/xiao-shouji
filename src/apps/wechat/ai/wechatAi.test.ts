import assert from 'node:assert/strict';
import {
  buildChatRequestPreview,
  buildChatSystemPrompt,
  buildWeChatSystemPrompt,
  getWeChatApiConnectionIssue,
  parseWeChatReplyParts,
  resolveGroupReplyPartSpeaker,
  weChatLifeActionInstruction,
} from './wechatAi';

assert.match(weChatLifeActionInstruction, /\[image prompt=/);
assert.match(weChatLifeActionInstruction, /主动发图|视觉|照片|画面/);
assert.doesNotMatch(weChatLifeActionInstruction, /涓|鍥|鐢|€|�/);

const prompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '像真实微信一样回复。',
  styleInstruction: '这次自然回复。',
});

assert.match(prompt, /\[image prompt=/);
assert.match(prompt, /不要输出思考过程/);
assert(prompt.indexOf('你是林秋。') < prompt.indexOf('[image prompt='), 'image action should stay after character prompt');

const singlePrompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '完整回答。',
  styleInstruction: '这次只回复一条。',
  replyStyle: 'single',
  allowProactiveImage: false,
});
assert.match(singlePrompt, /同一条消息内自然分段/);
assert.match(singlePrompt, /不要拆成多条气泡/);
assert.doesNotMatch(singlePrompt, /偶尔加入一小段全角括号动作或心理描写/);
assert.match(singlePrompt, /主动生图已关闭/);
assert.doesNotMatch(singlePrompt, /\[image prompt=/);

const burstPrompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '像真实微信一样回复。',
  styleInstruction: '使用短 RP。',
  replyStyle: 'burst',
});
assert.match(burstPrompt, /使用短 RP/);
assert.match(burstPrompt, /一到四条自然短消息/);
assert.doesNotMatch(burstPrompt, /两到四条自然短消息/);

const structuredPrompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  chatPresetPrompt: '这里是用户自己排列的预设。',
  styleInstruction: '这里是外层重复的短 RP 规则。',
  replyStyle: 'burst',
  structuredPresetActive: true,
  structuredIdentityActive: true,
  structuredReplyContractActive: true,
});
assert.match(structuredPrompt, /气泡数量和括号风格完全服从后续预设条目/);
assert.doesNotMatch(structuredPrompt, /你是林秋/);
assert.doesNotMatch(structuredPrompt, /这里是用户自己排列的预设/);
assert.doesNotMatch(structuredPrompt, /这里是外层重复的短 RP 规则/);
assert.doesNotMatch(structuredPrompt, /两到四条自然短消息/);

assert.deepEqual(
  parseWeChatReplyParts('第一段。\n第二段继续。', 'single', '林秋', 'wechat'),
  [{ kind: 'text', content: '第一段。\n第二段继续。' }],
);
assert.deepEqual(
  parseWeChatReplyParts('林秋：第一条\n艾尔：第二条', 'single', '林秋', 'wechat', true),
  [{ kind: 'text', content: '第一条' }, { kind: 'text', content: '艾尔：第二条' }],
);

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
assert.match(preview, /#001 SYSTEM/);
assert.match(preview, /#002 USER/);
assert.match(preview, /#003 ASSISTANT/);
assert.match(preview, /系统提示\n第二行/);
const longPreviewText = '完整正文'.repeat(800);
assert.match(buildChatRequestPreview([{ role: 'system', content: longPreviewText }]), new RegExp(`${longPreviewText.slice(-24)}$`));

assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: '', selectedModel: '' }), /API 未连接/);
assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: '', selectedModel: 'model-a' }), /接口地址/);
assert.match(getWeChatApiConnectionIssue({ apiBaseUrl: 'https://example.test/v1', selectedModel: '' }), /模型/);
assert.equal(getWeChatApiConnectionIssue({ apiBaseUrl: 'https://example.test/v1', selectedModel: 'model-a' }), '');

console.log('wechatAi tests passed');
