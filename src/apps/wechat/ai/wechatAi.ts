import { splitAssistantBubbles, type WeChatReplyStyle } from '../wechatChat';
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
  '[image prompt="窗边一杯热茶"] 表示主动发图；当用户在聊照片、风景、穿搭、礼物、梦境、场景氛围，或你想把此刻画面发给对方时可以低频使用。',
  '如果主动发图，一次回复最多 1 张，图片必须像聊天里角色真实想分享的视觉内容。',
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
}: {
  channel: 'wechat' | 'qq';
  characterPrompt: string;
  characterName: string;
  memberInstruction?: string;
  userProfilePrompt?: string;
  chatPresetPrompt: string;
  styleInstruction: string;
  isGroupChat?: boolean;
}) {
  const appName = channel === 'qq' ? 'QQ' : '微信';
  const fallback = `你是${characterName}，正在${appName}里自然聊天。`;
  const outputRule = isGroupChat
    ? `输出只写群成员要发送的${appName}消息，每行必须用「成员名：消息内容」格式。不要写旁白、编号、解释、<think> 标签或 reasoning。普通消息每条尽量不超过 30 个字，像真实${appName}群聊里几个人自然接话。生活动作单独一行并放在成员名前缀后。`
    : channel === 'qq'
      ? '输出只写要发送的QQ消息内容，不要写角色名、引号、旁白、编号。不要输出思考过程、分析、解释、<think> 标签或 reasoning。普通消息每条尽量不超过 30 个字，像熟人 QQ 私聊短消息。生活动作单独一行。'
      : '输出只写要发送的微信消息内容，不要写角色名、引号、旁白、编号。不要输出思考过程、分析、解释、<think> 标签或 reasoning。普通消息每条尽量不超过 30 个字，像真人微信短消息。生活动作单独一行。';

  return [
    characterPrompt || fallback,
    memberInstruction,
    userProfilePrompt,
    chatPresetPrompt,
    styleInstruction,
    weChatLifeActionInstruction,
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
      const content = message.content.replace(/\s+/g, ' ').trim();
      const clipped = content.length > 1200 ? `${content.slice(0, 1200)}...` : content;
      return `${index + 1}. ${message.role}\n${clipped}`;
    })
    .join('\n\n');
}

export function parseWeChatReplyParts(reply: string, style: WeChatReplyStyle, speakerName?: string): WeChatAiParsedPart[] {
  return parseWeChatAiReply(reply).flatMap<WeChatAiParsedPart>((part) => {
    if (part.kind !== 'text') return [part];
    return splitAssistantBubbles(part.content, style, speakerName).map((content) => ({ kind: 'text' as const, content }));
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
