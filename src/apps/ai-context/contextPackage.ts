import type { Character, ChatMessage } from '../../store';
import { useAppStore } from '../../store';
import { buildXiaohongshuContext } from '../xiaohongshu/xiaohongshuLogic';
import { describeChatMessage } from '../shared/aiText';

export type ContextRangeKey = 'today' | '1d' | '3d' | '5d' | '7d';
export type ContextBudgetKey = 'light' | 'standard' | 'full';

export const contextRangeOptions: Array<{ id: ContextRangeKey; label: string; days: number; desc: string }> = [
  { id: 'today', label: '今天', days: 0, desc: '当天 00:00 到现在' },
  { id: '1d', label: '近1天', days: 1, desc: '往前 24 小时' },
  { id: '3d', label: '近3天', days: 3, desc: '短期连续剧情' },
  { id: '5d', label: '近5天', days: 5, desc: '默认推荐' },
  { id: '7d', label: '近7天', days: 7, desc: '周总结' },
];

export const contextBudgetOptions: Record<ContextBudgetKey, { label: string; min: number; max: number }> = {
  light: { label: '轻量', min: 8000, max: 12000 },
  standard: { label: '标准', min: 15000, max: 25000 },
  full: { label: '完整', min: 30000, max: 50000 },
};

export type ContextPreviewRow = {
  sectionId: string;
  excluded: boolean;
  app: string;
  range: string;
  content: string;
  count: number;
  method: string;
  chars: number;
  detail: string;
};

function getContextRangeStart(range: ContextRangeKey) {
  const now = Date.now();
  if (range === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
  const option = contextRangeOptions.find((item) => item.id === range);
  return now - (option?.days || 5) * 24 * 60 * 60 * 1000;
}

function formatContextDateTime(time: number) {
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeText(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '暂无内容';
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function isHighImportanceMessage(message: ChatMessage) {
  if (message.favorite) return true;
  const text = `${message.content} ${message.transcript || ''} ${message.stickerLabel || ''}`;
  return /喜欢|想你|生气|难过|吃醋|对不起|约定|承诺|分手|和好|秘密|不要告诉|记住|设定|以后|永远|讨厌|害怕|崩溃|抱抱/.test(text);
}

function getSessionMessages(
  chatSessions: Record<string, { messages: ChatMessage[] }>,
  channel: 'wechat' | 'qq',
  targetId: string,
  startAt: number,
  limit: number,
) {
  const session = chatSessions[`${channel}:${targetId}`];
  return (session?.messages || [])
    .filter((message) => message.timestamp >= startAt)
    .slice(-limit);
}

function buildChatSection({
  title,
  messages,
  character,
  speakers,
}: {
  title: string;
  messages: ChatMessage[];
  character: Character;
  speakers: Character[];
}) {
  const important = messages.filter(isHighImportanceMessage).slice(-18);
  const recent = messages.slice(-30);
  const importantLines = important.map((message, index) => {
    const speaker = message.role === 'user'
      ? '用户'
      : message.speakerId
        ? speakers.find((item) => item.id === message.speakerId)?.name || character.name
        : character.name;
    return `${index + 1}. ${formatContextDateTime(message.timestamp)} ${speaker}：${describeChatMessage(message, true, speakers)}`;
  });
  const recentLines = recent.map((message) => {
    const speaker = message.role === 'user'
      ? '用户'
      : message.speakerId
        ? speakers.find((item) => item.id === message.speakerId)?.name || character.name
        : character.name;
    return `- ${formatContextDateTime(message.timestamp)} ${speaker}：${summarizeText(describeChatMessage(message, true, speakers), 80)}`;
  });
  return [
    `【${title}】`,
    `消息数量：${messages.length}`,
    importantLines.length ? '关键原话：' : '关键原话：暂无',
    ...importantLines,
    recentLines.length ? '最近聊天摘要：' : '最近聊天摘要：暂无',
    ...recentLines,
  ].join('\n');
}

export function buildContextPackage({
  character,
  range,
  wechatLimit,
  qqLimit,
  excludedSectionIds = [],
  state,
}: {
  character: Character;
  range: ContextRangeKey;
  wechatLimit: number;
  qqLimit: number;
  excludedSectionIds?: string[];
  state: ReturnType<typeof useAppStore.getState>;
}) {
  const startAt = getContextRangeStart(range);
  const now = Date.now();
  const rangeLabel = `${formatContextDateTime(startAt)} - ${formatContextDateTime(now)}`;
  const todayStart = getContextRangeStart('today');
  const previewRows: ContextPreviewRow[] = [];
  const sections: string[] = [];
  const excludedSections = new Set(excludedSectionIds);
  const addSection = (row: Omit<ContextPreviewRow, 'chars' | 'detail' | 'excluded'>, content: string) => {
    const chars = content.length;
    const excluded = excludedSections.has(row.sectionId);
    previewRows.push({ ...row, excluded, chars, detail: content });
    if (!excluded) sections.push(content);
  };

  const wechatMessages = getSessionMessages(state.chatSessions, 'wechat', character.id, startAt, wechatLimit);
  const qqMessages = getSessionMessages(state.chatSessions, 'qq', character.id, startAt, qqLimit);
  addSection(
    { sectionId: 'wechat-direct', app: '微信单聊', range: rangeLabel, content: `${character.name} 私聊`, count: wechatMessages.length, method: '关键原话 + 最近摘要' },
    buildChatSection({ title: `${character.name} / 微信单聊`, messages: wechatMessages, character, speakers: state.characters }),
  );
  addSection(
    { sectionId: 'qq-direct', app: 'QQ单聊', range: rangeLabel, content: `${character.name} 私聊`, count: qqMessages.length, method: '关键原话 + 最近摘要' },
    buildChatSection({ title: `${character.name} / QQ单聊`, messages: qqMessages, character, speakers: state.characters }),
  );

  const buildGroupContextSections = (channel: 'wechat' | 'qq', label: string, limit: number) => state.groupChats
    .filter((group) => group.memberIds.includes(character.id))
    .map((group) => {
      const messages = getSessionMessages(state.chatSessions, channel, group.id, startAt, Math.min(limit, 200));
      return { group, messages, content: buildChatSection({ title: `${character.name} / ${label} / ${group.name}`, messages, character, speakers: state.characters }) };
    })
    .filter((item) => item.messages.length > 0);

  const wechatGroupSections = buildGroupContextSections('wechat', '微信群聊', wechatLimit);
  if (wechatGroupSections.length > 0) {
    const content = wechatGroupSections.map((item) => item.content).join('\n\n');
    addSection(
      { sectionId: 'wechat-groups', app: '微信群聊', range: rangeLabel, content: `${character.name} 参与的微信群聊`, count: wechatGroupSections.reduce((sum, item) => sum + item.messages.length, 0), method: '只含当前角色参与群' },
      content,
    );
  }

  const qqGroupSections = buildGroupContextSections('qq', 'QQ群聊', qqLimit);
  if (qqGroupSections.length > 0) {
    const content = qqGroupSections.map((item) => item.content).join('\n\n');
    addSection(
      { sectionId: 'qq-groups', app: 'QQ群聊', range: rangeLabel, content: `${character.name} 参与的 QQ 群聊`, count: qqGroupSections.reduce((sum, item) => sum + item.messages.length, 0), method: '只含当前角色参与群' },
      content,
    );
  }

  const diaryEntries = state.diaries
    .filter((entry) => entry.createdAt >= startAt)
    .filter((entry) => entry.owner === 'user' || entry.characterId === character.id);
  const diaryContent = [
    `【${character.name} / 日记关联】`,
    ...diaryEntries.map((entry) => {
      const isToday = entry.createdAt >= todayStart;
      const owner = entry.owner === 'char' ? character.name : '用户';
      const body = isToday ? summarizeText(entry.content, 900) : summarizeText(entry.content, 120);
      return `- ${formatContextDateTime(entry.createdAt)} ${owner}《${entry.title}》${entry.mood ? ` 情绪：${entry.mood}` : ''}\n  ${isToday ? '当天内容' : '旧日记摘要'}：${body}`;
    }),
  ].join('\n');
  addSection(
    { sectionId: 'diary', app: '日记', range: rangeLabel, content: '当天较完整，旧日记摘要', count: diaryEntries.length, method: '当天正文 / 旧日记50-120字' },
    diaryContent,
  );

  const browserItems = [
    ...state.browserSearches.filter((item) => item.createdAt >= startAt).map((item) => `搜索：${item.query}。${summarizeText(item.summary, 100)}`),
    ...state.browserHistory.filter((item) => item.visitedAt >= startAt).map((item) => `访问：${item.title} ${item.query ? `（来自搜索：${item.query}）` : ''}`),
    ...state.browserBookmarks.filter((item) => item.createdAt >= startAt).map((item) => `收藏：${item.title}。${summarizeText(item.snippet, 80)}`),
  ].slice(0, 30);
  const browserContent = [
    `【${character.name} / 浏览与内容消费】`,
    '说明：浏览器只作为兴趣和状态线索；搜索过不等于世界事实。',
    state.browserWorldBook ? `世界书摘要：${summarizeText(state.browserWorldBook, 600)}` : '世界书摘要：暂无',
    browserItems.length ? '最近浏览主题：' : '最近浏览主题：暂无',
    ...browserItems.map((item) => `- ${item}`),
  ].join('\n');
  addSection(
    { sectionId: 'browser', app: '浏览器', range: rangeLabel, content: '兴趣和搜索主题', count: browserItems.length, method: '聚合总结' },
    browserContent,
  );

  const xiaohongshuNotes = state.xiaohongshuNotes.filter((note) => note.createdAt >= startAt);
  addSection(
    { sectionId: 'xiaohongshu', app: '小红书', range: rangeLabel, content: '图文笔记、标签、收藏状态', count: xiaohongshuNotes.length, method: '只读取小红书条目' },
    buildXiaohongshuContext(xiaohongshuNotes, 20),
  );

  const listenRecords = state.musicListenRecords
    .filter((record) => record.createdAt >= startAt && record.characterId === character.id)
    .slice(0, 30);
  const charTracks = state.musicTracks
    .filter((track) => track.characterId === character.id || track.source === 'char')
    .filter((track) => (track.lastPlayedAt || track.createdAt) >= startAt)
    .slice(0, 20);
  const musicContent = [
    `【${character.name} / 音乐】`,
    `一起听次数：${listenRecords.length}`,
    ...listenRecords.map((record) => {
      const track = state.musicTracks.find((item) => item.id === record.trackId);
      return `- ${formatContextDateTime(record.createdAt)} 一起听：${track?.title || '未知歌曲'}${record.durationSeconds ? `，约 ${Math.round(record.durationSeconds / 60)} 分钟` : ''}${record.note ? `。备注：${record.note}` : ''}`;
    }),
    charTracks.length ? 'char 相关歌曲：' : 'char 相关歌曲：暂无',
    ...charTracks.map((track) => `- ${track.title} / ${track.artist}${track.liked ? '（我喜欢）' : ''}${track.lyrics ? `。歌词摘要：${summarizeText(track.lyrics, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { sectionId: 'music', app: '音乐', range: rangeLabel, content: '一起听、最近播放、char创作', count: listenRecords.length + charTracks.length, method: '摘要 + 排行' },
    musicContent,
  );

  const photos = state.galleryPhotos
    .filter((photo) => photo.createdAt >= startAt)
    .filter((photo) => photo.characterId === character.id || photo.readableByChar)
    .slice(0, 20);
  const galleryContent = [
    `【${character.name} / 相册】`,
    ...photos.map((photo) => `- ${formatContextDateTime(photo.createdAt)} ${photo.title}。标签：${photo.tags.join('、') || '无'}${photo.note ? `。备注：${summarizeText(photo.note, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { sectionId: 'gallery', app: '相册', range: rangeLabel, content: `可给 ${character.name} 看或关联该角色`, count: photos.length, method: '标题 + 标签 + 备注' },
    galleryContent,
  );

  const memos = state.memos
    .filter((memo) => memo.createdAt >= startAt || (memo.reminderAt || 0) >= startAt)
    .filter((memo) => !memo.characterId || memo.characterId === character.id || memo.readableByChar)
    .slice(0, 20);
  const events = state.calendarEvents
    .filter((event) => event.startAt >= startAt || event.createdAt >= startAt)
    .filter((event) => event.owner === 'shared' || event.owner === 'user' || event.characterId === character.id)
    .slice(0, 20);
  const taskContent = [
    `【${character.name} / 备忘录与日历】`,
    memos.length ? '备忘录：' : '备忘录：暂无',
    ...memos.map((memo) => `- ${memo.completed ? '已完成' : '未完成'} ${memo.title}：${summarizeText(memo.content, 80)}`),
    events.length ? '日历：' : '日历：暂无',
    ...events.map((event) => `- ${formatContextDateTime(event.startAt)} ${event.title}${event.note ? `：${summarizeText(event.note, 80)}` : ''}`),
  ].join('\n');
  addSection(
    { sectionId: 'memo-calendar', app: '备忘录/日历', range: rangeLabel, content: '待办、约定、未来事件', count: memos.length + events.length, method: '摘要' },
    taskContent,
  );

  const relationshipSignals = [
    wechatMessages.length ? `微信 ${wechatMessages.length} 条` : '',
    qqMessages.length ? `QQ ${qqMessages.length} 条` : '',
    listenRecords.length ? `一起听 ${listenRecords.length} 次` : '',
    diaryEntries.length ? `关联日记 ${diaryEntries.length} 篇` : '',
  ].filter(Boolean).join('，') || '暂无明显新互动';

  const header = [
    '你将接收一份小手机 App 的跨软件上下文总结。请把它当作长期记忆和当前状态参考。',
    '',
    '要求：',
    '1. 优先遵守用户当前消息。',
    '2. 使用总结中的事实保持连续性。',
    '3. 不要把总结逐字复述给用户。',
    '4. 当信息冲突时，以时间更新的记录为准。',
    '5. 默认只使用当前角色相关上下文，不要主动提其他角色私密内容。',
    '6. 如果缺少关键信息，先自然询问，不要编造。',
    '',
    `当前角色：${character.name}`,
    `汇总范围：${rangeLabel}`,
    `聊天数量上限：微信 ${wechatLimit} / QQ ${qqLimit}`,
    '',
    '【全局摘要】',
    `用户昵称：${state.userName || '我'}。本次按现实时间汇总，只发送 ${character.name} 相关内容。最近关系线索：${relationshipSignals}。`,
    '',
    '【当前角色状态】',
    `角色：${character.name}`,
    `人设摘要：${summarizeText([character.description, character.personality].filter(Boolean).join(' '), 240)}`,
    `待延续事项：优先延续高重要聊天、当天日记、一起听记录和未完成待办。`,
    '',
    '【各软件详细信息】',
  ].join('\n');

  const text = `${header}\n\n${sections.join('\n\n')}`;
  return { text, previewRows, rangeLabel, totalChars: text.length };
}

