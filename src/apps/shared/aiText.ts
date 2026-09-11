import type { CalendarEvent, Character, ChatMessage, DiaryEntry, GalleryPhoto, MemoEntry } from '../../store';
import { useAppStore } from '../../store';
import { buildHttpErrorMessage, readHttpErrorDetail } from '../../lib/httpErrors';
import { runPaidTask } from '../../lib/paidTaskManager';
import { buildXiaohongshuContext } from '../xiaohongshu/xiaohongshuLogic';
import type { XiaohongshuNote } from '../xiaohongshu/types';

type ChatCompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type ChatPromptRoleMode = 'default' | 'system' | 'user';

type PrepareChatCompletionMessagesOptions = {
  now?: Date | number;
  promptRoleMode?: ChatPromptRoleMode;
  timeZone?: string;
};

export function buildChatCompletionRequestLogDetail({
  endpoint,
  model,
  messages,
  temperature,
  maxTokens,
  stream = false,
}: {
  endpoint: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature: number;
  maxTokens?: number;
  stream?: boolean;
}) {
  const orderedMessages = messages.map((message, index) => {
    const content = message.content || '';
    return [
      `#${String(index + 1).padStart(3, '0')} ${message.role.toUpperCase()} · ${content.length} 字`,
      content || '（空内容）',
    ].join('\n');
  }).join('\n\n────────────────────\n\n');
  return [
    '【请求信息】',
    `endpoint=${endpoint}`,
    `model=${model}`,
    `temperature=${temperature}`,
    `max_tokens=${maxTokens ?? '未设置'}`,
    `stream=${stream}`,
    `message_count=${messages.length}`,
    '',
    '【最终发送顺序与完整文本】',
    orderedMessages || '（没有消息）',
  ].join('\n');
}

export function normalizeOpenAiCompatibleBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed.replace(/\/chat\/completions$/i, '');
  if (/\/models$/i.test(trimmed)) return trimmed.replace(/\/models$/i, '');
  if (/\/(?:v\d+(?:beta)?(?:\/openai)?|openai)$/i.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

export function getChatCompletionEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${normalizeOpenAiCompatibleBaseUrl(trimmed)}/chat/completions`;
}

export function getModelListEndpoint(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/models$/i.test(trimmed)) return trimmed;
  return `${normalizeOpenAiCompatibleBaseUrl(trimmed)}/models`;
}

function resolveUserTimeZone(timeZone?: string) {
  const browserTimeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return '';
    }
  })();
  const candidate = (timeZone || browserTimeZone || 'Asia/Shanghai').trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return 'Asia/Shanghai';
  }
}

function getDayPeriod(hour: number) {
  if (hour >= 23) return '深夜';
  if (hour < 5) return '凌晨';
  if (hour < 7) return '清晨';
  if (hour < 11) return '上午';
  if (hour < 14) return '中午';
  if (hour < 18) return '下午';
  return '晚上';
}

function formatUtcOffset(now: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
    if (offset === 'GMT' || offset === 'UTC') return 'UTC+00:00';
    const match = offset.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match) return offset.replace('GMT', 'UTC');
    const [, sign, hour, minute = '00'] = match;
    return `UTC${sign}${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch {
    return 'UTC+00:00';
  }
}

function formatCurrentTimePrompt(now: Date | number = new Date(), timeZone?: string) {
  const date = now instanceof Date ? now : new Date(now);
  const resolvedTimeZone = resolveUserTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const hour = Number(getPart('hour'));
  const utcOffset = formatUtcOffset(date, resolvedTimeZone);
  return `当前用户所在地时间：${getPart('year')}年${getPart('month')}月${getPart('day')}日 ${getPart('hour')}:${getPart('minute')}（${getPart('weekday')}，${getDayPeriod(hour)}，时区 ${resolvedTimeZone}，${utcOffset}）。`;
}

function resolvePromptRoleMode(mode?: ChatPromptRoleMode): ChatPromptRoleMode {
  if (mode === 'default' || mode === 'system' || mode === 'user') return mode;
  const storeMode = useAppStore.getState().chatPromptRoleMode;
  return storeMode === 'default' || storeMode === 'system' || storeMode === 'user' ? storeMode : 'user';
}

export function prepareChatCompletionMessages(messages: ChatCompletionMessage[], options: PrepareChatCompletionMessagesOptions = {}): ChatCompletionMessage[] {
  const promptRoleMode = resolvePromptRoleMode(options.promptRoleMode);
  const timePrompt = formatCurrentTimePrompt(options.now, options.timeZone);
  let timeInjected = false;
  const prepared: ChatCompletionMessage[] = messages.map((message): ChatCompletionMessage => {
    const shouldInjectTime = !timeInjected && message.role === 'system';
    const content = shouldInjectTime
      ? `${timePrompt}\n\n${message.content}`
      : message.content;
    if (message.role === 'system') timeInjected = true;
    if (message.role !== 'system') return { ...message, content };
    if (promptRoleMode !== 'user') return { ...message, content };
    return {
      role: 'user',
      content: shouldInjectTime
        ? `${timePrompt}\n\nSystem settings:\n${message.content}`
        : `System settings:\n${message.content}`,
    };
  });
  if (!timeInjected) {
    return [{ role: 'user', content: timePrompt }, ...prepared];
  }
  return prepared;
}

export function extractAssistantContent(choice: unknown) {
  const candidate = choice as {
    message?: { content?: unknown };
    delta?: { content?: unknown };
    text?: unknown;
  } | null | undefined;
  const values: unknown[] = [
    candidate?.message?.content,
    candidate?.delta?.content,
    candidate?.text,
  ];
  const extractText = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join('');
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    return extractText(record.text ?? record.content ?? record.value);
  };
  return values.map(extractText).find((item) => item.trim().length > 0) || '';
}

function getFinishReason(choice: unknown) {
  if (!choice || typeof choice !== 'object') return '';
  const candidate = choice as { finish_reason?: unknown; finishReason?: unknown };
  const value = candidate.finish_reason ?? candidate.finishReason;
  return typeof value === 'string' ? value : '';
}

function isLengthFinishReason(reason: string) {
  return /^(?:length|max[_-]?tokens?|max[_-]?output[_-]?tokens?)$/i.test(reason.trim());
}

function buildLengthLimitNotice(maxTokens?: number) {
  if (typeof maxTokens === 'number' && maxTokens >= 4000) {
    return `（本次回复已用到当前最大输出长度 ${maxTokens} Token。若仍未写完，请缩短输入或预设，并让模型分段输出。）`;
  }
  const limitText = typeof maxTokens === 'number' ? `（本次上限 ${maxTokens} Token）` : '';
  return `（本次回复达到长度上限${limitText}，请在微信“我 → AI 设置”里调高“最大回复长度”后重试。）`;
}

function finalizeAssistantContent(choice: unknown, maxTokens?: number, includeLengthNotice = true) {
  const content = extractAssistantContent(choice).trim();
  const finishReason = getFinishReason(choice);
  if (!content) {
    const detail = finishReason ? `，停止原因：${finishReason}` : '';
    throw new Error(`AI 接口返回成功，但没有可显示的正文${detail}。请检查接口是否真正兼容 /chat/completions。`);
  }
  if (!includeLengthNotice || !isLengthFinishReason(finishReason)) return content;
  return `${content}\n\n${buildLengthLimitNotice(maxTokens)}`;
}

export async function requestChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  includeLengthNotice = true,
  onFinish,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature: number;
  maxTokens: number;
  includeLengthNotice?: boolean;
  onFinish?: (result: { finishReason: string; truncated: boolean }) => void;
}) {
  const endpoint = getChatCompletionEndpoint(baseUrl);
  const preparedMessages = prepareChatCompletionMessages(messages);
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的完整文本（最终顺序）',
    detail: buildChatCompletionRequestLogDetail({ endpoint, model, messages: preparedMessages, temperature, maxTokens }),
    preserveFullDetail: true,
  });
  return runPaidTask({
    kind: 'text-generation',
    key: `${endpoint}:${model}`,
    run: async (signal) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: preparedMessages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal,
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
      const choice = data?.choices?.[0];
      const content = finalizeAssistantContent(choice, maxTokens, includeLengthNotice);
      const finishReason = getFinishReason(choice);
      onFinish?.({ finishReason, truncated: isLengthFinishReason(finishReason) });
      useAppStore.getState().addAppLog?.({
        type: isLengthFinishReason(finishReason) ? 'error' : 'ai',
        title: isLengthFinishReason(finishReason) ? 'AI 回复达到长度上限' : 'AI 返回内容',
        detail: `${finishReason ? `finish_reason=${finishReason}\n` : ''}${content}`,
      });
      return content as string;
    },
  });
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
  const endpoint = getChatCompletionEndpoint(baseUrl);
  const preparedMessages = prepareChatCompletionMessages(messages);
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的完整文本（最终顺序）',
    detail: buildChatCompletionRequestLogDetail({ endpoint, model, messages: preparedMessages, temperature, maxTokens, stream: true }),
    preserveFullDetail: true,
  });
  return runPaidTask({
    kind: 'text-generation',
    key: `${endpoint}:${model}:stream`,
    run: async (signal) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: preparedMessages,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          stream: true,
        }),
        signal,
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
      if ((response.headers.get('content-type') || '').includes('application/json')) {
        const data = await response.json();
        const choice = data?.choices?.[0];
        const content = finalizeAssistantContent(choice, maxTokens);
        if (content) {
          onDelta?.(content);
          onToken?.(content);
        }
        return content;
      }
      if (!response.body) {
        throw new Error('AI 流式接口失败：响应体为空。');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let finishReason = '';
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
            const choice = data?.choices?.[0];
            const delta = extractAssistantContent(choice);
            finishReason = getFinishReason(choice) || finishReason;
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
      const finalContent = finalizeAssistantContent({ message: { content }, finish_reason: finishReason }, maxTokens);
      useAppStore.getState().addAppLog?.({
        type: isLengthFinishReason(finishReason) ? 'error' : 'ai',
        title: isLengthFinishReason(finishReason) ? 'AI 流式回复达到长度上限' : 'AI 流式返回内容',
        detail: `${finishReason ? `finish_reason=${finishReason}\n` : ''}${finalContent}`,
      });
      return finalContent;
    },
  });
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '这条消息已撤回';
  const speaker = message.speakerId ? speakers.find((item) => item.id === message.speakerId)?.name : '';
  const speakerPrefix = speaker ? `${speaker}：` : '';
  if (message.kind === 'image') {
    const label = message.stickerLabel || (!message.content?.startsWith('data:image') && !message.content?.startsWith('xiaophone://') ? message.content : '');
    return `${speakerPrefix}[图片] ${label || ''}`.trim();
  }
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

export function getCharacterScenario(character: Character) {
  if (typeof character.scenario === 'string') return character.scenario.trim();
  // 兼容旧版本：旧角色卡把 description、personality、scenario 合并存进了 systemPrompt。
  let remaining = character.systemPrompt?.trim() || '';
  for (const knownPart of [character.description, character.personality]) {
    const part = knownPart?.trim();
    if (!part) continue;
    if (remaining === part) return '';
    if (remaining.startsWith(`${part}\n`)) remaining = remaining.slice(part.length).trimStart();
  }
  return remaining;
}

export function getCharacterSupplementalSystemPrompt(character: Character) {
  // 新导入角色会单独保存 scenario；此时 systemPrompt 才是真正的额外系统规则。
  return typeof character.scenario === 'string' ? character.systemPrompt?.trim() || '' : '';
}

export function getCharacterPrompt(character: Character) {
  const scenario = getCharacterScenario(character);
  const supplementalSystemPrompt = getCharacterSupplementalSystemPrompt(character);
  return [
    `姓名：${character.name}`,
    character.description && `人设：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.firstMessage && `开场白：${character.firstMessage}`,
    scenario && `场景：${scenario}`,
    character.messageExamples && `聊天示例：\n${character.messageExamples}`,
    supplementalSystemPrompt && `系统提示：${supplementalSystemPrompt}`,
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
