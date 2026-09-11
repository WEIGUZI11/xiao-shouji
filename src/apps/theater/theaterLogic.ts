export type TheaterStyleKey = 'daily' | 'romance' | 'conflict' | 'dream' | 'suspense' | 'random';
export type TheaterLengthKey = 'short' | 'medium' | 'long' | 'custom';

export interface TheaterWorldBookLike {
  id: string;
  comment: string;
  content: string;
  enabled: boolean;
  selected: boolean;
  order?: number;
  probability?: number;
  keys: string[];
  importedAt?: number;
  updatedAt?: number;
}

export interface TheaterTopicDraft {
  id?: string;
  title: string;
  content: string;
  category: string;
  favorite?: boolean;
}

export const theaterStyleLabels: Record<TheaterStyleKey, string> = {
  daily: '日常',
  romance: '暧昧',
  conflict: '吵架',
  dream: '梦境',
  suspense: '悬疑',
  random: '随机',
};

export const theaterLengthLabels: Record<TheaterLengthKey, string> = {
  short: '短 200-600 字',
  medium: '中 400-800 字',
  long: '长 800-1500 字',
  custom: '自由设置',
};

export function getRandomBlocks(content: string) {
  const blocks: string[] = [];
  const pattern = /\{\{random:([\s\S]*?)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    blocks.push(match[1].trim().replace(/^\[/, '').replace(/\]$/, ''));
  }
  return blocks;
}

export function splitRandomOptions(block: string) {
  return block
    .split(/[,，、\n]+/)
    .map((item) => item.replace(/^[\s\-[\]]+|[\s\-[\]]+$/g, '').trim())
    .filter(Boolean);
}

function pickRandomOption(options: string[], picker: () => number) {
  if (options.length === 0) return '';
  const rawIndex = Math.floor(picker() * options.length);
  const index = Math.min(Math.max(rawIndex, 0), options.length - 1);
  return options[index];
}

export function resolveTavernRandom(content: string, picker: () => number = Math.random) {
  return content.replace(/\{\{random:([\s\S]*?)\}\}/g, (_match, rawBlock: string) => {
    const options = splitRandomOptions(rawBlock.trim().replace(/^\[/, '').replace(/\]$/, ''));
    return pickRandomOption(options, picker) || rawBlock;
  });
}

export function rollWorldBookEntries(entries: TheaterWorldBookLike[], picker: () => number = Math.random) {
  return entries
    .filter((entry) => entry.enabled && entry.selected && entry.content.trim())
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.comment.localeCompare(b.comment, 'zh-Hans-CN'))
    .flatMap((entry) => {
      const probability = typeof entry.probability === 'number' ? entry.probability : 100;
      if (probability < 100 && picker() * 100 > probability) return [];
      const resolved = resolveTavernRandom(entry.content, picker).trim();
      if (!resolved) return [];
      return [`【${entry.comment}】\n${resolved.slice(0, 1200)}`];
    });
}

export function buildTheaterLengthInstruction(length: TheaterLengthKey, customLengthText = '') {
  if (length === 'short') return '请生成约 200 到 600 字左右的小剧场。';
  if (length === 'medium') return '请生成约 400 到 800 字左右的小剧场。';
  if (length === 'long') return '请生成约 800 到 1500 字左右的小剧场。';
  return `请生成约 ${parseTheaterWordCount(customLengthText)} 字左右的小剧场。`;
}

export function parseTheaterWordCount(text: string) {
  const normalized = text.trim().replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10)).replace(/，/g, ',');
  const match = normalized.match(/^(?:约\s*)?([1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)\s*字?$/);
  const words = match ? Number(match[1].replace(/,/g, '')) : NaN;
  if (!Number.isSafeInteger(words) || words <= 0 || !Number.isSafeInteger(Math.ceil(words * 2.5) + 1024)) {
    throw new Error('请输入有效的正整数字数，例如 1200 或 4,000；不会用默认字数替代。');
  }
  return words;
}

export function getTheaterMaxTokens(length: TheaterLengthKey, customLengthText = '') {
  const words = length === 'custom' ? parseTheaterWordCount(customLengthText) : { short: 600, medium: 800, long: 1500 }[length];
  // Tokens are not Chinese characters. Leave headroom without silently capping long requests.
  return Math.ceil(words * 2.5) + 1024;
}

export function buildTheaterOutputRule(length: TheaterLengthKey, customLengthText: string) {
  return `${buildTheaterLengthInstruction(length, customLengthText)}\n以本次玩家选择的字数为准，不沿用预设中的固定字数；续写时此字数只计算新增正文。接到被截断的句子时先补完，不重复已有正文。`;
}

export function appendTheaterContinuation(previous: string, next: string) {
  // Remove only the legacy client-generated limit notice, never the saved story itself.
  const body = previous.trim().replace(/\n\n（本次回复(?:已用到当前最大输出长度|达到长度上限)[^]*?）\s*$/, '');
  return body + (/[。！？.!?…”」』]$/.test(body) ? '\n\n' : '') + next.trim();
}

export function buildTheaterChatMessage(theme: string, content: string) {
  return `【小剧场】${theme || '剧情片段'}\n${content.trim()}`;
}

export function buildTheaterResultStatus(content: string, length: TheaterLengthKey, customLengthText: string, truncated: boolean) {
  const count = Array.from(content.replace(/\s/g, '')).length;
  const minimum = length === 'custom' ? parseTheaterWordCount(customLengthText) : { short: 200, medium: 400, long: 800 }[length];
  const detail = truncated ? '模型输出达到上限' : count < minimum ? `尚未达到目标 ${minimum} 字` : '已收到正文';
  return `本次 ${count} 字符（不含空白），${detail}，已保存。可点击“继续写”追加，不会覆盖原文。`;
}

export function buildTheaterUserPrompt(input: {
  theme: string;
  length: TheaterLengthKey;
  customLengthText: string;
  actorNames: string[];
  rollResult: string;
}) {
  return [
    '请写成一个完整故事，不要只写片段或设定摘要。故事需要有清楚的开端、推进、转折和收束。',
    input.theme.trim() && `主题：${input.theme.trim()}`,
    buildTheaterLengthInstruction(input.length, input.customLengthText),
    `角色：${input.actorNames.join('、') || '未指定'}`,
    input.rollResult.trim() && `本次世界书随机结果：\n${input.rollResult.trim()}`,
  ].filter(Boolean).join('\n\n');
}

export function buildTheaterContinuationPrompt(input: {
  previousContent: string;
  theme: string;
  length: TheaterLengthKey;
  customLengthText: string;
  actorNames: string[];
  rollResult: string;
}) {
  return [
    '请从已有小剧场的最后一句自然续写后续。不要重写、复述或总结已有正文，也不要突然重置人物关系和时间线。',
    '续写部分本身要有新的推进、转折和阶段性收束，只输出新增正文，不要附加解释。',
    input.theme.trim() && `原主题：${input.theme.trim()}`,
    buildTheaterLengthInstruction(input.length, input.customLengthText).replace('小剧场', '后续'),
    `角色：${input.actorNames.join('、') || '未指定'}`,
    input.rollResult.trim() && `沿用的世界书结果：\n${input.rollResult.trim()}`,
    `已有正文：\n${input.previousContent.trim().slice(-12000)}`,
  ].filter(Boolean).join('\n\n');
}

export function buildTheaterSystemPrompt(characterContext: string) {
  return [
    '你是手机里的“小剧场”编剧。输出沉浸式中文完整故事，只写正文，不要解释。',
    '必须写成一个从开端、推进、转折到收束都完整的故事，不要只给片段、梗概、设定集或未完成桥段。',
    '可以保留“标题 / 出场 / 剧情 / 收束”的结构，但每一段都要服务于完整剧情。对白要自然，心理和动作描写要让人物关系推进。',
    characterContext,
  ].filter(Boolean).join('\n\n');
}

function topicTitleFromContent(content: string) {
  const clean = content.replace(/\{\{random:([\s\S]*?)\}\}/g, '随机主题').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 24) || '未命名主题';
}

function normalizeTopicDraft(raw: unknown, fallbackCategory: string): TheaterTopicDraft | null {
  if (typeof raw === 'string') {
    const content = raw.trim();
    if (!content) return null;
    return { title: topicTitleFromContent(content), content, category: fallbackCategory };
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const content = String(item.content || item.text || item.prompt || item.theme || '').trim();
  if (!content) return null;
  const category = String(item.category || item.circle || item.group || fallbackCategory).trim() || fallbackCategory;
  return {
    id: item.id ? String(item.id) : undefined,
    title: String(item.title || item.name || topicTitleFromContent(content)).trim(),
    content,
    category,
    favorite: Boolean(item.favorite),
  };
}

export function parseTheaterTopicImport(text: string, fallbackCategory = '默认') {
  const clean = text.trim();
  if (!clean) return [];
  try {
    const data = JSON.parse(clean) as unknown;
    if (Array.isArray(data)) return data.map((item) => normalizeTopicDraft(item, fallbackCategory)).filter(Boolean) as TheaterTopicDraft[];
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const category = String(record.category || fallbackCategory).trim() || fallbackCategory;
      const source = Array.isArray(record.topics)
        ? record.topics
        : Array.isArray(record.entries)
          ? record.entries
          : Object.values(record.topics || record.entries || {});
      if (Array.isArray(source)) return source.map((item) => normalizeTopicDraft(item, category)).filter(Boolean) as TheaterTopicDraft[];
    }
  } catch {
    // Plain text imports are handled below.
  }
  return clean
    .split(/\r?\n+/)
    .map((line) => normalizeTopicDraft(line, fallbackCategory))
    .filter(Boolean) as TheaterTopicDraft[];
}

export function parseWorldBookJson(text: string) {
  const data = JSON.parse(text) as { entries?: Record<string, Record<string, unknown>> | Array<Record<string, unknown>>; name?: string };
  const rawEntries: Array<Record<string, unknown>> = Array.isArray(data.entries)
    ? data.entries
    : Object.entries(data.entries || {}).map(([id, entry]) => ({ ...entry, id }));
  return rawEntries
    .filter((entry) => typeof entry.content === 'string' && entry.content.trim())
    .map((entry, index) => {
      const extensions = entry.extensions && typeof entry.extensions === 'object' ? entry.extensions as Record<string, unknown> : {};
      const rawKeys = Array.isArray(entry.key) ? entry.key : Array.isArray(entry.keys) ? entry.keys : [];
      const disabled = entry.disable === true || entry.enabled === false;
      return {
        id: String(entry.uid || entry.id || ''),
        comment: String(entry.comment || entry.name || `${data.name || '世界书'} ${index + 1}`),
        content: String(entry.content),
        enabled: !disabled,
        selected: !disabled,
        order: Number(entry.order ?? entry.insertion_order ?? extensions.display_index ?? index),
        position: typeof entry.position === 'string' || typeof entry.position === 'number' ? entry.position : undefined,
        probability: Number(entry.probability ?? extensions.probability ?? 100),
        keys: rawKeys.map((key) => String(key)),
        category: String(data.name || '玩家导入'),
        source: 'imported' as const,
      };
    });
}
