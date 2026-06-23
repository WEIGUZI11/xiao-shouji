import assert from 'node:assert/strict';
import { buildWeChatSystemPrompt } from '../wechat/ai/wechatAi';
import { buildUserProfilePrompt, resolveUserProfileForCharacter, type UserProfile, type UserProfilePreset } from './userProfilePrompt';

const fullProfile: UserProfile = {
  sendToAi: true,
  identity: '成年创作者',
  location: '南方城市，夜猫子作息',
  personality: '慢热，嘴硬但心软',
  likes: '雨天、甜饮、被认真回应',
  boundaries: '不要替我决定现实行动',
  relationship: '和 char 是暧昧期室友',
  longTermMemory: '我讨厌突然失联。生日是 8 月 16 日。',
};

assert.equal(buildUserProfilePrompt('我', { ...fullProfile, sendToAi: false }), '');

const prompt = buildUserProfilePrompt('林秋', fullProfile);
assert.match(prompt, /用户信息/);
assert.match(prompt, /昵称：林秋/);
assert.match(prompt, /身份：成年创作者/);
assert.match(prompt, /关系设定：和 char 是暧昧期室友/);
assert.match(prompt, /长期记忆：我讨厌突然失联。生日是 8 月 16 日。/);
assert.doesNotMatch(buildUserProfilePrompt('', { sendToAi: true, likes: '  ' }), /喜好/);

const longPrompt = buildUserProfilePrompt('我', { sendToAi: true, longTermMemory: 'a'.repeat(3000) });
assert(longPrompt.length <= 1800, 'prompt should be capped to avoid oversized system context');

const wechatPrompt = buildWeChatSystemPrompt({
  characterPrompt: '你是林秋。',
  characterName: '林秋',
  userProfilePrompt: prompt,
  chatPresetPrompt: '像真实微信聊天一样回复。',
  styleInstruction: '尽量一条。',
});
assert.match(wechatPrompt, /用户信息/);
assert(wechatPrompt.indexOf('你是林秋。') < wechatPrompt.indexOf('用户信息'), 'user info should follow character prompt');
assert(wechatPrompt.indexOf('用户信息') < wechatPrompt.indexOf('像真实微信聊天一样回复。'), 'user info should come before chat preset');

const presets: UserProfilePreset[] = [
  {
    id: 'user-a',
    name: '玩家A',
    profile: { ...fullProfile, identity: 'A身份' },
    updatedAt: 1,
  },
  {
    id: 'user-b',
    name: '玩家B',
    profile: { ...fullProfile, identity: 'B身份' },
    updatedAt: 2,
  },
];

const boundProfile = resolveUserProfileForCharacter({
  characterId: 'char-1',
  activeUserName: '玩家A',
  activeUserProfile: presets[0].profile,
  userProfiles: presets,
  bindings: { 'char-1': 'user-b' },
});
assert.equal(boundProfile.name, '玩家B');
assert.equal(boundProfile.profile.identity, 'B身份');

const fallbackProfile = resolveUserProfileForCharacter({
  characterId: 'char-2',
  activeUserName: '玩家A',
  activeUserProfile: presets[0].profile,
  userProfiles: presets,
  bindings: { 'char-2': 'missing-user' },
});
assert.equal(fallbackProfile.name, '玩家A');
assert.equal(fallbackProfile.profile.identity, 'A身份');

console.log('userProfilePrompt tests passed');
