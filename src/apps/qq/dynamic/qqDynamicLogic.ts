export interface QqDynamicCommentLike {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: number;
}

export interface QqDynamicPostLike {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  imageSource?: 'generated' | 'fallback' | 'upload';
  likes: string[];
  comments: QqDynamicCommentLike[];
  createdAt: number;
}

export interface QqDynamicPersonaCharacterLike {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  personality?: string;
  firstMessage?: string;
  imagePromptTags?: string;
}

const textImageBackgrounds = ['#dff0ff', '#efe5ff', '#fff4cc', '#dff7e6', '#ffe2ec'];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(value: string, maxLength: number) {
  const chars = Array.from(value.trim());
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < 5; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(''));
  }
  return lines.length ? lines : ['今天也在 QQ 空间留下了一点东西。'];
}

function compactText(value?: string, maxLength = 34) {
  const clean = value?.replace(/\s+/g, ' ').trim() || '';
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function firstAvailable(...values: Array<string | undefined>) {
  return values.map((value) => compactText(value)).find(Boolean) || '';
}

export function buildQqDynamicPost(post: Omit<QqDynamicPostLike, 'likes' | 'comments'> & Partial<Pick<QqDynamicPostLike, 'likes' | 'comments'>>) {
  return {
    ...post,
    content: post.content.trim(),
    likes: post.likes || [],
    comments: post.comments || [],
  };
}

export function buildPersonaQqDynamicDraft({
  character,
  createdAt = Date.now(),
}: {
  character: QqDynamicPersonaCharacterLike;
  createdAt?: number;
}): Omit<QqDynamicPostLike, 'id' | 'likes' | 'comments'> {
  const description = compactText(character.description, 32);
  const personality = compactText(character.personality, 32);
  const firstMessage = compactText(character.firstMessage, 32);
  const personaLine = firstAvailable(character.description, character.personality, character.firstMessage) || character.name;
  const content = [
    description ? `${description}。` : `${character.name}在空间冒个泡。`,
    personality ? `状态：${personality}。` : '',
    firstMessage ? `刚想起：“${firstMessage}”。` : '',
  ].filter(Boolean).join('');
  return {
    authorId: character.id,
    authorName: character.name,
    authorAvatar: character.avatar,
    content,
    imagePrompt: [
      character.name,
      personaLine,
      character.imagePromptTags,
      'QQ space casual mobile post cover',
    ].filter(Boolean).join(', '),
    imageSource: undefined,
    createdAt,
  };
}

export function sortQqDynamicPosts(posts: QqDynamicPostLike[]) {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

export function toggleQqDynamicLikeIds(likes: string[], userId: string) {
  return likes.includes(userId) ? likes.filter((id) => id !== userId) : [...likes, userId];
}

export function withQqDynamicComment(post: QqDynamicPostLike, comment: QqDynamicCommentLike): QqDynamicPostLike {
  return {
    ...post,
    comments: [...post.comments, { ...comment, content: comment.content.trim() }]
      .filter((item) => item.content)
      .sort((a, b) => a.createdAt - b.createdAt),
  };
}

export function formatQqDynamicTime(timestamp: number, now = Date.now()) {
  const diffMs = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  if (diffMs < minute) return '刚刚';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}分钟前`;
  if (diffMs < 24 * hour) return `${Math.floor(diffMs / hour)}小时前`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function buildQqDynamicTextImage({
  authorName,
  content,
  seed = 0,
}: {
  authorName: string;
  content: string;
  seed?: number;
}) {
  const background = textImageBackgrounds[Math.abs(seed) % textImageBackgrounds.length];
  const lines = wrapText(content, 14);
  const textRows = lines
    .map((line, index) => `<text x="34" y="${126 + index * 34}" font-size="22" font-weight="800">${escapeSvgText(line)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="540" viewBox="0 0 720 540">
<rect width="720" height="540" rx="38" fill="${background}"/>
<rect x="24" y="24" width="672" height="492" rx="28" fill="rgba(255,255,255,0.72)" stroke="#111" stroke-width="5"/>
<text x="34" y="76" font-size="24" font-weight="900" fill="#111">QQ空间</text>
<text x="34" y="108" font-size="15" font-weight="700" fill="#536072">${escapeSvgText(authorName || '我')} 发布了一张文字图片</text>
<g fill="#111">${textRows}</g>
<circle cx="650" cy="78" r="22" fill="#1296ff"/>
<path d="M640 78h20M650 68v20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
