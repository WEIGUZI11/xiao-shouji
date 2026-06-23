/**
 * Small phone app shell and current production UI.
 * Main functions/components: App, AppErrorBoundary, Desktop,
 * ChatScreen, Bubble, repairMojibake,
 * fetchModelList, requestChatCompletion, describeChatMessage, getCharacterPrompt,
 * delay, formatMessageTime, clampNumber,
 * CalendarScreen, ContactsScreen, SettingsScreen, ThemesScreen, VideoCallScreen.
 * State dependencies: useAppStore from src/store.ts; Character/Screen/CalendarEvent/GalleryPhoto types.
 * Utility dependencies: Desktop/FeatureRouter/LockScreen/NotificationCenter from src/shell/, speakWithConfiguredTts from src/tts.ts, parseCharacterCard from src/lib/charaParser.ts, cn/createId from src/lib/utils.ts.
 * Styling dependencies: src/index.css owns base shell styles; full new theme visuals live in src/themes/.
 * Maintenance note: this file is still the active shell entry; feature screens live under src/apps/ and are routed by FeatureRouter.
 */
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  FileText,
  ImagePlus,
  Import,
  MessageCircle,
  Pause,
  Phone,
  RefreshCw,
  Send,
  Shield,
  ShoppingBag,
  SmilePlus,
  Undo2,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { parseCharacterCard } from './lib/charaParser';
import { buildHttpErrorMessage, readHttpErrorDetail } from './lib/httpErrors';
import { speakWithConfiguredTts } from './tts';
import { BrowserSearchResult, CalendarEvent, Character, ChatMessage, DiaryEntry, GalleryPhoto, MemoEntry, MemoEntryColor, MemoEntryType, MusicPlaylist, MusicTrack, Screen, StickerItem, TheaterScene, TheaterWorldBookEntry, useAppStore } from './store';
import { cn, createId } from './lib/utils';
import { buildRuntimeErrorLog } from './lib/runtimeErrorLog';
import { ChatScreen } from './apps/wechat/chat/ChatScreen';
import { buildXiaohongshuContext } from './apps/xiaohongshu/xiaohongshuLogic';
import type { XiaohongshuNote } from './apps/xiaohongshu/types';
import { Desktop } from './shell/Desktop';
import { FeatureRouter } from './shell/FeatureRouter';
import { GlobalMusicAudio } from './shell/GlobalMusicAudio';
import { LockScreen } from './shell/LockScreen';
import { NotificationCenter } from './shell/NotificationCenter';
import { buildShellNotifications, getShellNotificationBadges, type ShellNotification } from './shell/notifications';
import { buildWeChatSystemPrompt, parseWeChatReplyParts } from './apps/wechat/ai/wechatAi';
import type { WeChatAiParsedPart } from './apps/wechat/ai/wechatAiMessages';
import { buildDueProactiveReminderWrites, buildRandomProactiveMessageWrites } from './apps/active-events/activeEventsLogic';
import {
  ackBackendProactiveReminderOutbox,
  buildReminderMessageFromOutbox,
  fetchBackendProactiveReminderOutbox,
  getProactiveReminderClientId,
  installNativePushTokenBridge,
} from './apps/active-events/proactiveReminderClient';
import { WeChatChats } from './apps/wechat/chats/WeChatChats';
import { WeChatContacts } from './apps/wechat/contacts/WeChatContacts';
import { WeChatDiscover } from './apps/wechat/discover/WeChatDiscover';
import { WeChatMe } from './apps/wechat/me/WeChatMe';
import { WeChatAvatar } from './apps/wechat/shared/WeChatShared';

const presetCards = [
  ['手机沉浸破限预设', '允许模拟微信、QQ、电话、日记、查手机等手机行为。'],
  ['日常陪伴', '适合语音条、聊天、朋友圈评论、生活琐事。'],
  ['剧情推进', '适合小剧场、偷窥 char、隐藏相册、搜索记录。'],
  ['强沉浸通话', '电话/视频通话时强调画面、停顿、环境声。'],
];

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const defaultDiscordClientId = viteEnv.VITE_DISCORD_CLIENT_ID || '1502353063975981227';
const defaultCommunityAuthUrl = 'https://discord.com/oauth2/authorize';
const defaultCommunityInvites = [
  { name: '类脑ΟΔΥΣΣΕΙΑ', url: 'https://discord.gg/odysseia' },
  { name: '旅程ΟΡΙΖΟΝΤΑΣ', url: 'https://discord.gg/NSqeHSK2J' },
  { name: '世界树ᚢᚴᚴᛏᚱᛅᛋᛁᛚ', url: 'https://discord.gg/4GtJfrSNU' },
];
const defaultCommunityBackdoorApiUrl = viteEnv.VITE_COMMUNITY_BACKDOOR_API_URL || 'https://small-phone-auth-backend.vercel.app';

function speak(text: string) {
  const { ttsConfig, addAppLog } = useAppStore.getState();
  void speakWithConfiguredTts(text, ttsConfig).catch((error) => {
    addAppLog?.({
      type: 'tts',
      title: 'TTS 播放失败',
      detail: error instanceof Error ? error.message : '未知错误',
    });
  });
}

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

async function fetchModelList(baseUrl: string, apiKey: string) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage('拉取模型失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    }));
  }
  const data = await response.json();
  const models = Array.isArray(data?.data)
    ? data.data.map((item: { id?: string }) => item.id).filter(Boolean)
    : [];
  return models as string[];
}

async function requestChatCompletion({
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
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
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
    const message = buildHttpErrorMessage('聊天接口失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    });
    useAppStore.getState().addAppLog?.({ type: 'error', title: 'AI 接口失败', detail: `${endpoint}\n${message}` });
    throw new Error(message);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  useAppStore.getState().addAppLog?.({ type: 'ai', title: 'AI 返回内容', detail: content });
  return content;
}

async function requestChatCompletionStream({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  onToken,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature: number;
  onToken: (token: string) => void;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
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
      stream: true,
    }),
  });
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage('聊天接口失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    }));
  }
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    onToken(content);
    return content;
  }
  if (!response.body) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    onToken(content);
    return content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataText = trimmed.replace(/^data:\s*/, '');
      if (!dataText || dataText === '[DONE]') continue;
      try {
        const data = JSON.parse(dataText);
        const token = data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.text || '';
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // Ignore non-JSON keepalive chunks from OpenAI-compatible gateways.
      }
    }
  }
  return fullText;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatMessageTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>, forAi = false, speakers: Character[] = []) {
  if (message.recalled) return '已撤回一条消息';
  const speaker = message.speakerId ? speakers.find((character) => character.id === message.speakerId)?.name : '';
  const prefix = forAi && speaker ? `${speaker}：` : '';
  if (message.kind === 'sticker') return forAi ? `表情包注释：${message.stickerLabel || '表情包'}` : '表情';
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return `${prefix}${message.transcript || message.content || '语音'}`;
  if (message.kind === 'call-note') return `${prefix}通话：${message.content}`;
  if (message.kind === 'transfer') return `${prefix}转账：${message.amount || message.content}${message.note ? `，${message.note}` : ''}`;
  if (message.kind === 'red-packet') return `${prefix}红包：${message.note || message.content || '恭喜发财，大吉大利'}${message.amount ? `，${message.amount}` : ''}`;
  if (message.kind === 'shopping') return `${prefix}购物：${message.itemName || message.content}${message.amount ? `，${message.amount}` : ''}${message.note ? `，${message.note}` : ''}`;
  return `${prefix}${message.content}`;
}

function stringifyForPrompt(value: unknown, maxLength = 6000) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function getCharacterPrompt(character: Character) {
  return [
    `角色名：${character.name}`,
    character.description && `简介：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.firstMessage && `开场白参考：${character.firstMessage}`,
    character.systemPrompt && `角色系统提示：${character.systemPrompt}`,
    character.worldBook && `世界书：\n${stringifyForPrompt(character.worldBook)}`,
  ].filter(Boolean).join('\n');
}

function formatDateLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDiarySummary(entry: DiaryEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 62) || '还没有正文';
}

function buildMemoWorldContext({
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
  const recentMessages = Object.values(chatSessions)
    .filter((session) => !character || session.characterId === character.id)
    .flatMap((session) => session.messages.slice(-10).map((message) => `${message.role === 'user' ? '用户' : character?.name || 'char'}：${describeChatMessage(message, true, characters)}`))
    .slice(-24)
    .join('\n');
  const moments = wechatMoments.slice(0, 8).map((moment) => `朋友圈：${moment}`).join('\n');
  const orders = purchaseRecords.slice(0, 6).map((record) => `订单：${record.itemName} ${record.amount} ${record.note}`).join('\n');
  const diaryNotes = diaries.slice(0, 5).map((entry) => `日记：${entry.title}：${getDiarySummary(entry)}`).join('\n');
  const calendarNotes = calendarEvents.slice(0, 6).map((event) => `日历：${formatDateLabel(event.startAt)} ${event.title}${event.note ? `：${event.note}` : ''}`).join('\n');
  const photoNotes = galleryPhotos.slice(0, 5).map((photo) => `相册：${photo.title}：${photo.description || photo.note || photo.tags.join('、')}`).join('\n');
  const memoNotes = memos.filter((memo) => !memo.locked).slice(0, 8).map((memo) => `备忘录：${memo.title}：${memo.content}`).join('\n');
  const xiaohongshuContext = xiaohongshuNotes.length > 0 ? buildXiaohongshuContext(xiaohongshuNotes, 8) : '';
  return [
    recentMessages && `最近聊天\n${recentMessages}`,
    moments && `朋友圈\n${moments}`,
    xiaohongshuContext,
    diaryNotes && `最近日记\n${diaryNotes}`,
    calendarNotes && `最近日历\n${calendarNotes}`,
    photoNotes && `最近相册\n${photoNotes}`,
    orders && `最近订单\n${orders}`,
    memoNotes && `已有备忘\n${memoNotes}`,
  ].filter(Boolean).join('\n\n') || '当前没有太多最近记录，请写一条符合角色世界观的短备忘。';
}

function useMemoCharWriterAutomation() {
  const {
    memoCharWriter,
    characters,
    chatSessions,
    wechatMoments,
    purchaseRecords,
    diaries,
    calendarEvents,
    galleryPhotos,
    memos,
    xiaohongshuNotes,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    appPresets,
    addMemoEntry,
    setMemoCharWriter,
  } = useAppStore();

  useEffect(() => {
    if (!memoCharWriter.enabled || !memoCharWriter.scheduledAt) return;
    const tick = async () => {
      const scheduledAt = memoCharWriter.scheduledAt || 0;
      if (Date.now() < scheduledAt || (memoCharWriter.lastRunAt || 0) >= scheduledAt) return;
      const character = characters.find((item) => item.id === memoCharWriter.characterId) || characters[0];
      if (!character) return;
      setMemoCharWriter({ lastRunAt: Date.now() });
      const context = buildMemoWorldContext({
        characters,
        chatSessions,
        wechatMoments,
        purchaseRecords,
        diaries,
        calendarEvents,
        galleryPhotos,
        memos,
        xiaohongshuNotes,
        characterId: character.id,
      });
      let content = '';
      if (apiBaseUrl && selectedModel) {
        try {
          content = await requestChatCompletion({
            baseUrl: apiBaseUrl,
            apiKey,
            model: selectedModel,
            temperature: chatTemperature,
            maxTokens: 320,
            messages: [
              {
                role: 'system',
                content: [
                  getCharacterPrompt(character) || `你是${character.name}。`,
                  appPresets.memo.prompt,
                  '你会在固定时间打开备忘录，总结最近发生的事，写一条短备忘。只输出备忘录正文，不要编号，不要解释。',
                ].join('\n'),
              },
              {
                role: 'user',
                content: `现在到了设定时间：${new Date(scheduledAt).toLocaleString('zh-CN')}。\n请结合这些最近内容写一条符合世界观的备忘：\n\n${context}`,
              },
            ],
          });
        } catch {
          content = '';
        }
      }
      const finalContent = content.trim() || `${character.name}把最近发生的事整理成一句：明天继续确认那些还没有说完、也不该被忘掉的细节。`;
      addMemoEntry({
        title: `${character.name}的备忘`,
        content: finalContent,
        type: 'note',
        tags: ['给char看', '收藏'],
        color: 'yellow',
        characterId: character.id,
        readableByChar: true,
        reminderAt: scheduledAt,
        pinned: true,
        locked: false,
        completed: false,
        source: 'char',
      });
      setMemoCharWriter({ enabled: false, lastRunAt: Date.now() });
    };
    const timer = window.setInterval(tick, 15000);
    void tick();
    return () => window.clearInterval(timer);
  }, [memoCharWriter, characters, chatSessions, wechatMoments, purchaseRecords, diaries, calendarEvents, galleryPhotos, memos, apiBaseUrl, apiKey, selectedModel, chatTemperature, appPresets.memo.prompt, addMemoEntry, setMemoCharWriter]);
}

function useProactiveReminderAutomation() {
  useEffect(() => {
    let syncing = false;
    const tick = async () => {
      const state = useAppStore.getState();
      const writes = buildDueProactiveReminderWrites({
        calendarEvents: state.calendarEvents,
        lifeEvents: state.lifeEvents,
        characters: state.characters,
        now: Date.now(),
        enabled: state.activeReminderAutomationEnabled,
      });
      writes.forEach((write) => {
        state.addMessage(write.chatTarget.characterId, write.chatTarget.channel, write.chatMessage);
        state.addLifeEvent(write.lifeEvent);
        state.addAppLog?.({
          type: 'info',
          title: '微信主动提醒已发送',
          detail: `calendar_id=${write.calendarEventId}; character=${write.chatTarget.characterId}; message_id=${write.chatMessage.id}; source_id=${write.lifeEvent.sourceId}`,
        });
      });
      if (syncing || !state.activeReminderAutomationEnabled) return;
      syncing = true;
      try {
        const clientId = getProactiveReminderClientId();
        const items = await fetchBackendProactiveReminderOutbox(clientId);
        const latestState = useAppStore.getState();
        for (const item of items) {
          if (!item.characterId) {
            await ackBackendProactiveReminderOutbox(item.id, clientId);
            continue;
          }
          const sourceId = `active-reminder-${item.occurrenceKey}`;
          if (latestState.lifeEvents.some((event) => event.sourceId === sourceId)) {
            await ackBackendProactiveReminderOutbox(item.id, clientId);
            latestState.addAppLog?.({
              type: 'info',
              title: '后端主动提醒已去重',
              detail: `outbox_id=${item.id}; character=${item.characterId}; occurrence=${item.occurrenceKey}; source_id=${sourceId}`,
            });
            continue;
          }
          latestState.addMessage(item.characterId, item.channel, buildReminderMessageFromOutbox(item));
          latestState.addLifeEvent({
            id: `life-${item.id}`,
            type: 'calendar',
            app: 'wechat',
            characterId: item.characterId,
            title: `后端主动提醒：${item.task}`,
            summary: item.content,
            importance: 4,
            sourceId,
            readableByChar: true,
            tags: ['主动提醒', '长期记忆', '后端常驻'],
            createdAt: item.createdAt,
          });
          await ackBackendProactiveReminderOutbox(item.id, clientId);
          latestState.addAppLog?.({
            type: 'info',
            title: '后端主动提醒已同步到微信',
            detail: `outbox_id=${item.id}; character=${item.characterId}; occurrence=${item.occurrenceKey}`,
          });
        }
      } catch (error) {
        useAppStore.getState().addAppLog?.({
          type: 'error',
          title: '后端主动提醒同步失败',
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        syncing = false;
      }
    };
    const timer = window.setInterval(tick, 30000);
    void tick();
    return () => window.clearInterval(timer);
  }, []);
}

function useNativePushTokenRegistration() {
  useEffect(() => installNativePushTokenBridge((result) => {
    useAppStore.getState().addAppLog?.({
      type: result.ok ? 'info' : 'error',
      title: result.ok ? '主动提醒推送设备已注册' : '主动提醒推送设备注册失败',
      detail: result.ok
        ? `token=${result.pushToken?.slice(0, 24) || 'unknown'}...`
        : result.error || 'unknown error',
    });
  }), []);
}

function useRandomProactiveMessagesAutomation() {
  useEffect(() => {
    const tick = () => {
      const state = useAppStore.getState();
      const writes = buildRandomProactiveMessageWrites({
        characters: state.characters,
        chatSessions: state.chatSessions,
        diaries: state.diaries,
        calendarEvents: state.calendarEvents,
        galleryPhotos: state.galleryPhotos,
        memos: state.memos,
        wechatMoments: state.wechatMoments,
        musicTracks: state.musicTracks,
        musicListenRecords: state.musicListenRecords,
        xiaohongshuNotes: state.xiaohongshuNotes,
        lifeEvents: state.lifeEvents,
      }, {
        now: Date.now(),
        enabled: state.randomProactiveMessagesEnabled,
      });
      writes.forEach((write) => {
        state.addMessage(write.chatTarget.characterId, write.chatTarget.channel, write.chatMessage);
        state.addLifeEvent(write.lifeEvent);
        state.addAppLog?.(write.appLog);
      });
    };
    const timer = window.setInterval(tick, 2 * 60 * 1000);
    const firstTick = window.setTimeout(tick, 10 * 1000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(firstTick);
    };
  }, []);
}

export default function App() {
  const {
    theme,
    fontStyle,
    activeScreen,
    characters,
    chatSessions,
    phoneCallRecords,
    calendarEvents,
    memos,
    wallpaper,
    setScreen,
    goBack,
  } = useAppStore();
  const [locked, setLocked] = useState(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const notifications = buildShellNotifications({ characters, chatSessions, phoneCallRecords, calendarEvents, memos });
  const notificationBadges = getShellNotificationBadges(notifications);
  const notificationCount = notifications.reduce((count, notification) => count + (notification.count || 1), 0);
  const themeClass = theme === 'pastel' || theme === 'gothic' || theme === 'guofeng' || theme === 'celtic-paladin' || theme === 'status-terminal' || theme === 'alcheris-pixel' ? theme : 'pastel';
  const fontClass = fontStyle === 'system' || fontStyle === 'serif' || fontStyle === 'pixel' ? `font-${fontStyle}` : 'font-rounded';
  const openNotification = (notification: ShellNotification) => {
    setLocked(false);
    setShowNotificationCenter(false);
    setScreen(notification.screen);
  };
  useMemoCharWriterAutomation();
  useProactiveReminderAutomation();
  useRandomProactiveMessagesAutomation();
  useNativePushTokenRegistration();

  useEffect(() => {
    const logRuntimeError = (title: string, error: unknown, source?: string) => {
      useAppStore.getState().addAppLog?.(buildRuntimeErrorLog({
        title,
        error,
        source,
        url: window.location.href,
      }));
    };
    const handleError = (event: ErrorEvent) => {
      logRuntimeError('前端运行时错误', event.error || event.message, event.filename);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logRuntimeError('未处理 Promise 错误', event.reason, 'window.unhandledrejection');
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const updateViewportVars = () => {
      const viewport = window.visualViewport;
      const visibleHeight = Math.max(320, Math.round(viewport?.height || window.innerHeight));
      const keyboardInset = Math.max(0, Math.round(window.innerHeight - visibleHeight - (viewport?.offsetTop || 0)));
      root.style.setProperty('--app-vvh', `${visibleHeight}px`);
      root.style.setProperty('--app-keyboard-inset', `${keyboardInset}px`);
    };

    updateViewportVars();
    window.addEventListener('resize', updateViewportVars);
    window.addEventListener('orientationchange', updateViewportVars);
    window.visualViewport?.addEventListener('resize', updateViewportVars);
    window.visualViewport?.addEventListener('scroll', updateViewportVars);
    return () => {
      window.removeEventListener('resize', updateViewportVars);
      window.removeEventListener('orientationchange', updateViewportVars);
      window.visualViewport?.removeEventListener('resize', updateViewportVars);
      window.visualViewport?.removeEventListener('scroll', updateViewportVars);
    };
  }, []);

  return (
    <AppErrorBoundary>
      <div className={cn('min-h-screen phone-stage flex items-center justify-center bg-[#101010] p-2 sm:p-4', `theme-${themeClass}`, fontClass)}>
        <main className={cn('phone-shell relative h-[844px] max-h-[calc(100dvh-16px)] w-[390px] max-w-full overflow-hidden bg-[var(--phone-bg)] text-[var(--phone-text)] rounded-[34px] border-[8px] border-[#111]', `screen-${activeScreen}`)}>
          <GlobalMusicAudio />
          {locked ? (
            <LockScreen
              notifications={notifications}
              wallpaper={wallpaper}
              onUnlock={() => setLocked(false)}
              onOpenNotification={openNotification}
            />
          ) : (
            <>
              {activeScreen === 'desktop' && (
                <button
                  type="button"
                  onClick={() => setShowNotificationCenter(true)}
                  className="shell-notification-button"
                  aria-label="打开通知中心"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>通知</span>
                  {notificationCount > 0 && <b>{notificationCount > 99 ? '99+' : notificationCount}</b>}
                </button>
              )}
              {activeScreen === 'desktop' && <Desktop badges={notificationBadges} />}
              {['wechat', 'xiaohongshu', 'bilibili'].includes(activeScreen) && (
                <button type="button" onClick={goBack} className="shell-app-back-button" aria-label="返回桌面">
                  <ChevronLeft className="h-7 w-7" />
                </button>
              )}
              {activeScreen === 'chat' && <ChatScreen />}
              {activeScreen !== 'desktop' && activeScreen !== 'chat' && <FeatureRouter screen={activeScreen} />}
              {activeScreen === 'desktop' && showNotificationCenter && (
                <NotificationCenter
                  notifications={notifications}
                  onClose={() => setShowNotificationCenter(false)}
                  onOpenNotification={openNotification}
                />
              )}
            </>
          )}
        </main>
      </div>
    </AppErrorBoundary>
  );
}

function decodeCommunityInput(input: string) {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function parseCommunityGroups(input: string) {
  return Array.from(new Set(
    decodeCommunityInput(input)
      .split(/[\n,，、|;\s]+/)
      .map((group) => group.trim())
      .filter(Boolean),
  ));
}

function normalizeCommunityGroup(group: string) {
  return group.trim().toLowerCase();
}

function hasRequiredCommunityGroup(groups: string[], requiredGroups: string[]) {
  const normalizedGroups = new Set(groups.map(normalizeCommunityGroup).filter(Boolean));
  const normalizedRequired = requiredGroups.map(normalizeCommunityGroup).filter(Boolean);
  if (normalizedRequired.length === 0) {
    return normalizedGroups.size > 0;
  }
  return normalizedRequired.some((group) => normalizedGroups.has(group));
}

function hasRequiredCommunityIdentity(groups: string[], config: import('./store').CommunityVerificationConfig) {
  const requiredGroups = Array.isArray(config.requiredGroups) ? config.requiredGroups : [];
  const roleIds = Array.isArray(config.discordRoleIds) ? config.discordRoleIds : [];
  return hasRequiredCommunityGroup(groups, [...requiredGroups, ...roleIds]);
}

function encodeCommunityState(config: import('./store').CommunityVerificationConfig) {
  const requiredGroups = Array.isArray(config.requiredGroups) ? config.requiredGroups : [];
  const guildIds = Array.isArray(config.discordGuildIds) ? config.discordGuildIds : [];
  const roleIds = Array.isArray(config.discordRoleIds) ? config.discordRoleIds : [];
  return btoa(encodeURIComponent(JSON.stringify({
    returnTo: window.location.href.split('?')[0].split('#')[0],
    communityName: config.communityName,
    requiredGroups,
    guildIds,
    roleIds,
  })));
}

function isNativeSmallPhone() {
  return Boolean((window as Window & { ReactNativeWebView?: unknown; __SMALL_PHONE_NATIVE__?: boolean }).ReactNativeWebView
    || (window as Window & { __SMALL_PHONE_NATIVE__?: boolean }).__SMALL_PHONE_NATIVE__);
}

function isLocalCommunityPreview() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function openExternalUrl(url: string) {
  const nativeWebView = (window as Window & {
    ReactNativeWebView?: { postMessage?: (message: string) => void };
  }).ReactNativeWebView;
  if (isNativeSmallPhone() && nativeWebView?.postMessage) {
    nativeWebView.postMessage(JSON.stringify({ type: 'open-url', url }));
    return;
  }
  window.location.assign(url);
}

function getCommunityBackdoorApiUrl(config: import('./store').CommunityVerificationConfig) {
  const savedUrl = (config.backdoorApiUrl || '').trim().replace(/\/+$/, '');
  const defaultUrl = defaultCommunityBackdoorApiUrl.trim().replace(/\/+$/, '');
  if (savedUrl && !savedUrl.includes('small-phone-backdoor.vercel.app')) {
    return savedUrl;
  }
  return defaultUrl || savedUrl;
}

function getCommunityRedirectUri(config: import('./store').CommunityVerificationConfig) {
  if (isNativeSmallPhone()) {
    const callbackBase = getCommunityBackdoorApiUrl(config);
    return callbackBase
      ? `${callbackBase}/api/community/discord/callback`
      : 'smallphone://discord-callback';
  }
  return config.callbackUrl.trim() || window.location.href.split('?')[0].split('#')[0];
}

function readGroupsFromUrl() {
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?'))
    : window.location.hash.replace(/^#/, '?');
  const paramsList = [window.location.search, hashQuery]
    .filter((value) => value && value !== '?')
    .map((value) => new URLSearchParams(value));
  const groupKeys = ['group', 'groups', 'discord_group', 'discord_groups', 'verified_group', 'verified_groups', 'role', 'roles', 'discord_role', 'discord_roles', 'role_id', 'role_ids'];
  const rawGroups = paramsList.flatMap((params) => groupKeys.flatMap((key) => params.getAll(key)));
  return parseCommunityGroups(rawGroups.join(','));
}

function readDiscordAccessTokenFromUrl(urlText = window.location.href) {
  try {
    const url = new URL(urlText);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, '?'));
    const searchParams = new URLSearchParams(url.search);
    return hashParams.get('access_token') || searchParams.get('access_token') || '';
  } catch {
    return '';
  }
}

async function fetchDiscordCommunityIdentities(accessToken: string, config: import('./store').CommunityVerificationConfig) {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Discord guilds 请求失败：${response.status}`);
  }
  const guilds = await response.json() as Array<{ id?: string; name?: string }>;
  const identities = guilds.flatMap((guild) => [guild.id, guild.name].filter(Boolean) as string[]);
  const targetGuildIds = new Set((Array.isArray(config.discordGuildIds) ? config.discordGuildIds : []).filter(Boolean));
  await Promise.all(guilds
    .filter((guild) => guild.id && targetGuildIds.has(guild.id))
    .map(async (guild) => {
      try {
        const memberResponse = await fetch(`https://discord.com/api/users/@me/guilds/${guild.id}/member`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!memberResponse.ok) return;
        const member = await memberResponse.json() as { roles?: string[] };
        identities.push(...(Array.isArray(member.roles) ? member.roles : []));
      } catch {
        // Guild membership is still useful even when role lookup is unavailable.
      }
    }));
  return identities;
}

function buildCommunityAuthUrl(config: import('./store').CommunityVerificationConfig) {
  const authorizationUrl = config.authorizationUrl || '';
  const target = authorizationUrl.trim() && !authorizationUrl.includes('api.xiejiang.de5.net')
    ? config.authorizationUrl.trim()
    : defaultCommunityAuthUrl;
  if (!target) return null;
  try {
    const url = new URL(target, window.location.href);
    const isDiscordAuthorize = /(^|\.)discord(app)?\.com$/i.test(url.hostname);
    const discordClientId = config.discordClientId || '';
    const discordGuildIds = Array.isArray(config.discordGuildIds) ? config.discordGuildIds : [];
    const requiredGroups = Array.isArray(config.requiredGroups) ? config.requiredGroups : [];
    const clientId = url.searchParams.get('client_id') || discordClientId.trim() || defaultDiscordClientId;
    if (isDiscordAuthorize) {
      if (!clientId) return null;
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('response_type', 'token');
      url.searchParams.set('scope', url.searchParams.get('scope') || 'identify guilds guilds.members.read');
      url.searchParams.set('prompt', url.searchParams.get('prompt') || 'consent');
      url.searchParams.set('state', encodeCommunityState(config));
      url.searchParams.set('redirect_uri', getCommunityRedirectUri(config));
      if (discordGuildIds.length === 1 && !url.searchParams.has('guild_id')) {
        url.searchParams.set('guild_id', discordGuildIds[0]);
      }
      return url.toString();
    }
    if (config.callbackUrl.trim() && !url.searchParams.has('redirect_uri')) {
      url.searchParams.set('redirect_uri', config.callbackUrl.trim());
    }
    if (!url.searchParams.has('return_to')) {
      url.searchParams.set('return_to', window.location.href.split('?')[0].split('#')[0]);
    }
    if (!url.searchParams.has('required_groups')) {
      url.searchParams.set('required_groups', requiredGroups.join(','));
    }
    return url.toString();
  } catch {
    return null;
  }
}

function CommunityGate({
  config,
  onUpdate,
}: {
  config: import('./store').CommunityVerificationConfig;
  onUpdate: (updates: Partial<import('./store').CommunityVerificationConfig>) => void;
}) {
  const callbackUrl = config.callbackUrl;
  const authorizationUrl = config.authorizationUrl || defaultCommunityAuthUrl;
  const savedRequiredGroups = Array.isArray(config.requiredGroups) ? config.requiredGroups : [];
  const savedInviteUrls = Array.isArray(config.discordInviteUrls) ? config.discordInviteUrls : [];
  const requiredGroups = savedRequiredGroups.length > 0 ? savedRequiredGroups : defaultCommunityInvites.map((invite) => invite.name);
  const inviteTargets = defaultCommunityInvites.map((invite, index) => ({
    ...invite,
    url: savedInviteUrls[index] || invite.url,
  }));
  const [showBackdoor, setShowBackdoor] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?')) : window.location.hash.replace(/^#/, '?');
    const hashParams = new URLSearchParams(hashQuery);
    return searchParams.has('backdoor') || searchParams.has('community_debug') || hashParams.has('backdoor') || hashParams.has('community_debug');
  });
  const [loginTitleTaps, setLoginTitleTaps] = useState(0);
  const [backdoorText, setBackdoorText] = useState('');
  const [status, setStatus] = useState('请使用 Discord 登录，验证身份组后会自动进入小手机。');
  const backdoorApiUrl = getCommunityBackdoorApiUrl(config);
  const localPreview = isLocalCommunityPreview();

  const verifyGroups = (groups: string[]) => {
    onUpdate({ callbackUrl, authorizationUrl, requiredGroups });
    if (!hasRequiredCommunityIdentity(groups, { ...config, callbackUrl, authorizationUrl, requiredGroups })) {
      const roleHint = config.discordRoleIds.length > 0 ? ` 或已配置的 ${config.discordRoleIds.length} 个 Role ID` : '';
      setStatus(`没有检测到可用身份组。拥有 ${requiredGroups.join(' / ')}${roleHint} 中任意一个即可。`);
      return;
    }
    onUpdate({
      callbackUrl,
      authorizationUrl,
      requiredGroups,
      verifiedGroups: groups,
      verificationMethod: 'discord',
      verifiedAt: Date.now(),
      backdoorVerifiedUntil: undefined,
    });
    setStatus('Discord 身份组验证通过，之后不需要重复验证。');
  };

  const verifyDiscordAccessToken = async (accessToken: string) => {
    setStatus('正在读取 Discord 社区身份...');
    try {
      const groups = await fetchDiscordCommunityIdentities(accessToken, { ...config, callbackUrl, authorizationUrl, requiredGroups });
      verifyGroups(groups);
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Discord 验证失败，请重新登录。');
    }
  };

  const verifyBackdoor = async () => {
    onUpdate({ callbackUrl, authorizationUrl, requiredGroups, backdoorApiUrl });
    const inputCode = backdoorText.trim();
    if (!inputCode) {
      setStatus('请输入作者端生成的后门通行码。');
      return;
    }
    if (!backdoorApiUrl) {
      setStatus('后门服务未配置。发布 APK 前请设置 VITE_COMMUNITY_BACKDOOR_API_URL，或进入设置页填写后门服务地址。');
      return;
    }
    setStatus('正在请求后端验证后门通行码...');
    try {
      const response = await fetch(`${backdoorApiUrl}/api/community/backdoor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode }),
      });
      const data = await response.json().catch(() => null) as { ok?: boolean; expiresAt?: number; message?: string } | null;
      if (!response.ok || !data?.ok || typeof data.expiresAt !== 'number') {
        setStatus(data?.message || '后门通行码不对，或后门服务拒绝了这次验证。');
        return;
      }
      onUpdate({
        callbackUrl,
        authorizationUrl,
        requiredGroups,
        backdoorApiUrl,
        verifiedGroups: [],
        verificationMethod: 'backdoor',
        verifiedAt: Date.now(),
        backdoorVerifiedUntil: data.expiresAt,
      });
      const expiresText = new Date(data.expiresAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setStatus(`后门验证通过，到 ${expiresText} 前有效。`);
    } catch (error) {
      setStatus(error instanceof Error ? `后门服务连接失败：${error.message}` : '后门服务连接失败。');
    }
  };

  const jumpToDiscord = () => {
    onUpdate({ callbackUrl, authorizationUrl, requiredGroups });
    const authUrl = buildCommunityAuthUrl({ ...config, callbackUrl, authorizationUrl, requiredGroups });
    if (!authUrl) {
      setStatus('Discord 应用还缺少 Client ID。请先在设置页的社区验证里填入 Discord Developer App 的 Client ID；玩家不会看到这个配置。');
      return;
    }
    openExternalUrl(authUrl);
    setStatus('正在打开 Discord 授权页面...');
  };

  const enterLocalPreview = () => {
    verifyGroups(requiredGroups);
    setStatus('本地预览已跳过 Discord 授权。');
  };

  const openInvite = (url: string) => {
    openExternalUrl(url);
  };

  const revealBackdoorFromLoginTitle = () => {
    setLoginTitleTaps((count) => {
      const next = count + 1;
      if (next >= 3) {
        setShowBackdoor(true);
        setStatus('备用入口已打开。');
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    const accessToken = readDiscordAccessTokenFromUrl();
    if (accessToken) {
      void verifyDiscordAccessToken(accessToken);
      return;
    }
    const groups = readGroupsFromUrl();
    if (groups.length > 0) {
      verifyGroups(groups);
      return;
    }
    const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, '?'));
    if (params.has('code')) {
      setStatus('Discord 已返回授权码；当前版本使用 access token 验证，请重新点击验证按钮。');
    }
    const handleNativeDiscordCallback = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const token = readDiscordAccessTokenFromUrl(detail);
      if (token) {
        void verifyDiscordAccessToken(token);
      }
    };
    window.addEventListener('small-phone-discord-callback', handleNativeDiscordCallback as EventListener);
    return () => window.removeEventListener('small-phone-discord-callback', handleNativeDiscordCallback as EventListener);
    // Only consume the current browser callback once when the gate opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="community-gate">
      <div className="community-gate-panel">
        <Shield className="h-8 w-8" />
        <h1 onClick={revealBackdoorFromLoginTitle}>登录</h1>
        <p>先加入任意一个指定 Discord 社区，再回来验证登录。</p>
        <div className="community-invite-grid">
          {inviteTargets.map((invite) => (
            <button key={invite.name} type="button" onClick={() => openInvite(invite.url)}>
              {invite.name}
            </button>
          ))}
        </div>
        <div className="community-gate-actions">
          <button type="button" onClick={jumpToDiscord}>我已加入，使用 Discord 验证</button>
          {localPreview && (
            <button type="button" className="community-preview-button" onClick={enterLocalPreview}>本地预览直接进入</button>
          )}
        </div>
        {showBackdoor && (
          <>
            <div className="community-gate-divider"><span>备用入口</span></div>
            <label>
              <span>后门通行码</span>
              <input value={backdoorText} onChange={(event) => setBackdoorText(event.target.value)} inputMode="numeric" placeholder="输入 6 位通行码" />
              <small>通行码只在作者后端生成和校验，客户端不会显示也不会保存真实后门码。</small>
            </label>
            <div className="community-gate-actions community-gate-actions-compact">
              <button type="button" onClick={verifyBackdoor}>后门进入</button>
              <button type="button" onClick={() => verifyGroups(readGroupsFromUrl())}>读取回调</button>
            </div>
          </>
        )}
        <p className="community-gate-status">{status}</p>
      </div>
    </section>
  );
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { message: string | null }> {
  declare props: Readonly<{ children: React.ReactNode }>;

  state = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : '未知界面错误' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    useAppStore.getState().addAppLog?.(buildRuntimeErrorLog({
      title: '小手机界面崩溃',
      error,
      componentStack: info.componentStack,
      source: 'React ErrorBoundary',
      url: window.location.href,
    }));
  }

  render() {
    if (this.state.message) {
      return (
        <div className="min-h-screen bg-[#101010] p-4 text-[#111]">
          <main className="mx-auto flex h-[844px] max-h-[calc(100dvh-32px)] w-[390px] max-w-full flex-col justify-center rounded-[34px] border-[8px] border-[#111] bg-[#fffaf0] p-6">
            <h1 className="text-2xl font-black">小手机界面崩了</h1>
            <p className="mt-3 rounded-2xl border-[3px] border-[#111] bg-white p-4 text-sm font-bold leading-relaxed">
              {this.state.message}
            </p>
            <button type="button" onClick={() => window.location.reload()} className="fetch-button mt-5">
              重新载入
            </button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

type CalendarTab = 'month' | 'today' | 'list';
type CalendarView = 'main' | 'edit' | 'detail';
type CalendarDraft = {
  owner: CalendarEvent['owner'];
  characterId: string;
  title: string;
  note: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  repeat: NonNullable<CalendarEvent['repeat']>;
  reminder: 'none' | 'start' | '15m' | '1h' | '1d';
  tags: string;
  source: NonNullable<CalendarEvent['source']>;
  relatedDiaryIds: string[];
};

const calendarSourceLabels: Record<NonNullable<CalendarEvent['source']>, string> = {
  manual: '手动',
  wechat: '微信',
  qq: 'QQ',
  diary: '日记',
  memo: '备忘录',
  moment: '朋友圈',
  order: '订单',
};

