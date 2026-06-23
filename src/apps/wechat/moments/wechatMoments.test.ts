import assert from 'node:assert/strict';
import {
  createMomentMeta,
  decorateMoments,
  appendMomentComment,
  buildAutoMomentReplies,
  buildCharacterMomentProfile,
  generateSettingFriendComments,
  generateCharacterMomentComments,
  generateCharacterMomentDrafts,
  getCharacterMomentFeed,
  getMomentComposerToggleLabel,
  limitWechatMoments,
  normalizeMomentContent,
  removeWechatMomentAt,
  toggleMomentLike,
  type MomentDraft,
} from './momentsLogic';

assert.equal(normalizeMomentContent('  今天风很好  '), '今天风很好');
assert.equal(normalizeMomentContent('   \n\t  '), '');
assert.equal(getMomentComposerToggleLabel(false), '发朋友圈');
assert.equal(getMomentComposerToggleLabel(true), '收起发布');

const longList = Array.from({ length: 25 }, (_, index) => `第${index + 1}条`);
assert.deepEqual(limitWechatMoments(longList).length, 20);
assert.equal(limitWechatMoments(longList)[0], '第1条');
assert.equal(limitWechatMoments(longList).at(-1), '第20条');

assert.deepEqual(removeWechatMomentAt(['第一条', '第二条', '第三条'], 1), ['第一条', '第三条']);
assert.deepEqual(removeWechatMomentAt(['第一条'], -1), ['第一条']);
assert.deepEqual(removeWechatMomentAt(['第一条'], 2), ['第一条']);

const draft: MomentDraft = {
  content: ' 今天想去海边 ',
  mood: 'happy',
  visibility: 'selected',
  decoration: 'polaroid',
  visibleCharacterIds: ['char-a', 'char-b'],
  images: ['1.png', '2.png', '3.png', '4.png'],
};
const meta = createMomentMeta(draft, 1710000000000);

assert.equal(meta.content, '今天想去海边');
assert.equal(meta.mood, 'happy');
assert.equal(meta.visibility, 'selected');
assert.equal(meta.decoration, 'polaroid');
assert.deepEqual(meta.visibleCharacterIds, ['char-a', 'char-b']);
assert.deepEqual(meta.images, ['1.png', '2.png', '3.png']);
assert.equal(meta.authorName, undefined);

const decorated = decorateMoments(['今天想去海边', '普通一句'], [meta]);
assert.equal(decorated[0].content, '今天想去海边');
assert.equal(decorated[0].mood, 'happy');
assert.equal(decorated[0].decoration, 'polaroid');
assert.equal(decorated[1].mood, 'daily');
assert.equal(decorated[1].decoration, 'plain');

const generatedDrafts = generateCharacterMomentDrafts([
  {
    id: 'char-a',
    name: '阿岚',
    avatar: 'avatar-a.png',
    description: '雨城旧书店常客，喜欢拍窗外的光。',
    personality: '温柔慢热',
    firstMessage: '今天也在看雨。',
  },
  {
    id: 'char-b',
    name: '小夏',
    avatar: '',
    description: '',
    personality: '',
    firstMessage: '',
  },
], 2, 1710000000000);

assert.equal(generatedDrafts.length, 2);
assert.equal(generatedDrafts[0].authorName, '阿岚');
assert.equal(generatedDrafts[0].authorAvatar, 'avatar-a.png');
assert.equal(generatedDrafts[0].sourceCharacterId, 'char-a');
assert.match(generatedDrafts[0].content, /雨城旧书店常客/);
assert.equal(generatedDrafts[1].authorName, '小夏');
assert.match(generatedDrafts[1].content, /小夏/);

const generatedMeta = createMomentMeta(generatedDrafts[0], 1710000001000);
assert.equal(generatedMeta.authorName, '阿岚');
assert.equal(generatedMeta.authorAvatar, 'avatar-a.png');
assert.equal(generatedMeta.sourceCharacterId, 'char-a');

const decoratedGenerated = decorateMoments([generatedMeta.content], [generatedMeta]);
assert.equal(decoratedGenerated[0].authorName, '阿岚');
assert.equal(decoratedGenerated[0].authorAvatar, 'avatar-a.png');
assert.equal(decoratedGenerated[0].sourceCharacterId, 'char-a');

const comments = generateCharacterMomentComments([
  {
    id: 'char-a',
    name: '阿岚',
    avatar: 'avatar-a.png',
    description: '雨城旧书店常客。',
    personality: '温柔慢热',
  },
  {
    id: 'char-b',
    name: '小夏',
    avatar: '',
    description: '喜欢热闹。',
    personality: '直率',
  },
], '今天想去海边', 'char-a', 2, 1710000002000);

assert.equal(comments.length, 1);
assert.equal(comments[0].authorName, '小夏');
assert.equal(comments[0].sourceCharacterId, 'char-b');
assert.ok(comments[0].content.length > 0);
assert.equal(comments[0].content.includes('小夏'), false);

const commentedMeta = createMomentMeta({ ...draft, comments }, 1710000003000);
assert.equal(commentedMeta.comments?.length, 1);
assert.equal(commentedMeta.comments?.[0].authorName, '小夏');

const autoReplies = buildAutoMomentReplies([
  {
    id: 'char-a',
    name: '阿岚',
    avatar: 'avatar-a.png',
    description: '雨城旧书店常客。',
    personality: '温柔慢热',
  },
  {
    id: 'char-b',
    name: '小夏',
    avatar: '',
    description: '喜欢热闹。',
    personality: '直率',
  },
], '今天想去海边', undefined, 1710000004000);
assert.ok(autoReplies.length >= 1);
assert.equal(autoReplies[0].sourceCharacterId.startsWith('char-'), true);

const likedMeta = toggleMomentLike(commentedMeta, {
  id: 'user',
  name: '我',
  avatar: '',
  kind: 'user',
}, 1710000005000);
assert.equal(likedMeta.likes?.length, 1);
assert.equal(likedMeta.likes?.[0].authorName, '我');
const unlikedMeta = toggleMomentLike(likedMeta, {
  id: 'user',
  name: '我',
  kind: 'user',
}, 1710000006000);
assert.equal(unlikedMeta.likes?.length, 0);

const userCommentedMeta = appendMomentComment(commentedMeta, {
  authorId: 'user',
  authorName: '我',
  authorAvatar: '',
  sourceCharacterId: 'user',
  content: '我也想听你多说一点',
}, 1710000007000);
assert.equal(userCommentedMeta.comments?.at(-1)?.authorName, '我');
assert.equal(userCommentedMeta.comments?.at(-1)?.content, '我也想听你多说一点');

const socialCharacter = {
  id: 'char-social',
  name: '林照',
  avatar: 'lin.png',
  description: '摄影社朋友总叫他去天台拍夕阳，室友阿柚会在楼下等他。',
  personality: '慢热但很照顾朋友',
  firstMessage: '社团的人刚刚还在群里喊我。',
};
const socialProfile = buildCharacterMomentProfile(socialCharacter);
assert.equal(socialProfile.name, '林照');
assert.match(socialProfile.signature, /摄影社|室友|朋友|社团/);
assert.ok(socialProfile.friendNames.length >= 2);
assert.ok(socialProfile.friendNames.includes('摄影社朋友'));
assert.ok(socialProfile.friendNames.includes('室友阿柚'));

const settingFriendComments = generateSettingFriendComments(socialCharacter, '今天去天台拍夕阳', 1710000008000);
assert.ok(settingFriendComments.length >= 1);
assert.equal(settingFriendComments[0].sourceCharacterId.startsWith('setting-friend-char-social'), true);
assert.notEqual(settingFriendComments[0].authorName, '林照');

const socialMeta = createMomentMeta({
  content: '今天去天台拍夕阳',
  mood: 'daily',
  visibility: 'public',
  decoration: 'plain',
  visibleCharacterIds: [],
  images: [],
  authorName: '林照',
  authorAvatar: 'lin.png',
  sourceCharacterId: 'char-social',
  comments: settingFriendComments,
}, 1710000009000);
const friendFeed = getCharacterMomentFeed([socialMeta.content, '我自己的动态'], [socialMeta], 'char-social');
assert.equal(friendFeed.length, 1);
assert.equal(friendFeed[0].sourceCharacterId, 'char-social');

console.log('wechat moments logic ok');
