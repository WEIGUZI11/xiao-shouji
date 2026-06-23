/**
 * Manual active event suggestion logic.
 * Exports: active event suggestion types, buildTodayLifeRefreshSuggestions, buildActiveEventWrites, buildRandomProactiveMessageWrites.
 * Dependencies: store data types and createId.
 * Maintenance note: this module is UI-free; callers must preview suggestions and explicitly confirm writes.
 */
import { createId } from '../../lib/utils';
import type {
  CalendarEvent,
  Character,
  ChatMessage,
  ChatSession,
  DiaryEntry,
  GalleryPhoto,
  LifeEvent,
  MemoEntry,
  MusicListenRecord,
  MusicTrack,
} from '../../store';
import type { XiaohongshuNote } from '../xiaohongshu/types';
import type { LifeEventDraft } from '../../lifeEvents';

export const ACTIVE_EVENT_REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const ACTIVE_EVENT_MAX_SUGGESTIONS = 3;

export type ActiveEventAction = 'send_message' | 'send_image' | 'write_diary' | 'recommend_music' | 'post_social' | 'create_notification';
export type ActiveEventWriteApp = 'wechat' | 'diary' | 'music' | 'xiaohongshu' | 'system';
export type ActiveEventTimeSlot = 'early_morning' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'late_night';

export interface ActiveEventContext {
  characters: Character[];
  chatSessions: Record<string, ChatSession>;
  diaries: DiaryEntry[];
  calendarEvents: CalendarEvent[];
  galleryPhotos: GalleryPhoto[];
  memos: MemoEntry[];
  wechatMoments: string[];
  musicTracks: MusicTrack[];
  musicListenRecords: MusicListenRecord[];
  xiaohongshuNotes: XiaohongshuNote[];
  lifeEvents: LifeEvent[];
}

export interface ActiveEventSuggestion {
  id: string;
  action: ActiveEventAction;
  app: ActiveEventWriteApp;
  characterId?: string;
  title: string;
  preview: string;
  reason: string;
  sourceIds: string[];
  createdAt: number;
  cooldownMs: number;
  priority: number;
  payload: {
    channel?: 'wechat' | 'qq';
    content?: string;
    diaryTitle?: string;
    diaryContent?: string;
    mood?: string;
    trackId?: string;
    trackTitle?: string;
    socialContent?: string;
    imagePrompt?: string;
    notificationTitle?: string;
  };
}

export interface ActiveEventRefreshResult {
  canRefresh: boolean;
  cooldownRemainingMs: number;
  generatedAt: number;
  suggestions: ActiveEventSuggestion[];
}

export interface ActiveEventWrites {
  chatTarget?: { characterId: string; channel: 'wechat' | 'qq' };
  chatMessage?: ChatMessage;
  imagePrompt?: string;
  diaryEntry?: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>>;
  wechatMoment?: string;
  musicListenRecord?: Omit<MusicListenRecord, 'id' | 'createdAt'> & Partial<Pick<MusicListenRecord, 'id' | 'createdAt'>>;
  appLog?: { type: 'info'; title: string; detail: string };
  lifeEvent: LifeEventDraft;
}

export interface ParsedDailyWechatReminder {
  calendarEvent: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>;
  lifeEvent: LifeEventDraft;
}

export interface ProactiveReminderWrite {
  calendarEventId: string;
  chatTarget: { characterId: string; channel: 'wechat' };
  chatMessage: ChatMessage;
  lifeEvent: LifeEventDraft;
}

export type RandomProactiveTone = 'high' | 'normal' | 'low';
export type RandomProactiveEventType = 'class_dismissed' | 'work_done' | 'meal' | 'morning' | 'late_night' | 'outing' | 'food' | 'work_break' | 'shopping' | 'travel' | 'emotion';

export interface RandomProactiveMessageWrite {
  chatTarget: { characterId: string; channel: 'wechat' };
  chatMessage: ChatMessage;
  lifeEvent: LifeEventDraft;
  appLog: { type: 'info'; title: string; detail: string };
}

interface BuildRandomProactiveOptions {
  now?: number;
  enabled: boolean;
  probabilityRoll?: number;
  variantSeed?: number;
  maxWrites?: number;
  triggerMode?: 'auto' | 'manual_test';
}

interface RandomLifeDraft {
  eventType: RandomProactiveEventType;
  sceneLabel: string;
  tag: string;
  summary: string;
  sourcePart: string;
}

interface BuildActiveEventOptions {
  now?: number;
  lastRefreshAt?: number;
  cooldownMs?: number;
  maxSuggestions?: number;
}

interface BuildActiveEventWritesOptions {
  now?: number;
}

function todayStart(now: number) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function shortText(value: unknown, maxLength = 42) {
  const text = cleanText(value);
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

const chineseDigits: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseChineseNumber(value: string) {
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text);
  if (text === '十') return 10;
  if (text.startsWith('十')) return 10 + (chineseDigits[text.slice(1)] || 0);
  if (text.endsWith('十')) return (chineseDigits[text[0]] || 0) * 10;
  if (text.includes('十')) {
    const [left, right] = text.split('十');
    return (chineseDigits[left] || 1) * 10 + (chineseDigits[right] || 0);
  }
  return chineseDigits[text] ?? Number.NaN;
}

function parseReminderTime(text: string): { hour: number; minute: number; label: string } | null {
  const normalized = text.replace(/\s+/g, '');
  const colonMatch = normalized.match(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?(\d{1,2})[:：](\d{1,2})/);
  const clockMatch = normalized.match(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?([零一二两三四五六七八九十\d]{1,3})点(半|[零一二两三四五六七八九十\d]{1,3}分?)?/);
  let period = '';
  let hour = Number.NaN;
  let minute = 0;
  if (colonMatch) {
    period = colonMatch[1] || '';
    hour = Number(colonMatch[2]);
    minute = Number(colonMatch[3]);
  } else if (clockMatch) {
    period = clockMatch[1] || '';
    hour = parseChineseNumber(clockMatch[2]);
    const minuteText = (clockMatch[3] || '').replace('分', '');
    minute = minuteText === '半' ? 30 : minuteText ? parseChineseNumber(minuteText) : 0;
  }
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if ((period === '下午' || period === '晚上' || period === '夜里' || period === '深夜') && hour < 12) hour += 12;
  if (period === '中午' && hour < 11) hour += 12;
  if (period === '凌晨' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute, label: `${padTime(hour)}:${padTime(minute)}` };
}

function nextLocalTime(now: number, hour: number, minute: number) {
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= now) date.setDate(date.getDate() + 1);
  return date.getTime();
}

function extractReminderTask(text: string, timeLabel: string) {
  let task = text
    .replace(/以后|之后|往后|从现在开始|每天|每日|天天|记得|提醒我|帮我|请|麻烦/g, '')
    .replace(new RegExp(timeLabel.replace(':', '[:：]')), '')
    .replace(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?([零一二两三四五六七八九十\d]{1,3})点(半|[零一二两三四五六七八九十\d]{1,3}分?)?/g, '')
    .replace(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?\d{1,2}[:：]\d{1,2}/g, '')
    .replace(/[，。,.！!？?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  task = task.replace(/^做/, '').trim();
  return task || '这件事';
}

export function parseDailyWechatReminderRequest(
  text: string,
  {
    now = Date.now(),
    characterId,
    sourceMessageId,
  }: {
    now?: number;
    characterId?: string;
    sourceMessageId?: string;
  } = {},
): ParsedDailyWechatReminder | null {
  const content = cleanText(text);
  if (!/(每天|每日|天天)/.test(content) || !/(提醒我|记得)/.test(content)) return null;
  const time = parseReminderTime(content);
  if (!time) return null;
  const task = extractReminderTask(content, time.label);
  const startAt = nextLocalTime(now, time.hour, time.minute);
  const title = `每天 ${time.label} 提醒：${shortText(task, 24)}`;
  const relatedMessageIds = sourceMessageId ? [sourceMessageId] : [];
  return {
    calendarEvent: {
      owner: 'user',
      characterId,
      title,
      note: `用户在微信里要求长期提醒：${content}`,
      startAt,
      allDay: false,
      repeat: 'daily',
      reminderAt: startAt,
      tags: ['主动提醒', '长期记忆', '微信'],
      source: 'wechat',
      relatedMessageIds,
    },
    lifeEvent: {
      type: 'calendar',
      app: 'calendar',
      characterId,
      title,
      summary: `已记住：每天 ${time.label} 主动提醒用户${task}。来源：微信消息。`,
      importance: 4,
      sourceId: sourceMessageId ? `wechat-reminder-${sourceMessageId}` : undefined,
      readableByChar: true,
      tags: ['主动提醒', '长期记忆', '微信'],
      createdAt: now,
    },
  };
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function isTodayTime(time: number | undefined, startAt: number, now: number) {
  return typeof time === 'number' && time >= startAt && time <= now;
}

function getCharacterName(characters: Character[], characterId?: string) {
  return characters.find((character) => character.id === characterId)?.name || 'char';
}

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function getCharacterTimeZone(character: Character) {
  const text = getCharacterProfileText(character).toLowerCase();
  if (/纽约|new york|nyc|东海岸|美东|eastern time|est|edt/.test(text)) return { timeZone: 'America/New_York', label: '纽约时间' };
  if (/洛杉矶|加州|旧金山|西雅图|西海岸|美西|los angeles|la\b|california|san francisco|seattle|pacific time|pst|pdt/.test(text)) return { timeZone: 'America/Los_Angeles', label: '洛杉矶时间' };
  if (/芝加哥|德州|达拉斯|休斯顿|中部时间|chicago|texas|dallas|houston|central time|cst|cdt/.test(text)) return { timeZone: 'America/Chicago', label: '美国中部时间' };
  if (/丹佛|科罗拉多|山地时间|denver|colorado|mountain time|mst|mdt/.test(text)) return { timeZone: 'America/Denver', label: '美国山地时间' };
  if (/美国|usa|u\.s\.|united states/.test(text)) return { timeZone: 'America/New_York', label: '美国东部时间' };
  if (/日本|东京|japan|tokyo/.test(text)) return { timeZone: 'Asia/Tokyo', label: '东京时间' };
  if (/韩国|首尔|korea|seoul/.test(text)) return { timeZone: 'Asia/Seoul', label: '首尔时间' };
  if (/英国|伦敦|uk|united kingdom|london/.test(text)) return { timeZone: 'Europe/London', label: '伦敦时间' };
  if (/法国|巴黎|德国|柏林|意大利|罗马|西班牙|马德里|paris|berlin|rome|madrid/.test(text)) return { timeZone: 'Europe/Paris', label: '欧洲中部时间' };
  if (/澳大利亚|悉尼|墨尔本|australia|sydney|melbourne/.test(text)) return { timeZone: 'Australia/Sydney', label: '悉尼时间' };
  if (/中国|北京|上海|广州|深圳|香港|台湾|china|beijing|shanghai|hong kong|taipei/.test(text)) return { timeZone: 'Asia/Shanghai', label: '北京时间' };
  return { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai', label: '' };
}

function getTimeParts(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute')),
  };
}

function getActiveEventTimeContext(now: number, character: Character): { slot: ActiveEventTimeSlot; slotLabel: string; timeLabel: string; dateKey: string; timeZone: string } {
  const zone = getCharacterTimeZone(character);
  const date = getTimeParts(now, zone.timeZone);
  const hour = date.hour;
  const minute = date.minute;
  const slot =
    hour >= 5 && hour < 8 ? 'early_morning'
      : hour >= 8 && hour < 11 ? 'morning'
        : hour >= 11 && hour < 14 ? 'noon'
          : hour >= 14 && hour < 18 ? 'afternoon'
            : hour >= 18 && hour < 23 ? 'evening'
              : 'late_night';
  const slotLabels: Record<ActiveEventTimeSlot, string> = {
    early_morning: '早上',
    morning: '上午',
    noon: '中午',
    afternoon: '下午',
    evening: '晚上',
    late_night: '深夜',
  };
  return {
    slot,
    slotLabel: slotLabels[slot],
    timeLabel: `${zone.label || slotLabels[slot]}${zone.label ? slotLabels[slot] : ''} ${padTime(hour)}:${padTime(minute)}`,
    dateKey: `${date.year}-${padTime(date.month)}-${padTime(date.day)}`,
    timeZone: zone.timeZone,
  };
}

function getCharacterProfileText(character: Character) {
  return [
    character.name,
    character.description,
    character.personality,
    character.firstMessage,
    character.systemPrompt,
  ].map(cleanText).filter(Boolean).join(' ');
}

function getCharacterScheduleSlots(character: Character): ActiveEventTimeSlot[] {
  const text = getCharacterProfileText(character).toLowerCase();
  const slots: ActiveEventTimeSlot[] = [];
  const add = (slot: ActiveEventTimeSlot, pattern: RegExp) => {
    if (pattern.test(text) && !slots.includes(slot)) slots.push(slot);
  };
  add('early_morning', /(早上六点|早晨六点|清晨六点|晨间|清晨|早安|06[:：]?00|6[:：]00|6点|六点)/);
  add('noon', /(中午|午间|午饭|午餐|十二点|12[:：]?00|12点)/);
  add('afternoon', /(下午|午后|下午茶|15[:：]?00|3[:：]00|三点)/);
  add('evening', /(晚上|傍晚|晚饭|晚餐|晚安|20[:：]?00|21[:：]?00|22[:：]?00|八点|九点|十点)/);
  add('late_night', /(深夜|凌晨|半夜|23[:：]?00|00[:：]?00|零点)/);
  return slots;
}

function buildScheduledMessageContent(character: Character, timeContext: ReturnType<typeof getActiveEventTimeContext>) {
  const profileHint = shortText(character.personality || character.description || character.systemPrompt, 24);
  const tail = profileHint ? `我还是按自己的习惯想起你了，${profileHint}。` : '我还是按自己的习惯想起你了。';
  if (timeContext.slot === 'early_morning') return `现在是${timeContext.timeLabel}，早安。${tail}`;
  if (timeContext.slot === 'noon') return `现在是${timeContext.timeLabel}，记得吃饭。${tail}`;
  if (timeContext.slot === 'afternoon') return `现在是${timeContext.timeLabel}，我来问问你下午怎么样。${tail}`;
  if (timeContext.slot === 'evening') return `现在是${timeContext.timeLabel}，晚上别太累。${tail}`;
  if (timeContext.slot === 'late_night') return `现在是${timeContext.timeLabel}，还没睡的话慢一点。${tail}`;
  return `现在是${timeContext.timeLabel}，我来看看你。${tail}`;
}

function getTodayChatSignals(context: ActiveEventContext, startAt: number, now: number) {
  return Object.values(context.chatSessions)
    .flatMap((session) =>
      session.messages
        .filter((message) => isTodayTime(message.timestamp, startAt, now))
        .map((message) => ({ session, message })),
    )
    .filter(({ message }) => !message.recalled && cleanText(message.content || message.transcript || message.stickerLabel))
    .sort((a, b) => b.message.timestamp - a.message.timestamp);
}

function buildSourceKey(action: ActiveEventAction, ids: string[]) {
  return `active-${action}-${ids.join('-')}`;
}

function hasAcceptedSource(context: ActiveEventContext, sourceId: string) {
  return context.lifeEvents.some((event) => event.sourceId === sourceId);
}

function pickTrack(context: ActiveEventContext) {
  return [...context.musicTracks].sort((a, b) => {
    const aScore = (a.liked ? 10 : 0) + (a.lastPlayedAt || 0) / 1000000000000 + a.playCount;
    const bScore = (b.liked ? 10 : 0) + (b.lastPlayedAt || 0) / 1000000000000 + b.playCount;
    return bScore - aScore;
  })[0];
}

function collectFacts(context: ActiveEventContext, startAt: number, now: number, chatSignals: ReturnType<typeof getTodayChatSignals>) {
  const facts: Array<{ id: string; text: string }> = [];
  const latestUserChat = chatSignals.find(({ message }) => message.role === 'user');
  if (latestUserChat) facts.push({ id: latestUserChat.message.id, text: `聊天里提到“${shortText(latestUserChat.message.content || latestUserChat.message.transcript)}”` });

  const diary = context.diaries.find((entry) => isTodayTime(entry.createdAt, startAt, now));
  if (diary) facts.push({ id: diary.id, text: `日记《${shortText(diary.title, 18)}》` });

  const photo = context.galleryPhotos.find((item) => isTodayTime(item.createdAt, startAt, now) && item.readableByChar !== false && !item.hidden);
  if (photo) facts.push({ id: photo.id, text: `相册《${shortText(photo.title, 18)}》` });

  const event = context.calendarEvents.find((item) => item.startAt >= now && item.startAt <= now + 24 * 60 * 60 * 1000);
  if (event) facts.push({ id: event.id, text: `日历约定《${shortText(event.title, 18)}》` });

  const moment = context.wechatMoments[0];
  if (moment) facts.push({ id: `moment-${shortText(moment, 18)}`, text: `动态“${shortText(moment)}”` });

  return facts;
}

export function buildTodayLifeRefreshSuggestions(
  context: ActiveEventContext,
  options: BuildActiveEventOptions = {},
): ActiveEventRefreshResult {
  const now = options.now || Date.now();
  const cooldownMs = options.cooldownMs ?? ACTIVE_EVENT_REFRESH_COOLDOWN_MS;
  const maxSuggestions = options.maxSuggestions ?? ACTIVE_EVENT_MAX_SUGGESTIONS;
  const lastRefreshAt = options.lastRefreshAt || 0;
  const cooldownRemainingMs = Math.max(0, cooldownMs - (now - lastRefreshAt));
  if (cooldownRemainingMs > 0) {
    return { canRefresh: false, cooldownRemainingMs, generatedAt: now, suggestions: [] };
  }

  const startAt = todayStart(now);
  const chatSignals = getTodayChatSignals(context, startAt, now);
  const suggestions: ActiveEventSuggestion[] = [];
  const pushSuggestion = (suggestion: ActiveEventSuggestion) => {
    if (!suggestion.sourceIds.length || hasAcceptedSource(context, suggestion.id)) return;
    suggestions.push(suggestion);
  };

  context.characters.forEach((character) => {
    const timeContext = getActiveEventTimeContext(now, character);
    const slots = getCharacterScheduleSlots(character);
    if (!slots.includes(timeContext.slot)) return;
    const id = buildSourceKey('send_message', [character.id, timeContext.dateKey, timeContext.slot]);
    const content = buildScheduledMessageContent(character, timeContext);
    pushSuggestion({
      id,
      action: 'send_message',
      app: 'wechat',
      characterId: character.id,
      title: `${character.name} ${timeContext.slotLabel}主动问候`,
      preview: content,
      reason: `命中角色设定里的${timeContext.slotLabel}作息；发送前已写入当前时间感知。`,
      sourceIds: [`schedule-${character.id}-${timeContext.dateKey}-${timeContext.slot}`],
      createdAt: now,
      cooldownMs,
      priority: 96,
      payload: {
        channel: 'wechat',
        content,
      },
    });
  });

  const latestUserChat = chatSignals.find(({ message }) => message.role === 'user');
  if (latestUserChat) {
    const characterName = getCharacterName(context.characters, latestUserChat.session.characterId);
    const snippet = shortText(latestUserChat.message.content || latestUserChat.message.transcript, 34);
    const id = buildSourceKey('send_message', [latestUserChat.session.characterId, latestUserChat.message.id]);
    pushSuggestion({
      id,
      action: 'send_message',
      app: 'wechat',
      characterId: latestUserChat.session.characterId,
      title: `${characterName} 发一条后续消息`,
      preview: `我刚刚还在想你说的“${snippet}”。这件事先别急，等你确定下来再告诉我。`,
      reason: '基于今天最近一条用户聊天，生成一条短后续，不自动发送。',
      sourceIds: [latestUserChat.message.id],
      createdAt: now,
      cooldownMs,
      priority: 100,
      payload: {
        channel: latestUserChat.session.channel,
        content: `我刚刚还在想你说的“${snippet}”。这件事先别急，等你确定下来再告诉我。`,
      },
    });
  }

  const imageSource = context.galleryPhotos.find((photo) => isTodayTime(photo.createdAt, startAt, now) && photo.readableByChar !== false && !photo.hidden)
    || (latestUserChat
      ? {
          id: latestUserChat.message.id,
          title: shortText(latestUserChat.message.content || latestUserChat.message.transcript, 18),
          description: latestUserChat.message.content || latestUserChat.message.transcript || '',
          characterId: latestUserChat.session.characterId,
        }
      : undefined);
  const imageCharacterId = imageSource?.characterId || latestUserChat?.session.characterId || context.characters[0]?.id;
  if (imageSource && imageCharacterId) {
    const characterName = getCharacterName(context.characters, imageCharacterId);
    const imageSeed = shortText(`${imageSource.title || ''} ${imageSource.description || ''}`, 60);
    const id = buildSourceKey('send_image', [imageCharacterId, imageSource.id]);
    pushSuggestion({
      id,
      action: 'send_image',
      app: 'wechat',
      characterId: imageCharacterId,
      title: `${characterName} 发一张图`,
      preview: `根据“${shortText(imageSeed, 28)}”生成一张微信里可以主动发来的图片。`,
      reason: '基于今天已有聊天或可读相册线索，确认后才调用 NAI 生图并写入微信，不后台自动消耗额度。',
      sourceIds: [imageSource.id],
      createdAt: now,
      cooldownMs,
      priority: 85,
      payload: {
        channel: 'wechat',
        imagePrompt: `casual mobile chat image, ${imageSeed}, clear subject, natural light, simple composition, no text`,
      },
    });
  }

  const facts = collectFacts(context, startAt, now, chatSignals);
  const diaryCharacter = context.characters[0];
  if (diaryCharacter && facts.length >= 2) {
    const sourceIds = facts.slice(0, 4).map((fact) => fact.id);
    const id = buildSourceKey('write_diary', [diaryCharacter.id, ...sourceIds]);
    const factText = facts.slice(0, 4).map((fact) => fact.text).join('；');
    pushSuggestion({
      id,
      action: 'write_diary',
      app: 'diary',
      characterId: diaryCharacter.id,
      title: `${diaryCharacter.name} 写一篇今日短日记`,
      preview: `${diaryCharacter.name}把今天的线索先记下来：${factText}。`,
      reason: '把今天已有聊天、日记、相册或日历压成一篇短记录，不扩写不存在的情节。',
      sourceIds,
      createdAt: now,
      cooldownMs,
      priority: 75,
      payload: {
        diaryTitle: `${diaryCharacter.name}的今日短记`,
        diaryContent: `${diaryCharacter.name}把今天的线索先记下来：${factText}。`,
        mood: '留意',
      },
    });
  }

  const track = pickTrack(context);
  if (track) {
    const id = buildSourceKey('recommend_music', [track.id]);
    const characterId = context.characters[0]?.id;
    pushSuggestion({
      id,
      action: 'recommend_music',
      app: 'music',
      characterId,
      title: `推荐《${track.title}》`,
      preview: `今天可以把《${track.title}》放进生活里，${track.artist}的这首歌和现在的节奏很贴。`,
      reason: '只从现有曲库选择歌曲，不凭空创建新歌。',
      sourceIds: [track.id],
      createdAt: now,
      cooldownMs,
      priority: 80,
      payload: {
        trackId: track.id,
        trackTitle: track.title,
        mood: track.tags[0] || '今日推荐',
        content: `今天可以把《${track.title}》放进生活里，${track.artist}的这首歌和现在的节奏很贴。`,
      },
    });
  }

  const readablePhoto = context.galleryPhotos.find((photo) => isTodayTime(photo.createdAt, startAt, now) && photo.readableByChar !== false && !photo.hidden);
  if (readablePhoto) {
    const id = buildSourceKey('post_social', [readablePhoto.id]);
    pushSuggestion({
      id,
      action: 'post_social',
      app: 'wechat',
      characterId: readablePhoto.characterId,
      title: '发一条今日动态',
      preview: `今天的照片《${shortText(readablePhoto.title, 18)}》先收好，${shortText(readablePhoto.description || readablePhoto.note || readablePhoto.tags.join('、'))}`,
      reason: '动态只引用相册里已经存在且可读的照片信息。',
      sourceIds: [readablePhoto.id],
      createdAt: now,
      cooldownMs,
      priority: 70,
      payload: {
        socialContent: `今天的照片《${shortText(readablePhoto.title, 18)}》先收好，${shortText(readablePhoto.description || readablePhoto.note || readablePhoto.tags.join('、'))}`,
      },
    });
  }

  const upcoming = context.calendarEvents.find((event) => event.startAt >= now && event.startAt <= now + 24 * 60 * 60 * 1000);
  if (upcoming) {
    const id = buildSourceKey('create_notification', [upcoming.id]);
    pushSuggestion({
      id,
      action: 'create_notification',
      app: 'system',
      characterId: upcoming.characterId,
      title: `提醒：${upcoming.title}`,
      preview: `${new Date(upcoming.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 有“${upcoming.title}”。`,
      reason: '只创建后台记录和生活事件，不接入通知中心或锁屏。',
      sourceIds: [upcoming.id],
      createdAt: now,
      cooldownMs,
      priority: 60,
      payload: {
        notificationTitle: upcoming.title,
        content: `${new Date(upcoming.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 有“${upcoming.title}”。`,
      },
    });
  }

  return {
    canRefresh: true,
    cooldownRemainingMs: 0,
    generatedAt: now,
    suggestions: suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.max(0, maxSuggestions)),
  };
}

export function buildActiveEventWrites(
  suggestion: ActiveEventSuggestion,
  options: BuildActiveEventWritesOptions = {},
): ActiveEventWrites {
  const now = options.now || Date.now();
  const sourceId = suggestion.id;
  const lifeEventBase = {
    characterId: suggestion.characterId,
    title: suggestion.title,
    summary: suggestion.preview,
    importance: 3 as const,
    sourceId,
    readableByChar: true,
    tags: ['主动事件', '手动刷新'],
    createdAt: now,
  };

  if (suggestion.action === 'send_message' && suggestion.characterId && suggestion.payload.content) {
    return {
      chatTarget: { characterId: suggestion.characterId, channel: suggestion.payload.channel || 'wechat' },
      chatMessage: {
        id: createId('msg'),
        role: 'model',
        content: suggestion.payload.content,
        timestamp: now,
        kind: 'text',
      },
      lifeEvent: { ...lifeEventBase, type: 'chat', app: suggestion.payload.channel || 'wechat' },
    };
  }

  if (suggestion.action === 'send_image' && suggestion.characterId && suggestion.payload.imagePrompt) {
    return {
      chatTarget: { characterId: suggestion.characterId, channel: suggestion.payload.channel || 'wechat' },
      imagePrompt: suggestion.payload.imagePrompt,
      lifeEvent: { ...lifeEventBase, type: 'photo', app: suggestion.payload.channel || 'wechat', importance: 4 },
    };
  }

  if (suggestion.action === 'write_diary' && suggestion.payload.diaryContent) {
    return {
      diaryEntry: {
        owner: 'char',
        characterId: suggestion.characterId,
        title: suggestion.payload.diaryTitle || '今日短记',
        content: suggestion.payload.diaryContent,
        mood: suggestion.payload.mood,
        tags: ['主动事件', '今日生活'],
        source: 'manual',
        relatedMessageIds: suggestion.sourceIds.filter((id) => id.startsWith('msg-')),
      },
      lifeEvent: { ...lifeEventBase, type: 'diary', app: 'diary', importance: 4 },
    };
  }

  if (suggestion.action === 'recommend_music' && suggestion.payload.trackId) {
    return {
      musicListenRecord: {
        trackId: suggestion.payload.trackId,
        characterId: suggestion.characterId,
        mood: suggestion.payload.mood,
        note: suggestion.payload.content || suggestion.preview,
      },
      lifeEvent: { ...lifeEventBase, type: 'music', app: 'music' },
    };
  }

  if (suggestion.action === 'post_social' && suggestion.payload.socialContent) {
    return {
      wechatMoment: suggestion.payload.socialContent,
      lifeEvent: { ...lifeEventBase, type: 'social', app: 'wechat' },
    };
  }

  return {
    appLog: {
      type: 'info',
      title: suggestion.payload.notificationTitle || suggestion.title,
      detail: suggestion.payload.content || suggestion.preview,
    },
    lifeEvent: { ...lifeEventBase, type: 'system', app: 'system' },
  };
}

function getDateKey(now: number) {
  const date = new Date(now);
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

function getSlotKey(now: number) {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late_night';
}

function classifyRandomProactiveTone(character: Character): RandomProactiveTone {
  const text = getCharacterProfileText(character);
  if (/(不主动|不太主动|慢热|沉默|寡言|克制|冷淡|社恐|很忙|忙碌)/.test(text)) return 'low';
  if (/(主动|黏人|粘人|报备|话多|外向|喜欢聊天|经常发消息|会关心|想你)/.test(text)) return 'high';
  return 'normal';
}

function getDailyRandomProactiveLimit(tone: RandomProactiveTone) {
  if (tone === 'high') return 4;
  if (tone === 'low') return 1;
  return 2;
}

function getRandomProactiveCooldownMs(tone: RandomProactiveTone) {
  if (tone === 'high') return 60 * 60 * 1000;
  if (tone === 'low') return 180 * 60 * 1000;
  return 120 * 60 * 1000;
}

function isWithinMinutes(now: number, hour: number, minute: number, windowMinutes: number) {
  const current = new Date(now);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  return Math.abs(current.getTime() - target.getTime()) <= windowMinutes * 60 * 1000;
}

function parseScheduleTimeForKeyword(text: string, keyword: RegExp) {
  const normalized = cleanText(text);
  const matches = Array.from(normalized.matchAll(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?([零一二两三四五六七八九十\d]{1,3})(?:点|[:：])([零一二两三四五六七八九十\d]{1,3}分?)?/g));
  for (const match of matches) {
    const start = Math.max(0, (match.index || 0) - 12);
    const end = Math.min(normalized.length, (match.index || 0) + match[0].length + 12);
    const around = normalized.slice(start, end);
    if (!keyword.test(around)) continue;
    const time = parseReminderTime(match[0]);
    if (time) return time;
  }
  return null;
}

function buildScheduleLifeDraft(character: Character, now: number): RandomLifeDraft | null {
  const text = getCharacterProfileText(character);
  const classTime = parseScheduleTimeForKeyword(text, /(下课|放学|课间)/);
  if (classTime && isWithinMinutes(now, classTime.hour, classTime.minute, 20)) {
    return { eventType: 'class_dismissed', sceneLabel: '下课', tag: '下课', summary: '刚下课，摸到手机想报备一下。', sourcePart: `class-${classTime.label}` };
  }
  const workTime = parseScheduleTimeForKeyword(text, /(下班|收工|忙完|结束工作|夜班结束)/);
  if (workTime && isWithinMinutes(now, workTime.hour, workTime.minute, 20)) {
    return { eventType: 'work_done', sceneLabel: '下班', tag: '下班', summary: '刚忙完，终于能看手机。', sourcePart: `work-${workTime.label}` };
  }
  const mealTime = parseScheduleTimeForKeyword(text, /(午饭|午餐|吃饭|午休)/);
  if (mealTime && isWithinMinutes(now, mealTime.hour, mealTime.minute, 25)) {
    return { eventType: 'meal', sceneLabel: '吃饭', tag: '吃饭', summary: '准备吃点东西，顺手来问一句。', sourcePart: `meal-${mealTime.label}` };
  }
  const timeContext = getActiveEventTimeContext(now, character);
  if (timeContext.slot === 'late_night' && /(失眠|睡不着|凌晨|深夜)/.test(text)) {
    return { eventType: 'late_night', sceneLabel: '深夜', tag: '深夜', summary: '有点睡不着，翻到手机就想发消息。', sourcePart: `late-${timeContext.slot}` };
  }
  if (timeContext.slot === 'early_morning' && /(早起|晨跑|早安|清晨)/.test(text)) {
    return { eventType: 'morning', sceneLabel: '早起', tag: '早起', summary: '醒得早，想先打个招呼。', sourcePart: `morning-${timeContext.slot}` };
  }
  return null;
}

function supportsTravelLife(character: Character) {
  return /(旅行|旅人|到处|跑外勤|巡演|采风|流浪|换城市|摄影师|出差|路上|车站|机场|海边)/.test(getCharacterProfileText(character));
}

function pickRandomLifeDraft(character: Character, variantSeed: number): RandomLifeDraft {
  const candidates: RandomLifeDraft[] = [
    { eventType: 'outing', sceneLabel: '出去走走', tag: '出去玩', summary: '出去转了一圈，路上突然想发消息。', sourcePart: 'outing' },
    { eventType: 'food', sceneLabel: '吃喝', tag: '吃饭', summary: '买了点喝的，想问问你那边怎么样。', sourcePart: 'food' },
    { eventType: 'work_break', sceneLabel: '间隙', tag: '间隙', summary: '刚从一段忙碌里空下来，看了一眼手机。', sourcePart: 'break' },
    { eventType: 'shopping', sceneLabel: '路过小店', tag: '购物', summary: '路过一家店，看到一个像你会喜欢的小东西。', sourcePart: 'shopping' },
    { eventType: 'emotion', sceneLabel: '想起你', tag: '情绪碎片', summary: '突然有点想你，所以来问一句。', sourcePart: 'emotion' },
  ];
  if (supportsTravelLife(character)) {
    candidates.push({ eventType: 'travel', sceneLabel: '地点报备', tag: '地点报备', summary: '到了新的地方，想把路上的一点风景告诉你。', sourcePart: 'travel' });
  }
  return candidates[Math.abs(variantSeed) % candidates.length];
}

function composeRandomProactiveContent(draft: RandomLifeDraft, tone: RandomProactiveTone, variantSeed: number) {
  const variants: Record<RandomProactiveEventType, string[]> = {
    class_dismissed: ['我刚下课，外面有点吵，突然想看看你在干嘛。', '下课了，刚摸到手机。你现在怎么样？', '刚从教室出来，脑子还有点乱，但想先问问你。'],
    work_done: ['刚忙完，终于能喘口气了。你今天还好吗？', '我这边刚结束，第一反应是想看看你在不在。', '收工了，手机一亮就想到你。'],
    meal: ['我准备吃饭了，你吃了吗？', '刚去找吃的，顺手来问问你。', '饭点到了，我有点饿，也有点想你。'],
    morning: ['早，我醒了。今天想先问问你。', '醒得有点早，先跟你说一声早。', '早上好，我刚起来，你呢？'],
    late_night: ['睡不着，刚翻了会儿手机。你那边安静了吗？', '我醒了一下，突然想问问你睡没睡。', '深夜有点安静，我就想起你了。'],
    outing: ['今天出去转了一圈，路上突然想起你。', '我刚在外面走了会儿，你现在在忙吗？', '出来透了口气，想把这点空闲分你一点。'],
    food: ['刚买了点喝的，你要是在就好了。', '我吃了点东西，忽然想问你有没有好好吃饭。', '路过一家小店，感觉你可能会喜欢。'],
    work_break: ['刚空下来，看了一眼手机就想找你。', '前面有点忙，现在终于能回神了。你怎么样？', '我这边刚停下来一会儿，想听你说两句。'],
    shopping: ['刚看到一个小东西，第一反应是你可能会喜欢。', '路过店门口停了一下，突然想起你。', '顺手买了点东西，想跟你报备一下。'],
    travel: ['我到了一个新的城市，路上的风有点不一样。想给你发一声。', '刚路过海边，突然很想告诉你。', '在车站等车，想把这里的一点动静发给你。'],
    emotion: ['刚刚突然想起你，就来问一句。', '你现在在忙吗？我这边刚空下来。', '今天过得怎么样？我想听你说两句。'],
  };
  const pool = variants[draft.eventType];
  const picked = pool[Math.abs(variantSeed) % pool.length];
  if (tone === 'low') return picked.replace(/想你/g, '想到你').replace(/有没有想我/g, '今天还好吗');
  if (tone === 'high' && !/[？?]$/.test(picked)) return `${picked} 你呢？`;
  return picked;
}

export function buildRandomProactiveMessageWrites(
  context: ActiveEventContext,
  options: BuildRandomProactiveOptions,
): RandomProactiveMessageWrite[] {
  const now = options.now || Date.now();
  if (!options.enabled || !Number.isFinite(now) || context.characters.length === 0) return [];
  const triggerMode = options.triggerMode || 'auto';
  const isManualTest = triggerMode === 'manual_test';
  const dateKey = getDateKey(now);
  const slotKey = getSlotKey(now);
  const roll = options.probabilityRoll ?? Math.random();
  const maxWrites = options.maxWrites ?? 1;
  const writes: RandomProactiveMessageWrite[] = [];
  for (const character of context.characters) {
    if (writes.length >= maxWrites) break;
    const tone = classifyRandomProactiveTone(character);
    const dailyLimit = getDailyRandomProactiveLimit(tone);
    const todayEvents = context.lifeEvents.filter((event) =>
      event.characterId === character.id
      && event.tags?.includes('随机主动')
      && typeof event.createdAt === 'number'
      && getDateKey(event.createdAt) === dateKey,
    );
    if (!isManualTest) {
      if (todayEvents.length >= dailyLimit) continue;
      const latest = todayEvents.sort((a, b) => b.createdAt - a.createdAt)[0];
      if (latest && now - latest.createdAt < getRandomProactiveCooldownMs(tone)) continue;
    }
    const scheduleDraft = buildScheduleLifeDraft(character, now);
    const probability = tone === 'high' ? 0.26 : tone === 'low' ? 0.035 : 0.1;
    if (!isManualTest && !scheduleDraft && roll > probability) continue;
    const variantSeed = options.variantSeed ?? Math.floor(now / 60000);
    const draft = scheduleDraft || pickRandomLifeDraft(character, variantSeed);
    const sourceId = isManualTest
      ? `random-proactive-test-${character.id}-${dateKey}-${draft.sourcePart}-${slotKey}-${now}`
      : `random-proactive-${character.id}-${dateKey}-${draft.sourcePart}-${slotKey}`;
    if (context.lifeEvents.some((event) => event.sourceId === sourceId)) continue;
    const content = composeRandomProactiveContent(draft, tone, variantSeed);
    writes.push({
      chatTarget: { characterId: character.id, channel: 'wechat' },
      chatMessage: {
        id: createId('msg'),
        role: 'model',
        content,
        timestamp: now,
        kind: 'text',
      },
      lifeEvent: {
        type: 'chat',
        app: 'wechat',
        characterId: character.id,
        title: `${character.name} 随机主动`,
        summary: `${draft.summary} 消息：${content}`,
        importance: 3,
        sourceId,
        readableByChar: true,
        tags: ['随机主动', draft.tag, draft.sceneLabel],
        createdAt: now,
      },
      appLog: {
        type: 'info',
        title: 'char随机主动已发送',
        detail: `character=${character.id}; tone=${tone}; event=${draft.eventType}; mode=${triggerMode}; source_id=${sourceId}`,
      },
    });
  }
  return writes;
}

function getReminderTaskFromEvent(event: CalendarEvent) {
  return (event.title || '')
    .replace(/^每天\s*\d{1,2}:\d{2}\s*提醒[:：]?/, '')
    .replace(/^提醒[:：]?/, '')
    .trim()
    || event.note?.replace(/^用户在微信里要求长期提醒[:：]?/, '').trim()
    || event.title
    || '这件事';
}

function getOccurrenceKey(event: CalendarEvent, now: number) {
  const date = new Date(now);
  return `${event.id}-${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

function isDailyReminderDue(event: CalendarEvent, now: number) {
  if (event.repeat !== 'daily') return false;
  if (!event.tags.includes('主动提醒')) return false;
  const target = new Date(event.reminderAt || event.startAt);
  const current = new Date(now);
  const targetMinuteOfDay = target.getHours() * 60 + target.getMinutes();
  const currentMinuteOfDay = current.getHours() * 60 + current.getMinutes();
  return currentMinuteOfDay >= targetMinuteOfDay && currentMinuteOfDay - targetMinuteOfDay <= 10;
}

export function buildDueProactiveReminderWrites({
  calendarEvents,
  lifeEvents,
  characters,
  now = Date.now(),
  enabled,
}: {
  calendarEvents: CalendarEvent[];
  lifeEvents: LifeEvent[];
  characters: Character[];
  now?: number;
  enabled: boolean;
}): ProactiveReminderWrite[] {
  if (!enabled) return [];
  const sentSourceIds = new Set(lifeEvents.map((event) => event.sourceId).filter(Boolean));
  return calendarEvents
    .filter((event) => event.characterId && isDailyReminderDue(event, now))
    .flatMap((event): ProactiveReminderWrite[] => {
      const occurrenceKey = getOccurrenceKey(event, now);
      const sourceId = `active-reminder-${occurrenceKey}`;
      if (sentSourceIds.has(sourceId)) return [];
      const character = characters.find((item) => item.id === event.characterId);
      if (!character || !event.characterId) return [];
      const timeContext = getActiveEventTimeContext(now, character);
      const task = getReminderTaskFromEvent(event);
      const content = `现在是${timeContext.timeLabel}，提醒你：${task}`;
      return [{
        calendarEventId: event.id,
        chatTarget: { characterId: event.characterId, channel: 'wechat' },
        chatMessage: {
          id: createId('msg'),
          role: 'model',
          content,
          timestamp: now,
          kind: 'text',
        },
        lifeEvent: {
          id: createId('life'),
          type: 'calendar',
          app: 'wechat',
          characterId: event.characterId,
          title: `主动提醒：${shortText(task, 24)}`,
          summary: content,
          importance: 4,
          sourceId,
          readableByChar: true,
          tags: ['主动提醒', '长期记忆', '微信'],
          createdAt: now,
        },
      }];
    });
}
