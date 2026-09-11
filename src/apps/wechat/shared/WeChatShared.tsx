import { ChevronLeft, CircleUserRound, Users } from 'lucide-react';
import React from 'react';
import { cn } from '../../../lib/utils';
import type { Character, ChatMessage } from '../../../store';
import { useAppStore } from '../../../store';
import { compileChatPresetEntries, parseSillyTavernPresetEntries, type ChatPresetEntry } from '../presets/chatPresetEntries';
import {
  smallPhoneLongPresetEntries,
  smallPhonePresetEntries,
  smallPhonePresetNames,
  smallPhonePresetTuning,
  normalizeChatContextDepth,
} from '../presets/smallPhonePreset';

export function WeChatTopBar({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const { goBack } = useAppStore();

  return (
    <header className="wechat-topbar">
      <button type="button" onClick={onBack || goBack} className="wechat-icon-button" aria-label="返回">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1>{title}</h1>
      <div className="flex h-9 w-9 items-center justify-center">{right}</div>
    </header>
  );
}

export function WeChatAvatar({ src, name, large }: { src?: string | null; name: string; large?: boolean }) {
  return (
    <div className={cn('wechat-avatar', large && 'large')}>
      {src ? <img src={src} alt={name} /> : <CircleUserRound className="h-1/2 w-1/2 opacity-60" />}
    </div>
  );
}

export function WeChatGroupAvatar({ group, characters }: { group: { name: string; memberIds: string[] }; characters: Character[] }) {
  const members = group.memberIds
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character))
    .slice(0, 9);

  return (
    <div className="wechat-group-avatar">
      {members.length === 0
        ? <Users className="h-5 w-5" />
        : members.map((member) => (
            <span key={member.id}>
              {member.avatar ? <img src={member.avatar} alt={member.name} /> : <CircleUserRound className="h-4 w-4" />}
            </span>
          ))}
    </div>
  );
}

export function formatMessageTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '已撤回一条消息';
  const speaker = message.speakerId ? speakers.find((character) => character.id === message.speakerId)?.name : '';
  const prefix = forAi && speaker ? `${speaker}：` : '';
  if (message.kind === 'sticker') return forAi ? `表情包注释：${message.stickerLabel || '表情包'}` : '表情';
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return `${prefix}${message.transcript || message.content || '语音'}`;
  if (message.kind === 'call-note') return `${prefix}通话：${message.content}`;
  if (message.kind === 'transfer') return `${prefix}转账：${message.amount || message.content}${message.note ? `，${message.note}` : ''}`;
  if (message.kind === 'red-packet') return `${prefix}红包：${message.note || message.content || '恭喜发财，大吉大利'}`;
  if (message.kind === 'shopping') return `${prefix}购物：${message.itemName || message.content}${message.amount ? `，${message.amount}` : ''}`;
  return `${prefix}${message.content}`;
}

export type WeChatChatPreset = {
  name: string;
  temperature: number;
  contextDepth: number;
  maxTokens: number;
  replyStyle: 'auto' | 'single' | 'burst';
  prompt: string;
  entries?: ChatPresetEntry[];
};

export const wechatChatPresets: WeChatChatPreset[] = [
  {
    name: smallPhonePresetNames.short,
    ...smallPhonePresetTuning.short,
    prompt: compileChatPresetEntries(smallPhonePresetEntries, { replyStyle: 'burst' }),
    entries: smallPhonePresetEntries,
  },
  {
    name: smallPhonePresetNames.long,
    ...smallPhonePresetTuning.long,
    prompt: compileChatPresetEntries(smallPhoneLongPresetEntries, { replyStyle: 'single' }),
    entries: smallPhoneLongPresetEntries,
  },
];

export function parseSillyTavernPreset(data: Record<string, unknown>) {
  const entries = parseSillyTavernPresetEntries(data);

  return {
    name: String(data.name || data.preset_name || data.title || data.chat_completion_source || '导入预设'),
    prompt: compileChatPresetEntries(entries) || String(data.prompt || data.system_prompt || data.systemPrompt || data.jailbreak || data.main_prompt || ''),
    temperature: clampNumber(Number(data.temperature ?? data.temp ?? 0.8), 0.1, 1.6),
    contextDepth: normalizeChatContextDepth(Math.round(Number(data.max_context_messages ?? data.depth ?? data.context_depth ?? data.openai_max_context ?? 120) / (data.openai_max_context ? 1000 : 1)) || 120),
    maxTokens: clampNumber(Number(data.max_tokens ?? data.maxTokens ?? data.openai_max_tokens ?? data.response_length ?? 1200), 120, 4000),
    model: String(data.deepseek_model || data.openai_model || data.custom_model || data.claude_model || data.model || ''),
  };
}
