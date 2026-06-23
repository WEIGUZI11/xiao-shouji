import type { CalendarEvent, Character, ChatMessage, DiaryEntry, GalleryPhoto, MemoEntry } from '../../store';
import { useAppStore } from '../../store';
import { buildHttpErrorMessage, readHttpErrorDetail } from '../../lib/httpErrors';
import { buildXiaohongshuContext } from '../xiaohongshu/xiaohongshuLogic';
import type { XiaohongshuNote } from '../xiaohongshu/types';

type ChatCompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export async function requestChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的消息',
    detail: JSON.stringify({ endpoint, model, messages, temperature, maxTokens }, null, 2),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const message = buildHttpErrorMessage('AI 接口失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    });
    useAppStore.getState().addAppLog?.({ type: 'error', title: 'AI 接口失败', detail: `${endpoint}\n${message}` });
    throw new Error(message);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  useAppStore.getState().addAppLog?.({ type: 'ai', title: 'AI 返回内容', detail: content });
  return content as string;
}

export async function requestChatCompletionStream({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  onDelta,
  onToken,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature: number;
  maxTokens?: number;
  onDelta?: (delta: string) => void;
  onToken?: (token: string) => void;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的消息',
    detail: JSON.stringify({ endpoint, model, messages, temperature, maxTokens, stream: true }, null, 2),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      stream: true,
    }),
  });
  if (!response.ok) {
    const message = buildHttpErrorMessage('AI 流式接口失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    });
    useAppStore.getState().addAppLog?.({ type: 'error', title: 'AI 流式接口失败', detail: `${endpoint}\n${message}` });
    throw new Error(message);
  }
  if (!response.body) {
    throw new Error('AI 流式接口失败：响应体为空。');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const data = JSON.parse(payload);
        const delta = data?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          content += delta;
          onDelta?.(delta);
          onToken?.(delta);
        }
      } catch {
        // Ignore malformed SSE chunks from compatible endpoints.
      }
    }
  }
  useAppStore.getState().addAppLog?.({ type: 'ai', title: 'AI 流式返回内容', detail: content });
  return content;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '这条消息已撤回';
  const speaker = message.speakerId ? speakers.find((item) => item.id === message.speakerId)?.name : '';
  const speakerPrefix = speaker ? `${speaker}：` : '';
  if (message.kind === 'image') return `${speakerPrefix}[图片] ${message.content || ''}`.trim();
  if (message.kind === 'voice') return `${speakerPrefix}[语音] ${message.transcript || message.content || ''}`.trim();
  if (message.kind === 'sticker') return `${speakerPrefix}[表情] ${message.stickerLabel || message.content || ''}`.trim();
  if (message.kind === 'transfer') return `${speakerPrefix}[转账] ${message.amount || ''} ${message.note || ''}`.trim();
  if (message.kind === 'red-packet') return `${speakerPrefix}[红包] ${message.amount || ''} ${message.note || ''}`.trim();
  if (message.kind === 'shopping') return `${speakerPrefix}[购物] ${message.itemName || message.content || ''}`.trim();
  if (forAi) return `${speakerPrefix}${message.content || ''}`.trim();
  return `${speakerPrefix}${message.content || ''}`.trim();
}

export function stringifyForPrompt(value: unknown, maxLength = 6000) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

export function getCharacterPrompt(character: Character) {
  return [
    `姓名：${character.name}`,
    character.description && `人设：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.firstMessage && `开场白：${character.firstMessage}`,
    character.systemPrompt && `系统提示：${character.systemPrompt}`,
    character.worldBook && `世界书：\n${stringifyForPrompt(character.worldBook)}`,
  ].filter(Boolean).join('\n');
}

export function buildMemoWorldContext({
  characters,
  chatSessions,
  wechatMoments,
  purchaseRecords,
  diaries,
  calendarEvents,
  galleryPhotos,
  memos,
  xiaohongshuNotes,
  characterId,
}: {
  characters: Character[];
  chatSessions: Record<string, { characterId: string; messages: ChatMessage[] }>;
  wechatMoments: string[];
  purchaseRecords: Array<{ itemName: string; amount: string; note: string }>;
  diaries: DiaryEntry[];
  calendarEvents: CalendarEvent[];
  galleryPhotos: GalleryPhoto[];
  memos: MemoEntry[];
  xiaohongshuNotes: XiaohongshuNote[];
  characterId?: string;
}) {
  const character = characters.find((item) => item.id === characterId);
  const relatedSessions = Object.values(chatSessions)
    .filter((session) => !character || session.characterId === character.id)
    .slice(-8);
  const chatContext = relatedSessions
    .flatMap((session) => session.messages.slice(-10).map((message) => `${message.role === 'user' ? '用户' : character?.name || 'char'}：${describeChatMessage(message, true, characters)}`))
    .join('\n');
  const moments = wechatMoments.slice(0, 8).map((moment) => `朋友圈：${moment}`).join('\n');
  const orders = purchaseRecords.slice(0, 6).map((record) => `订单：${record.itemName} ${record.amount} ${record.note}`).join('\n');
  const diaryContext = diaries
    .slice(-8)
    .map((entry) => `${entry.owner === 'char' ? 'char日记' : '用户日记'}《${entry.title}》：${entry.content}`)
    .join('\n');
  const calendarContext = calendarEvents
    .slice(0, 6)
    .map((event) => `日历：${event.title}${event.note ? `：${event.note}` : ''}`)
    .join('\n');
  const photoContext = galleryPhotos
    .slice(0, 5)
    .map((photo) => `相册：${photo.title}：${photo.description || photo.note || photo.tags.join('、')}`)
    .join('\n');
  const memoContext = memos
    .filter((memo) => !memo.locked)
    .slice(-8)
    .map((memo) => `备忘《${memo.title}》：${memo.content}`)
    .join('\n');
  const xiaohongshuContext = xiaohongshuNotes.length > 0 ? buildXiaohongshuContext(xiaohongshuNotes, 8) : '';
  return [
    chatContext && `最近聊天\n${chatContext}`,
    moments && `朋友圈\n${moments}`,
    xiaohongshuContext,
    diaryContext && `最近日记\n${diaryContext}`,
    calendarContext && `最近日历\n${calendarContext}`,
    photoContext && `最近相册\n${photoContext}`,
    orders && `最近订单\n${orders}`,
    memoContext && `已有备忘\n${memoContext}`,
  ].filter(Boolean).join('\n\n') || '当前没有太多最近记录，请写一条符合角色世界观的短备忘。';
}
