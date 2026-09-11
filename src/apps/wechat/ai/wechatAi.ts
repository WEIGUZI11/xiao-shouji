import { splitAssistantBubbles, type ChatBubbleChannel, type WeChatReplyStyle } from '../wechatChat';
import { parseWeChatAiReply, type WeChatAiParsedPart } from './wechatAiMessages';

export type ChatRequestPreviewMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatReplySpeakerLike = {
  id: string;
  name: string;
};

export const weChatLifeActionInstruction = [
  '你可以在很合适的时候低频主动使用生活动作，但不要每轮都用：',
  '[sticker mood=comfort] 表示发一个表情包，mood 可用 comfort、happy、shy、tease、sad、ok。',
  '[transfer amount=188 note=晚饭钱] 表示主动转账。',
  '[red-packet amount=52 note=买点甜的] 表示主动发红包。',
  '[shopping item=奶茶 amount=18 note=我下单了] 表示买了东西或下单。',
  '[image prompt="窗边一杯热茶"] 表示主动发图。只要聊天自然聊到照片、风景、穿搭、礼物、梦境、房间、路上、此刻氛围，或者你想把眼前画面发给对方看，就可以低频主动用。',
  '主动发图一次回复最多 1 张。prompt 写自然画面描述，不要写接口、模型、标签说明，也不要说“我将生成图片”。',
  '生活动作必须有真实动机，不能刷屏，不能像客服或系统通知。',
].join('\n');

export function buildChatSystemPrompt({
  channel,
  characterPrompt,
  characterName,
  memberInstruction,
  userProfilePrompt,
  chatPresetPrompt,
  styleInstruction,
  isGroupChat,
  replyStyle = 'auto',
  allowProactiveImage = true,
  structuredPresetActive = false,
  structuredIdentityActive = false,
  structuredReplyContractActive = false,
}: {
  channel: 'wechat' | 'qq';
  characterPrompt: string;
  characterName: string;
  memberInstruction?: string;
  userProfilePrompt?: string;
  chatPresetPrompt: string;
  styleInstruction: string;
  isGroupChat?: boolean;
  replyStyle?: WeChatReplyStyle;
  allowProactiveImage?: boolean;
  structuredPresetActive?: boolean;
  structuredIdentityActive?: boolean;
  structuredReplyContractActive?: boolean;
}) {
  const appName = channel === 'qq' ? 'QQ' : '微信';
  const fallback = `你是${characterName}，正在${appName}里自然聊天。`;
  const singleReply = !isGroupChat && replyStyle === 'single';
  const burstReply = !isGroupChat && replyStyle === 'burst';
  const outputRule = isGroupChat
    ? `输出只写群成员要发送的${appName}消息，每行必须用「成员名：消息内容」格式。不要写旁白、编号、解释、<think> 标签或 reasoning。普通消息每条尽量不超过 30 个字，像真实${appName}群聊里几个人自然接话。生活动作单独一行并放在成员名前缀后。`
    : structuredReplyContractActive
      ? `这是${appName}应用层输出协议：只发送可见消息或受支持的生活动作，不输出分析、思考过程、<think> 标签、reasoning、角色名前缀或规则说明。短/长 RP、气泡数量和括号风格完全服从后续预设条目。`
    : singleReply
      ? `使用长 RP，只输出一条完整的${appName}消息，不要写角色名、引号、编号或解释。不要输出思考过程、分析、<think> 标签或 reasoning。内容较长时允许在同一条消息内自然分段，不要拆成多条气泡。生活动作单独一行。`
      : burstReply
        ? `使用短 RP，只输出要发送的${appName}消息内容，不要写角色名、引号、旁白、编号或解释。不要输出思考过程、分析、<think> 标签或 reasoning。根据语境回复一到四条自然短消息，每条单独一行。生活动作单独一行。`
        : `根据情境在短 RP 和长 RP 之间自然选择，只输出要发送的${appName}消息内容，不要写角色名、引号、编号或解释。不要输出思考过程、分析、<think> 标签或 reasoning。短 RP 每条单独一行；长 RP 保持一条完整消息。括号动作或心理描写只能低频偶尔出现。生活动作单独一行。`;
  const lifeActionInstruction = allowProactiveImage
    ? weChatLifeActionInstruction
    : weChatLifeActionInstruction
        .split('\n')
        .filter((line) => !line.includes('[image prompt=') && !line.startsWith('主动发图一次回复'))
        .concat('当前主动生图已关闭，不要输出 [image] 动作。')
        .join('\n');

  return [
    structuredIdentityActive ? '' : characterPrompt || fallback,
    memberInstruction,
    userProfilePrompt,
    structuredPresetActive ? '' : chatPresetPrompt,
    structuredReplyContractActive ? '' : styleInstruction,
    lifeActionInstruction,
    outputRule,
  ].filter(Boolean).join('\n');
}

export function buildWeChatSystemPrompt(args: Omit<Parameters<typeof buildChatSystemPrompt>[0], 'channel'>) {
  return buildChatSystemPrompt({ ...args, channel: 'wechat' });
}

export function getWeChatApiConnectionIssue({
  apiBaseUrl,
  selectedModel,
}: {
  apiBaseUrl?: string;
  selectedModel?: string;
}) {
  const missing = [
    !apiBaseUrl?.trim() ? '接口地址' : '',
    !selectedModel?.trim() ? '模型' : '',
  ].filter(Boolean);
  if (missing.length === 0) return '';
  return `聊天 API 未连接：请先在设置里填写${missing.join('和')}。`;
}

export function buildChatRequestPreview(messages: ChatRequestPreviewMessage[]) {
  return messages
    .map((message, index) => {
      const content = message.content.trim();
      return `#${String(index + 1).padStart(3, '0')} ${message.role.toUpperCase()} · ${content.length} 字\n${content || '（空内容）'}`;
    })
    .join('\n\n────────────────────\n\n');
}

export function parseWeChatReplyParts(
  reply: string,
  style: WeChatReplyStyle,
  speakerName?: string,
  channel: ChatBubbleChannel = 'wechat',
  isGroupChat = false,
): WeChatAiParsedPart[] {
  const parsed = parseWeChatAiReply(reply);
  const normalized = style === 'single' && !isGroupChat
    ? parsed.reduce<WeChatAiParsedPart[]>((parts, part) => {
        const previous = parts[parts.length - 1];
        if (part.kind === 'text' && previous?.kind === 'text') {
          previous.content = `${previous.content}\n${part.content}`;
        } else {
          parts.push({ ...part });
        }
        return parts;
      }, [])
    : parsed;
  return normalized.flatMap<WeChatAiParsedPart>((part) => {
    if (part.kind !== 'text') return [part];
    return splitAssistantBubbles(part.content, style, speakerName, channel).map((content) => ({ kind: 'text' as const, content }));
  });
}

function escapeSpeakerName(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resolveGroupReplyPartSpeaker<TSpeaker extends ChatReplySpeakerLike>(
  part: WeChatAiParsedPart,
  fallbackSpeaker: TSpeaker,
  speakers: TSpeaker[],
): { part: WeChatAiParsedPart; speaker: TSpeaker } {
  if (part.kind !== 'text') return { part, speaker: fallbackSpeaker };

  for (const speaker of speakers) {
    const pattern = new RegExp(`^${escapeSpeakerName(speaker.name)}\\s*[:：]\\s*`);
    if (!pattern.test(part.content)) continue;
    return {
      speaker,
      part: {
        ...part,
        content: part.content.replace(pattern, '').trim() || part.content,
      },
    };
  }

  return { part, speaker: fallbackSpeaker };
}
