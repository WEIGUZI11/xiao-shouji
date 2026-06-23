export type MomentMood = 'daily' | 'miss' | 'happy' | 'low' | 'showoff' | 'thoughts';
export type MomentVisibility = 'public' | 'private' | 'selected';
export type MomentDecoration = 'plain' | 'note' | 'polaroid' | 'night' | 'sunny';

export type MomentDraft = {
  content: string;
  mood: MomentMood;
  visibility: MomentVisibility;
  decoration: MomentDecoration;
  visibleCharacterIds: string[];
  images: string[];
  comments?: MomentComment[];
  authorName?: string;
  authorAvatar?: string;
  sourceCharacterId?: string;
};

export type MomentMeta = Omit<MomentDraft, 'content'> & {
  id: string;
  content: string;
  createdAt: number;
  pinned?: boolean;
  likes?: MomentLike[];
};

export type DecoratedMoment = MomentMeta & {
  index: number;
};

export type MomentComment = {
  id: string;
  authorName: string;
  authorAvatar?: string;
  sourceCharacterId: string;
  content: string;
};

export type MomentLike = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  kind: 'user' | 'character';
  createdAt: number;
};

export type MomentCommentDraft = {
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  sourceCharacterId: string;
  content: string;
};

export type MomentLikeActor = {
  id: string;
  name: string;
  avatar?: string;
  kind: 'user' | 'character';
};

export type CharacterMomentProfile = {
  id: string;
  name: string;
  avatar?: string;
  signature: string;
  coverTone: 'rain' | 'sunset' | 'night' | 'soft' | 'city';
  friendNames: string[];
};

export const momentMoodLabels: Record<MomentMood, string> = {
  daily: '日常',
  miss: '想念',
  happy: '开心',
  low: '低落',
  showoff: '炫耀',
  thoughts: '碎碎念',
};

export const momentDecorationLabels: Record<MomentDecoration, string> = {
  plain: '原色',
  note: '便签',
  polaroid: '拍立得',
  night: '夜晚',
  sunny: '晴天',
};

export function normalizeMomentContent(content: string) {
  return content.trim();
}

export function getMomentComposerToggleLabel(isOpen: boolean) {
  return isOpen ? '收起发布' : '发朋友圈';
}

function compactMomentText(text: string, limit = 42) {
  const normalized = normalizeMomentContent(text).replace(/\s+/g, ' ');
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function looksLikeInternalPrompt(value: string) {
  return /<[^>]+>|#\s*(SFW|NSFW|Core|Background)|\b(name|age|gender|identities|system|prompt|content|entries)\s*:|{{user}}|发布风格|输出严格|结构：|人物设定|世界背景|角色卡|不要逐字|你正在为小手机|笔记要像真实用户|图片描述/i.test(value);
}

function publicMomentSource(character: MomentSourceCharacter) {
  const source = normalizeMomentContent(character.description || character.personality || character.firstMessage || '');
  if (!source || looksLikeInternalPrompt(source)) return '';
  return compactMomentText(source);
}

function collectSettingFriendNames(text: string) {
  const normalized = normalizeMomentContent(text);
  if (!normalized) return [];
  const names: string[] = [];
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}朋友)/g,
    /(室友[\u4e00-\u9fa5A-Za-z0-9]{0,4})/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}同学)/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}同事)/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}队友)/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}搭档)/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}前辈)/g,
    /([\u4e00-\u9fa5A-Za-z0-9]{0,6}后辈)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of normalized.matchAll(pattern)) {
      const name = normalizeMomentContent(match[1]).replace(/[总会要正在刚刚也会]+$/g, '');
      if (name.length >= 2 && !/很|照顾|喜欢|讨厌|珍惜|对待|慢热|孤僻|没有|需要/.test(name)) names.push(name);
    }
  });
  if (/社团|社员|社长/.test(normalized)) names.push('社团朋友');
  if (/家人|哥哥|姐姐|弟弟|妹妹|父亲|母亲/.test(normalized)) names.push('家人');
  return Array.from(new Set(names)).slice(0, 6);
}

function getMomentCoverTone(text: string): CharacterMomentProfile['coverTone'] {
  if (/雨|伞|潮湿|旧书店/.test(text)) return 'rain';
  if (/夕阳|黄昏|天台|晚霞/.test(text)) return 'sunset';
  if (/夜|凌晨|月|灯/.test(text)) return 'night';
  if (/街|城市|车站|咖啡|店/.test(text)) return 'city';
  return 'soft';
}

function publicMomentContent(content: string, authorName?: string) {
  const normalized = normalizeMomentContent(content);
  if (!normalized || looksLikeInternalPrompt(normalized)) {
    return `${authorName || '朋友'}今天也在手机里留下一点生活痕迹。`;
  }
  return normalized;
}

function createMomentComment(
  character: MomentSourceCharacter,
  momentContent: string,
  index: number,
  now: number,
): MomentComment {
  const topic = compactMomentText(momentContent.replace(/\n+/g, ' '), 18);
  const tone = compactMomentText(character.personality || character.description || '', 12);
  const templates = [
    `也看到这句了，${topic ? `“${topic}”很有画面感。` : '感觉很像今天。'}`,
    `${topic || '这条'}先赞一下，晚点想听你多讲一点。`,
    tone ? `以${tone}的心情路过，给这条留个脚印。` : '路过，认真点了个赞。',
    '这条我记住了，表示同感。',
  ];

  return {
    id: `comment-${now}-${character.id}-${index}`,
    authorName: character.name,
    authorAvatar: character.avatar || '',
    sourceCharacterId: character.id,
    content: templates[(now + index + character.name.length) % templates.length],
  };
}

export function limitWechatMoments<T>(moments: T[], limit = 20) {
  return moments.slice(0, limit);
}

export function removeWechatMomentAt<T>(moments: T[], index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= moments.length) return moments;
  return moments.filter((_, itemIndex) => itemIndex !== index);
}

export function createMomentMeta(draft: MomentDraft, now = Date.now()): MomentMeta {
  return {
    id: `moment-${now}-${Math.random().toString(36).slice(2, 8)}`,
    content: publicMomentContent(draft.content, draft.authorName),
    mood: draft.mood,
    visibility: draft.visibility,
    decoration: draft.decoration,
    visibleCharacterIds: draft.visibility === 'selected' ? draft.visibleCharacterIds : [],
    images: draft.images.slice(0, 3),
    comments: (draft.comments || [])
      .filter((comment) => normalizeMomentContent(comment.authorName) && normalizeMomentContent(comment.content))
      .slice(0, 6),
    likes: [],
    createdAt: now,
    authorName: normalizeMomentContent(draft.authorName || '') || undefined,
    authorAvatar: normalizeMomentContent(draft.authorAvatar || '') || undefined,
    sourceCharacterId: normalizeMomentContent(draft.sourceCharacterId || '') || undefined,
  };
}

export type MomentSourceCharacter = {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  personality?: string;
  firstMessage?: string;
};

const generatedMoodCycle: MomentMood[] = ['daily', 'thoughts', 'happy', 'miss', 'showoff', 'low'];
const generatedDecorationCycle: MomentDecoration[] = ['plain', 'note', 'sunny', 'polaroid', 'night'];
const generatedEndings = [
  '顺手记一下，免得等会儿又忘了。',
  '今天先发到这里。',
  '路过的人应该会懂。',
  '朋友圈存档。',
  '晚点再慢慢说。',
];

export function generateCharacterMomentDrafts(
  characters: MomentSourceCharacter[],
  count = 3,
  now = Date.now(),
): MomentDraft[] {
  const pool = characters.filter((character) => normalizeMomentContent(character.name));
  if (pool.length === 0) return [];
  const startIndex = now % pool.length;
  const selected = Array.from(
    { length: Math.min(pool.length, Math.max(0, count)) },
    (_, index) => pool[(startIndex + index) % pool.length],
  );

  return selected
    .map((character, index) => {
      const source = publicMomentSource(character);
      const fallback = `${character.name}今天也在手机里留下一点生活痕迹。`;
      const seed = now + character.name.length + index;
      return {
        content: `${source || fallback}\n${generatedEndings[seed % generatedEndings.length]}`,
        mood: generatedMoodCycle[seed % generatedMoodCycle.length],
        visibility: 'public',
        decoration: generatedDecorationCycle[seed % generatedDecorationCycle.length],
        visibleCharacterIds: [],
        images: [],
        authorName: character.name,
        authorAvatar: character.avatar || '',
        sourceCharacterId: character.id,
      };
    });
}

export function generateCharacterMomentComments(
  characters: MomentSourceCharacter[],
  momentContent: string,
  excludedCharacterId?: string,
  count = 3,
  now = Date.now(),
): MomentComment[] {
  const pool = characters.filter((character) =>
    normalizeMomentContent(character.name) && character.id !== excludedCharacterId
  );
  if (pool.length === 0 || !normalizeMomentContent(momentContent)) return [];
  const startIndex = now % pool.length;
  const selected = Array.from(
    { length: Math.min(pool.length, Math.max(0, count)) },
    (_, index) => pool[(startIndex + index) % pool.length],
  );

  return selected.map((character, index) => createMomentComment(character, momentContent, index, now));
}

export function buildCharacterMomentProfile(character: MomentSourceCharacter): CharacterMomentProfile {
  const source = normalizeMomentContent([
    character.description,
    character.personality,
    character.firstMessage,
  ].filter(Boolean).join(' '));
  const signature = publicMomentSource(character) || `${character.name}的朋友圈`;
  return {
    id: character.id,
    name: character.name,
    avatar: character.avatar,
    signature,
    coverTone: getMomentCoverTone(source),
    friendNames: collectSettingFriendNames(source),
  };
}

export function generateSettingFriendComments(
  character: MomentSourceCharacter,
  momentContent: string,
  now = Date.now(),
): MomentComment[] {
  const profile = buildCharacterMomentProfile(character);
  if (profile.friendNames.length === 0 || !normalizeMomentContent(momentContent)) return [];
  const topic = compactMomentText(momentContent.replace(/\n+/g, ' '), 18);
  const templates = [
    topic ? `这条说的是“${topic}”吧，太像你会发的东西了。` : '这条太像你会发的东西了。',
    '看到了，等会儿当面细说。',
    '先赞一下，别又发完就消失。',
    '这张氛围很像今天。',
  ];
  return profile.friendNames.slice(0, 3).map((friendName, index) => ({
    id: `setting-comment-${now}-${character.id}-${index}`,
    authorName: friendName,
    authorAvatar: '',
    sourceCharacterId: `setting-friend-${character.id}-${index}`,
    content: templates[(now + index + friendName.length) % templates.length],
  }));
}

export function decorateMoments(moments: string[], metas: MomentMeta[]): DecoratedMoment[] {
  return moments.map((content, index) => {
    const meta = metas[index];
    return {
      id: meta?.id || `legacy-${index}`,
      content: publicMomentContent(content, meta?.authorName),
      mood: meta?.mood || 'daily',
      visibility: meta?.visibility || 'public',
      decoration: meta?.decoration || 'plain',
      visibleCharacterIds: meta?.visibleCharacterIds || [],
      images: meta?.images || [],
      comments: meta?.comments || [],
      likes: meta?.likes || [],
      createdAt: meta?.createdAt || 0,
      pinned: meta?.pinned,
      authorName: meta?.authorName,
      authorAvatar: meta?.authorAvatar,
      sourceCharacterId: meta?.sourceCharacterId,
      index,
    };
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.index - b.index);
}

export function getCharacterMomentFeed(moments: string[], metas: MomentMeta[], characterId: string) {
  return decorateMoments(moments, metas).filter((moment) => moment.sourceCharacterId === characterId);
}

export function removeMomentMetaAt(metas: MomentMeta[], index: number) {
  return removeWechatMomentAt(metas, index);
}

export function togglePinnedMoment(metas: MomentMeta[], index: number) {
  return metas.map((meta, itemIndex) => itemIndex === index ? { ...meta, pinned: !meta.pinned } : meta);
}

export function buildAutoMomentReplies(
  characters: MomentSourceCharacter[],
  momentContent: string,
  excludedCharacterId?: string,
  now = Date.now(),
) {
  return generateCharacterMomentComments(characters, momentContent, excludedCharacterId, 3, now);
}

export function appendMomentComment(meta: MomentMeta, draft: MomentCommentDraft, now = Date.now()): MomentMeta {
  const authorName = normalizeMomentContent(draft.authorName);
  const content = normalizeMomentContent(draft.content);
  if (!authorName || !content) return meta;
  const comment: MomentComment = {
    id: `comment-${now}-${draft.sourceCharacterId || draft.authorId || 'user'}`,
    authorName,
    authorAvatar: normalizeMomentContent(draft.authorAvatar || '') || undefined,
    sourceCharacterId: draft.sourceCharacterId || draft.authorId || 'user',
    content,
  };

  return {
    ...meta,
    comments: [...(meta.comments || []), comment].slice(-12),
  };
}

export function toggleMomentLike(meta: MomentMeta, actor: MomentLikeActor, now = Date.now()): MomentMeta {
  const authorId = normalizeMomentContent(actor.id);
  const authorName = normalizeMomentContent(actor.name);
  if (!authorId || !authorName) return meta;
  const currentLikes = meta.likes || [];
  if (currentLikes.some((like) => like.authorId === authorId && like.kind === actor.kind)) {
    return {
      ...meta,
      likes: currentLikes.filter((like) => !(like.authorId === authorId && like.kind === actor.kind)),
    };
  }

  return {
    ...meta,
    likes: [
      ...currentLikes,
      {
        id: `like-${now}-${actor.kind}-${authorId}`,
        authorId,
        authorName,
        authorAvatar: normalizeMomentContent(actor.avatar || '') || undefined,
        kind: actor.kind,
        createdAt: now,
      },
    ].slice(-20),
  };
}
