export type ChatPresetEntryRole = 'system' | 'user' | 'assistant';
export type ChatPresetReplyStyle = 'auto' | 'single' | 'burst';
export type ChatPresetVariant = 'narration-none' | 'narration-occasional';

export interface ChatPresetEntry {
  id: string;
  name: string;
  role: ChatPresetEntryRole;
  content: string;
  enabled: boolean;
  /** 只在对应的气泡模式下发送；未设置时始终发送。 */
  activeForReplyStyles?: ChatPresetReplyStyle[];
  /** 同组条目在编辑器里只允许开启一个。 */
  exclusiveGroup?: string;
  /** 给聊天运行时识别的行为开关，不依赖条目名称。 */
  variant?: ChatPresetVariant;
}

export type ChatPresetMessage = {
  role: ChatPresetEntryRole;
  content: string;
};

export type ChatPresetPlaceholderKind =
  | 'personaDescription'
  | 'charDescription'
  | 'charPersonality'
  | 'scenario'
  | 'worldInfoBefore'
  | 'worldInfoAfter'
  | 'dialogueExamples'
  | 'chatHistory';

export interface ChatPresetRuntimeContext {
  userName?: string;
  userProfilePrompt?: string;
  characterName?: string;
  characterDescription?: string;
  characterPersonality?: string;
  characterScenario?: string;
  worldInfoBefore?: string;
  worldInfoAfter?: string;
  dialogueExamples?: string;
  historyMessages?: ChatPresetMessage[];
  replyStyle?: ChatPresetReplyStyle;
}

export type ChatPresetPlaceholderCoverage = Record<ChatPresetPlaceholderKind, boolean>;

export const chatPresetPlaceholderLabels: Record<ChatPresetPlaceholderKind, string> = {
  personaDescription: '自动填入用户资料',
  charDescription: '自动填入角色描述',
  charPersonality: '自动填入角色性格',
  scenario: '自动填入角色场景',
  worldInfoBefore: '自动填入世界信息（前）',
  worldInfoAfter: '自动填入世界信息（后）',
  dialogueExamples: '自动填入聊天示例',
  chatHistory: '在此插入聊天历史',
};

const placeholderKinds = Object.keys(chatPresetPlaceholderLabels) as ChatPresetPlaceholderKind[];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRole(value: unknown): ChatPresetEntryRole {
  return value === 'user' || value === 'assistant' ? value : 'system';
}

function normalizeReplyStyles(value: unknown): ChatPresetReplyStyle[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const styles = value.filter((style): style is ChatPresetReplyStyle => style === 'auto' || style === 'single' || style === 'burst');
  return styles.length > 0 ? [...new Set(styles)] : undefined;
}

function normalizeVariant(value: unknown): ChatPresetVariant | undefined {
  return value === 'narration-none' || value === 'narration-occasional' ? value : undefined;
}

function normalizePlaceholderName(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

const placeholderNameAliases: Record<ChatPresetPlaceholderKind, string[]> = {
  personaDescription: ['用户设定描述', '用户描述', '用户资料', '人物用户设定'],
  charDescription: ['角色描述', '人物描述', '角色卡描述'],
  charPersonality: ['角色性格', '人物性格', '角色卡性格'],
  scenario: ['角色场景', '人物场景', '当前场景', '场景设定'],
  worldInfoBefore: ['世界信息前', '世界书前', '前置世界信息'],
  worldInfoAfter: ['世界信息后', '世界书后', '后置世界信息'],
  dialogueExamples: ['聊天示例', '对话示例', '示例对话'],
  chatHistory: ['聊天历史', '对话历史'],
};

export function getChatPresetPlaceholderKind(entry: Pick<ChatPresetEntry, 'id' | 'name'>): ChatPresetPlaceholderKind | null {
  const identifier = entry.id.trim().toLowerCase();
  const byIdentifier = placeholderKinds.find((kind) => kind.toLowerCase() === identifier);
  if (byIdentifier) return byIdentifier;
  const normalizedName = normalizePlaceholderName(entry.name);
  return placeholderKinds.find((kind) => placeholderNameAliases[kind].some((alias) => normalizePlaceholderName(alias) === normalizedName)) || null;
}

export function isChatPresetPinnedEntry(entry: Pick<ChatPresetEntry, 'id' | 'name'>) {
  return getChatPresetPlaceholderKind(entry) !== null;
}

export function moveChatPresetEntry(entries: ChatPresetEntry[], movingId: string, targetId: string) {
  const fromIndex = entries.findIndex((entry) => entry.id === movingId);
  const targetIndex = entries.findIndex((entry) => entry.id === targetId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return entries;
  const next = [...entries];
  const [moving] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moving);
  return next;
}

export function getChatPresetPlaceholderCoverage(entries: ChatPresetEntry[]): ChatPresetPlaceholderCoverage {
  const coverage = Object.fromEntries(placeholderKinds.map((kind) => [kind, false])) as ChatPresetPlaceholderCoverage;
  normalizeChatPresetEntries(entries).forEach((entry) => {
    if (!entry.enabled) return;
    const kind = getChatPresetPlaceholderKind(entry);
    if (kind) coverage[kind] = true;
  });
  return coverage;
}

export function normalizeChatPresetEntries(value: unknown): ChatPresetEntry[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  return value.slice(0, 500).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const fallbackId = `preset-entry-${index + 1}`;
    let id = String(candidate.id || candidate.identifier || fallbackId).trim() || fallbackId;
    if (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);
    return [{
      id,
      name: String(candidate.name || candidate.identifier || `条目 ${index + 1}`).trim() || `条目 ${index + 1}`,
      role: normalizeRole(candidate.role),
      content: typeof candidate.content === 'string' ? candidate.content : typeof candidate.prompt === 'string' ? candidate.prompt : '',
      enabled: candidate.enabled !== false,
      activeForReplyStyles: normalizeReplyStyles(candidate.activeForReplyStyles),
      exclusiveGroup: typeof candidate.exclusiveGroup === 'string' && candidate.exclusiveGroup.trim() ? candidate.exclusiveGroup.trim() : undefined,
      variant: normalizeVariant(candidate.variant),
    }];
  });
}

export function parseSillyTavernPresetEntries(data: UnknownRecord): ChatPresetEntry[] {
  if (!Array.isArray(data.prompts)) return [];
  const rawPrompts = data.prompts.filter(isRecord);
  const promptById = new Map(rawPrompts.map((prompt, index) => [
    String(prompt.identifier || prompt.id || `preset-entry-${index + 1}`),
    prompt,
  ]));
  const firstOrder = Array.isArray(data.prompt_order) ? data.prompt_order.find(isRecord) : undefined;
  const orderedItems = firstOrder && Array.isArray(firstOrder.order) ? firstOrder.order.filter(isRecord) : [];
  const orderedIds = new Set<string>();
  const orderedEntries = orderedItems.flatMap((item, index) => {
    const identifier = String(item.identifier || item.id || '').trim();
    const prompt = promptById.get(identifier);
    if (!prompt) return [];
    orderedIds.add(identifier);
    return [{
      id: identifier || `preset-entry-${index + 1}`,
      name: String(prompt.name || identifier || `条目 ${index + 1}`).trim() || `条目 ${index + 1}`,
      role: normalizeRole(prompt.role),
      content: typeof prompt.content === 'string' ? prompt.content : '',
      enabled: typeof item.enabled === 'boolean' ? item.enabled : prompt.enabled !== false,
    }];
  });
  const remainingEntries = rawPrompts.flatMap((prompt, index) => {
    const identifier = String(prompt.identifier || prompt.id || `preset-entry-${index + 1}`).trim();
    if (orderedIds.has(identifier)) return [];
    return [{
      id: identifier || `preset-entry-${index + 1}`,
      name: String(prompt.name || identifier || `条目 ${index + 1}`).trim() || `条目 ${index + 1}`,
      role: normalizeRole(prompt.role),
      content: typeof prompt.content === 'string' ? prompt.content : '',
      enabled: prompt.enabled !== false,
    }];
  });
  return normalizeChatPresetEntries([...orderedEntries, ...remainingEntries]);
}

function interpolatePresetMacros(content: string, context: ChatPresetRuntimeContext) {
  const replacements: Record<string, string> = {
    user: context.userName || '用户',
    char: context.characterName || '角色',
    persona: context.userProfilePrompt || '',
    personadescription: context.userProfilePrompt || '',
    description: context.characterDescription || '',
    chardescription: context.characterDescription || '',
    personality: context.characterPersonality || '',
    charpersonality: context.characterPersonality || '',
    scenario: context.characterScenario || '',
  };
  return content.replace(/{{\s*([a-zA-Z]+)\s*}}/g, (match, key: string) => {
    const replacement = replacements[key.toLowerCase()];
    return replacement === undefined ? match : replacement;
  });
}

function getPlaceholderContent(kind: Exclude<ChatPresetPlaceholderKind, 'chatHistory'>, context: ChatPresetRuntimeContext) {
  const contentByKind: Record<Exclude<ChatPresetPlaceholderKind, 'chatHistory'>, string | undefined> = {
    personaDescription: context.userProfilePrompt,
    charDescription: context.characterDescription,
    charPersonality: context.characterPersonality,
    scenario: context.characterScenario,
    worldInfoBefore: context.worldInfoBefore,
    worldInfoAfter: context.worldInfoAfter,
    dialogueExamples: context.dialogueExamples,
  };
  return contentByKind[kind] || '';
}

export function buildChatPresetMessages(entries: ChatPresetEntry[], context: ChatPresetRuntimeContext = {}): ChatPresetMessage[] {
  return normalizeChatPresetEntries(entries).flatMap((entry) => {
    if (!entry.enabled) return [];
    if (entry.activeForReplyStyles && context.replyStyle && !entry.activeForReplyStyles.includes(context.replyStyle)) return [];
    const kind = getChatPresetPlaceholderKind(entry);
    const staticContent = interpolatePresetMacros(entry.content.trim(), context).trim();
    if (kind === 'chatHistory') {
      const history = (context.historyMessages || [])
        .map((message) => ({ ...message, content: interpolatePresetMacros(message.content, context).trim() }))
        .filter((message) => message.content);
      return [
        ...(staticContent ? [{ role: entry.role, content: staticContent }] : []),
        ...history,
      ];
    }
    const runtimeContent = kind ? interpolatePresetMacros(getPlaceholderContent(kind, context), context).trim() : '';
    const content = [staticContent, runtimeContent].filter(Boolean).join('\n\n');
    if (!content) return [];
    // 酒馆的条目名称只是管理界面元数据，不能作为【名称】混入真正提示词。
    return [{ role: entry.role, content }];
  });
}

export function compileChatPresetEntries(entries: ChatPresetEntry[], context: ChatPresetRuntimeContext = {}) {
  return buildChatPresetMessages(entries, context).map((entry) => entry.content).join('\n\n');
}
