import assert from 'node:assert/strict';
import {
  buildChatPresetMessages,
  compileChatPresetEntries,
  getChatPresetPlaceholderCoverage,
  getChatPresetPlaceholderKind,
  isChatPresetPinnedEntry,
  moveChatPresetEntry,
  parseSillyTavernPresetEntries,
} from './chatPresetEntries';
import {
  createSmallPhonePresetEntries,
  normalizeChatContextDepth,
  selectRecentChatContext,
  smallPhoneLongPresetEntries,
  smallPhonePresetEntries,
  smallPhonePresetTuning,
} from './smallPhonePreset';
import { wechatChatPresets } from '../shared/WeChatShared';

const entries = parseSillyTavernPresetEntries({
  prompts: [
    { identifier: 'a', name: '系统规则', role: 'system', enabled: false, content: '系统正文，{{char}}' },
    { identifier: 'personaDescription', name: '用户设定描述', role: 'system', content: '' },
    { identifier: 'charDescription', name: '角色描述', role: 'system', content: '' },
    { identifier: 'chatHistory', name: '聊天历史', role: 'system', content: '' },
    { identifier: 'b', name: '用户任务', role: 'user', enabled: false, content: '用户正文，{{user}}' },
    { identifier: 'c', name: '示例回复', role: 'assistant', enabled: true, content: '示例正文' },
  ],
  prompt_order: [{ order: [
    { identifier: 'b', enabled: true },
    { identifier: 'a', enabled: false },
    { identifier: 'personaDescription', enabled: true },
    { identifier: 'charDescription', enabled: true },
    { identifier: 'chatHistory', enabled: true },
  ] }],
});

assert.deepEqual(entries.map((entry) => entry.id), ['b', 'a', 'personaDescription', 'charDescription', 'chatHistory', 'c']);
assert.deepEqual(entries.map((entry) => entry.enabled), [true, false, true, true, true, true]);
assert.deepEqual(buildChatPresetMessages(entries, {
  userName: '小满',
  characterName: '蓝珂',
  userProfilePrompt: '用户资料正文',
  characterDescription: '角色描述正文',
  historyMessages: [
    { role: 'user', content: '上一次用户消息' },
    { role: 'assistant', content: '上一次角色消息' },
  ],
}), [
  { role: 'user', content: '用户正文，小满' },
  { role: 'system', content: '用户资料正文' },
  { role: 'system', content: '角色描述正文' },
  { role: 'user', content: '上一次用户消息' },
  { role: 'assistant', content: '上一次角色消息' },
  { role: 'assistant', content: '示例正文' },
]);

// 条目名称只属于管理界面，不能像旧实现一样作为【名称】污染真正提示词。
assert.equal(compileChatPresetEntries(entries), '用户正文，用户\n\n示例正文');
assert.equal(getChatPresetPlaceholderKind({ id: 'custom', name: '📚世界信息(后)' }), 'worldInfoAfter');
assert.equal(getChatPresetPlaceholderKind({ id: 'heading', name: '👥角色设定——' }), null);
assert.equal(getChatPresetPlaceholderKind({ id: 'history-heading', name: '📜历史记录——' }), null);
assert.equal(isChatPresetPinnedEntry({ id: 'chatHistory', name: '可改名的历史槽' }), true);
assert.equal(isChatPresetPinnedEntry({ id: 'custom', name: '普通规则' }), false);

assert.deepEqual(
  moveChatPresetEntry(entries, 'chatHistory', 'b').map((entry) => entry.id),
  ['chatHistory', 'b', 'a', 'personaDescription', 'charDescription', 'c'],
);

const conditionalEntries = [
  { id: 'short', name: '短 RP', role: 'system' as const, content: '短规则', enabled: true, activeForReplyStyles: ['burst' as const] },
  { id: 'long', name: '长 RP', role: 'system' as const, content: '长规则', enabled: true, activeForReplyStyles: ['single' as const] },
];
assert.deepEqual(buildChatPresetMessages(conditionalEntries, { replyStyle: 'burst' }), [{ role: 'system', content: '短规则' }]);
assert.deepEqual(buildChatPresetMessages(conditionalEntries, { replyStyle: 'single' }), [{ role: 'system', content: '长规则' }]);

const shortPresetText = compileChatPresetEntries(smallPhonePresetEntries, { replyStyle: 'burst' });
const longPresetText = compileChatPresetEntries(smallPhoneLongPresetEntries, { replyStyle: 'single' });
assert.match(shortPresetText, /本轮使用短 RP/);
assert.doesNotMatch(shortPresetText, /本轮使用长 RP/);
assert.match(longPresetText, /本轮使用长 RP/);
assert.doesNotMatch(longPresetText, /本轮使用短 RP/);
assert.match(shortPresetText, /不要写括号动作/);
assert.equal(smallPhonePresetEntries.filter((entry) => isChatPresetPinnedEntry(entry)).length, 8);
assert.equal(smallPhonePresetEntries.find((entry) => entry.id === 'small-phone-short-rp')?.enabled, true);
assert.equal(smallPhonePresetEntries.find((entry) => entry.id === 'small-phone-long-rp')?.enabled, false);
assert.equal(smallPhoneLongPresetEntries.find((entry) => entry.id === 'small-phone-short-rp')?.enabled, false);
assert.equal(smallPhoneLongPresetEntries.find((entry) => entry.id === 'small-phone-long-rp')?.enabled, true);
assert.equal(smallPhonePresetEntries.some((entry) => entry.id === 'small-phone-auto-rp'), false);
assert.deepEqual(smallPhonePresetTuning.short, { temperature: 0.82, contextDepth: 120, maxTokens: 900, replyStyle: 'burst' });
assert.deepEqual(smallPhonePresetTuning.long, { temperature: 0.82, contextDepth: 200, maxTokens: 2400, replyStyle: 'single' });
assert.equal(normalizeChatContextDepth(1), 1);
assert.equal(normalizeChatContextDepth(20), 20);
assert.deepEqual(selectRecentChatContext(['一', '二', '三', '四'], 2), ['三', '四']);

const customizedLongPreset = createSmallPhonePresetEntries('long', smallPhonePresetEntries.map((entry) => (
  entry.id === 'small-phone-head' ? { ...entry, content: '玩家自己修改的头部' } : entry
)));
assert.equal(customizedLongPreset.find((entry) => entry.id === 'small-phone-head')?.content, '玩家自己修改的头部');
assert.equal(customizedLongPreset.find((entry) => entry.id === 'small-phone-short-rp')?.enabled, false);
assert.equal(customizedLongPreset.find((entry) => entry.id === 'small-phone-long-rp')?.enabled, true);
assert.deepEqual(wechatChatPresets.map((preset) => preset.name), ['小手机 · 短 RP', '小手机 · 长 RP']);

const coverage = getChatPresetPlaceholderCoverage(entries);
assert.equal(coverage.personaDescription, true);
assert.equal(coverage.charDescription, true);
assert.equal(coverage.chatHistory, true);
assert.equal(coverage.scenario, false);
assert.equal(getChatPresetPlaceholderCoverage([{ id: 'scenario', name: '场景', role: 'system', content: '', enabled: false }]).scenario, false);

console.log('chat preset entry helpers ok');
