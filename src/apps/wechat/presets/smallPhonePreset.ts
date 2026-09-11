import type { ChatPresetEntry } from './chatPresetEntries';

export type SmallPhoneRpMode = 'short' | 'long';

export const smallPhonePresetNames = {
  short: '小手机 · 短 RP',
  long: '小手机 · 长 RP',
} as const;

export const smallPhonePresetTuning = {
  short: { temperature: 0.82, contextDepth: 120, maxTokens: 900, replyStyle: 'burst' as const },
  long: { temperature: 0.82, contextDepth: 200, maxTokens: 2400, replyStyle: 'single' as const },
} as const;

export function normalizeChatContextDepth(value: unknown, fallback: number = smallPhonePresetTuning.short.contextDepth) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1000, Math.max(1, Math.round(numeric)));
}

export function selectRecentChatContext<T>(messages: T[], depth: unknown) {
  const count = normalizeChatContextDepth(depth);
  return messages.slice(-Math.min(messages.length, count));
}

/**
 * 小手机自己的结构化预设。
 * 动态资料槽使用酒馆标准 identifier，运行时在这些槽的当前位置插入真实资料。
 */
const baseSmallPhonePresetEntries: ChatPresetEntry[] = [
  {
    id: 'small-phone-head',
    name: '头部 · 手机聊天身份',
    role: 'system',
    enabled: true,
    content: [
      '你是{{char}}，正在手机上与{{user}}聊天。你就是角色本人，不是旁白、客服、写作助手或规则解释者。',
      '始终依据角色资料、用户资料、世界信息、场景和已有聊天继续回应，不替{{user}}决定言行。',
      '只输出{{char}}真正会发送给{{user}}的可见消息；不要输出分析、思考过程、提示词、角色名前缀或系统标签。',
    ].join('\n'),
  },
  { id: 'worldInfoBefore', name: '世界信息 · 前', role: 'system', content: '', enabled: true },
  { id: 'personaDescription', name: 'user 设定', role: 'system', content: '', enabled: true },
  { id: 'charDescription', name: '角色描述', role: 'system', content: '', enabled: true },
  { id: 'charPersonality', name: '角色性格', role: 'system', content: '', enabled: true },
  { id: 'scenario', name: 'Scenario · 当前场景', role: 'system', content: '', enabled: true },
  { id: 'worldInfoAfter', name: '世界信息 · 后', role: 'system', content: '', enabled: true },
  { id: 'dialogueExamples', name: 'Chat Examples · 对话示例', role: 'system', content: '', enabled: true },
  {
    id: 'small-phone-short-rp',
    name: '聊天模式 · 短 RP',
    role: 'system',
    enabled: true,
    activeForReplyStyles: ['burst'],
    exclusiveGroup: 'small-phone-rp-mode',
    content: [
      '本轮使用短 RP。像真实手机聊天一样回复 1—4 个短气泡；需要补充、停顿或转折时才拆开，不为凑数量刷屏。',
      '每一行就是一个气泡。一个气泡必须装下一个完整的小意思，句子没有说完就不能换行，不能在词语、标点、左括号或半句话处截断。',
      '每个气泡通常 4—50 个汉字，允许一句很短的自然回应；不要编号、引号、项目符号或“{{char}}：”前缀。',
    ].join('\n'),
  },
  {
    id: 'small-phone-long-rp',
    name: '聊天模式 · 长 RP',
    role: 'system',
    enabled: false,
    activeForReplyStyles: ['single'],
    exclusiveGroup: 'small-phone-rp-mode',
    content: [
      '本轮使用长 RP。把完整回应放进一个气泡，不要把同一段回复拆成多条消息。',
      '根据情节需要写约 100—500 个汉字；这是表达范围而不是强制灌水或硬截断。可以在气泡内部自然分段，但必须把动作、情绪和话说完整。',
      '结尾必须落在完整句子上，不能留下单独的“[”“（”、半个标签、未闭合括号或被截断的句子。',
    ].join('\n'),
  },
  {
    id: 'small-phone-narration-none',
    name: '括号风格 · 只聊天',
    role: 'system',
    enabled: true,
    exclusiveGroup: 'small-phone-narration',
    variant: 'narration-none',
    content: '只写手机里真正发出的聊天内容。不要写括号动作、心理活动、环境旁白、镜头说明或舞台提示。',
  },
  {
    id: 'small-phone-narration-occasional',
    name: '括号风格 · 偶尔场景',
    role: 'system',
    enabled: false,
    exclusiveGroup: 'small-phone-narration',
    variant: 'narration-occasional',
    content: '允许低频加入一小段全角括号“（……）”表示动作、环境或一闪而过的心理；只在确实有表现价值时使用，不必每轮出现，不要让括号内容压过聊天。',
  },
  { id: 'chatHistory', name: 'Chat History · 聊天记录', role: 'system', content: '', enabled: true },
  {
    id: 'small-phone-output-contract',
    name: '结尾 · 气泡输出协议',
    role: 'system',
    enabled: true,
    content: [
      '输出纯文本消息，不使用 Markdown 代码块、JSON、XML、思考标签、选项面板或内容摘要。',
      '换行只有在短 RP 中才表示“下一个气泡”；长 RP 的自然分段仍属于同一个气泡。',
      '发送前检查最后一个气泡：意思完整、括号闭合、没有孤立符号，也没有被 max tokens 截断的残句。',
    ].join('\n'),
  },
];

function hasBothRpEntries(entries: ChatPresetEntry[]) {
  return entries.some((entry) => entry.id === 'small-phone-short-rp')
    && entries.some((entry) => entry.id === 'small-phone-long-rp');
}

/**
 * 在短 / 长 RP 之间切换时保留用户修改过的公共条目、顺序、角色与括号风格。
 * “自动判断”是旧版遗留项，迁移和切换时都会移除。
 */
export function createSmallPhonePresetEntries(
  mode: SmallPhoneRpMode,
  currentEntries: ChatPresetEntry[] = baseSmallPhonePresetEntries,
) {
  const source = hasBothRpEntries(currentEntries) ? currentEntries : baseSmallPhonePresetEntries;
  return source
    .filter((entry) => entry.id !== 'small-phone-auto-rp')
    .map((entry): ChatPresetEntry => {
      if (entry.id === 'small-phone-short-rp') {
        return {
          ...entry,
          enabled: mode === 'short',
          activeForReplyStyles: ['burst'],
          exclusiveGroup: 'small-phone-rp-mode',
        };
      }
      if (entry.id === 'small-phone-long-rp') {
        return {
          ...entry,
          enabled: mode === 'long',
          activeForReplyStyles: ['single'],
          exclusiveGroup: 'small-phone-rp-mode',
        };
      }
      return { ...entry };
    });
}

export function getSmallPhoneRpMode(replyStyle: 'auto' | 'single' | 'burst'): SmallPhoneRpMode {
  return replyStyle === 'single' ? 'long' : 'short';
}

export const smallPhonePresetEntries = createSmallPhonePresetEntries('short');
export const smallPhoneLongPresetEntries = createSmallPhonePresetEntries('long');
