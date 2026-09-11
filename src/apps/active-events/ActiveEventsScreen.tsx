import { Bell, Check, Clock, FileText, Image as ImageIcon, MessageCircle, Music, RefreshCw, Save, Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { cn, createId } from '../../lib/utils';
import { requestAppImage } from '../../lib/appImageGeneration';
import { buildChatImagePrompt, evaluateImageGenerationGate } from '../../lib/naiImage';
import { useAppStore } from '../../store';
import { Empty, Header, Panel } from '../shared/AppPrimitives';
import {
  ACTIVE_EVENT_REFRESH_COOLDOWN_MS,
  buildActiveEventWrites,
  buildCharacterProactiveReminderSetup,
  buildRandomProactiveMessageWrites,
  buildTodayLifeRefreshSuggestions,
  type ActiveEventSuggestion,
} from './activeEventsLogic';
import {
  getProactiveReminderClientId,
  registerBackendProactiveReminder,
  scheduleNativeLocalProactiveReminder,
} from './proactiveReminderClient';

const actionLabels: Record<ActiveEventSuggestion['action'], string> = {
  send_message: '发消息',
  send_image: '发图片',
  write_diary: '写日记',
  recommend_music: '推荐歌',
  post_social: '发动态',
  create_notification: '创建提醒',
};

const actionIcons: Record<ActiveEventSuggestion['action'], React.ReactNode> = {
  send_message: <MessageCircle />,
  send_image: <ImageIcon />,
  write_diary: <FileText />,
  recommend_music: <Music />,
  post_social: <Sparkles />,
  create_notification: <Bell />,
};

function formatCooldown(ms: number) {
  if (ms <= 0) return '可以刷新';
  const hours = Math.floor(ms / 60 / 60 / 1000);
  const minutes = Math.ceil((ms - hours * 60 * 60 * 1000) / 60 / 1000);
  if (hours <= 0) return `${minutes} 分钟后`;
  return `${hours} 小时 ${minutes} 分钟后`;
}

function SuggestionCard({
  suggestion,
  confirmed,
  onConfirm,
}: {
  key?: React.Key;
  suggestion: ActiveEventSuggestion;
  confirmed: boolean;
  onConfirm: (suggestion: ActiveEventSuggestion) => void;
}) {
  return (
    <article className="mb-3 rounded-[18px] border-[3px] border-[#111] bg-white/70 p-4 shadow-[2px_3px_0_rgba(0,0,0,0.12)] last:mb-0">
      <div className="flex items-start gap-3">
        <div className="app-chip">
          {actionIcons[suggestion.action]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-base font-black">{suggestion.title}</p>
            <span className="shrink-0 rounded-full border-[2px] border-[#111]/20 bg-white px-2 py-1 text-[10px] font-black">
              {actionLabels[suggestion.action]}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold leading-5">{suggestion.preview}</p>
          <p className="mt-2 text-xs font-black opacity-55">{suggestion.reason}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onConfirm(suggestion)}
        disabled={confirmed}
        className={cn('fetch-button mt-4', confirmed && 'bg-[#dceecd] opacity-70')}
      >
        {confirmed ? <Check className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        {confirmed ? '已写入' : '确认写入'}
      </button>
    </article>
  );
}
export function ActiveEventsScreen() {
  const state = useAppStore();
  const {
    activeEventLastRefreshAt,
    setActiveEventLastRefreshAt,
    activeReminderAutomationEnabled,
    setActiveReminderAutomationEnabled,
    randomProactiveMessagesEnabled,
    setRandomProactiveMessagesEnabled,
    addMessage,
    addDiary,
    addWechatMoment,
    addMusicListenRecord,
    addLifeEvent,
    addAppLog,
    addGalleryPhoto,
    imageGenerationConfig,
    imageGenerationEnabled,
    proactiveImageGenerationEnabled,
    generatedImageRecords,
    recordGeneratedImage,
    activeUserProfileId,
    userName,
    addCalendarEvent,
    updateCalendarEvent,
  } = state;
  const [suggestions, setSuggestions] = useState<ActiveEventSuggestion[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [status, setStatus] = useState('等待手动刷新');
  const [scheduleDraft, setScheduleDraft] = useState({
    characterId: state.characters[0]?.id || '',
    time: '08:00',
  });
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(() =>
    Math.max(0, ACTIVE_EVENT_REFRESH_COOLDOWN_MS - (Date.now() - activeEventLastRefreshAt)),
  );

  useEffect(() => {
    if (scheduleDraft.characterId || state.characters.length === 0) return;
    setScheduleDraft((draft) => ({ ...draft, characterId: state.characters[0]?.id || '' }));
  }, [scheduleDraft.characterId, state.characters]);

  const context = useMemo(() => ({
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
  }), [state]);

  const refreshTodayLife = () => {
    const now = Date.now();
    const result = buildTodayLifeRefreshSuggestions(context, {
      now,
      lastRefreshAt: activeEventLastRefreshAt,
    });
    setCooldownRemainingMs(result.cooldownRemainingMs);
    if (!result.canRefresh) {
      setStatus(`冷却中，${formatCooldown(result.cooldownRemainingMs)}可再次刷新`);
      return;
    }

    setActiveEventLastRefreshAt(now);
    setSuggestions(result.suggestions);
    setConfirmedIds([]);
    setCooldownRemainingMs(ACTIVE_EVENT_REFRESH_COOLDOWN_MS);
    setStatus(result.suggestions.length > 0 ? `生成 ${result.suggestions.length} 条建议` : '今天还没有足够的新线索');
  };

  const confirmSuggestion = async (suggestion: ActiveEventSuggestion) => {
    if (confirmedIds.includes(suggestion.id)) return;
    const writes = buildActiveEventWrites(suggestion);
    if (writes.chatTarget && writes.imagePrompt) {
      if (!imageGenerationEnabled || !proactiveImageGenerationEnabled) {
        addAppLog({
          type: 'info',
          title: 'char 主动生图已跳过',
          detail: !imageGenerationEnabled ? '生图总开关已关闭。' : '主动生图开关已关闭。',
        });
        setConfirmedIds((ids) => [...ids, suggestion.id]);
        setStatus('主动生图已关闭，本次没有消耗额度。');
        return;
      }
      setStatus(`正在生成图片：${suggestion.title}`);
      const now = Date.now();
      const imageId = createId('image');
      const channelId = `${writes.chatTarget.channel}:${writes.chatTarget.characterId}`;
      const userId = activeUserProfileId || userName || 'local-user';
      const imageCharacter = state.characters.find((character) => character.id === writes.chatTarget?.characterId);
      const fullPrompt = buildChatImagePrompt({
        prompt: writes.imagePrompt,
        speakerName: imageCharacter?.name,
        characterTags: imageCharacter?.imagePromptTags,
        context: 'wechat',
      });
      const gate = evaluateImageGenerationGate({
        now,
        characterId: writes.chatTarget.characterId,
        channelId,
        userId,
        prompt: fullPrompt,
        triggerType: 'proactive',
        records: generatedImageRecords,
      });
      const logBase = `trigger=proactive; user=${userId}; bot=${writes.chatTarget.channel}; character=${writes.chatTarget.characterId}; channel=${channelId}; prompt_hash=${gate.promptHash}; model=${imageGenerationConfig.model}; size=${imageGenerationConfig.width}x${imageGenerationConfig.height}`;
      if (!gate.allowed) {
        addAppLog({ type: 'info', title: 'char 主动生图被限制', detail: `${logBase}; blocked=${gate.reason}` });
        setStatus(`生图被限制：${gate.reason}`);
        return;
      }
      addAppLog({ type: 'image', title: 'char 主动生图开始', detail: logBase });
      try {
        const imageUrl = await requestAppImage({
          config: imageGenerationConfig,
          prompt: fullPrompt,
          triggerType: 'proactive',
          imageGenerationEnabled,
          proactiveImageGenerationEnabled,
          source: 'proactive',
        });
        addMessage(writes.chatTarget.characterId, writes.chatTarget.channel, {
          id: createId('msg'),
          role: 'model',
          content: imageUrl,
          timestamp: Date.now(),
          kind: 'image',
          stickerLabel: suggestion.title,
        });
        const galleryPhotoId = addGalleryPhoto({
          url: imageUrl,
          title: suggestion.title,
          description: writes.imagePrompt,
          album: '聊天',
          tags: ['char主动', 'AI生图'],
          source: 'chat',
          characterId: writes.chatTarget.characterId,
          readableByChar: true,
        });
        recordGeneratedImage({
          imageId,
          botId: writes.chatTarget.channel,
          characterId: writes.chatTarget.characterId,
          guildId: 'local-small-phone',
          channelId,
          userId,
          triggerType: 'proactive',
          promptHash: gate.promptHash,
          promptText: fullPrompt,
          storageUrl: imageUrl,
          galleryPhotoId,
          createdAt: now,
          width: imageGenerationConfig.width,
          height: imageGenerationConfig.height,
          model: imageGenerationConfig.model,
          status: 'success',
        });
        addAppLog({ type: 'image', title: 'char 主动生图成功', detail: `${logBase}; image_id=${imageId}; gallery_photo_id=${galleryPhotoId}; storage_url=data-url/gallery` });
      } catch (error) {
        const detail = error instanceof Error ? error.message : '未知错误';
        recordGeneratedImage({
          imageId,
          botId: writes.chatTarget.channel,
          characterId: writes.chatTarget.characterId,
          guildId: 'local-small-phone',
          channelId,
          userId,
          triggerType: 'proactive',
          promptHash: gate.promptHash,
          promptText: fullPrompt,
          createdAt: now,
          width: imageGenerationConfig.width,
          height: imageGenerationConfig.height,
          model: imageGenerationConfig.model,
          status: 'failure',
          error: detail,
        });
        addAppLog({ type: 'error', title: 'char 主动生图失败', detail: `${logBase}; error=${detail}` });
        setStatus(`生图失败：${detail}`);
        return;
      }
    }
    if (writes.chatTarget && writes.chatMessage) {
      addMessage(writes.chatTarget.characterId, writes.chatTarget.channel, writes.chatMessage);
    }
    if (writes.diaryEntry) addDiary(writes.diaryEntry);
    if (writes.wechatMoment) addWechatMoment(writes.wechatMoment);
    if (writes.musicListenRecord) addMusicListenRecord(writes.musicListenRecord);
    if (writes.appLog) addAppLog(writes.appLog);
    addLifeEvent(writes.lifeEvent);
    setConfirmedIds((ids) => [...ids, suggestion.id]);
    setStatus(`已写入：${suggestion.title}`);
  };

  const testRandomProactiveMessage = () => {
    const now = Date.now();
    const writes = buildRandomProactiveMessageWrites(context, {
      now,
      enabled: true,
      probabilityRoll: 0,
      variantSeed: Math.floor(now / 1000),
      maxWrites: 1,
      triggerMode: 'manual_test',
    });
    if (writes.length === 0) {
      setStatus('没有可测试的随机主动角色');
      return;
    }
    for (const write of writes) {
      addMessage(write.chatTarget.characterId, write.chatTarget.channel, write.chatMessage);
      addLifeEvent(write.lifeEvent);
      addAppLog(write.appLog);
    }
    setStatus(`测试已写入：${writes[0].lifeEvent.title}`);
  };

  const saveCharacterProactiveSchedule = async () => {
    const character = state.characters.find((item) => item.id === scheduleDraft.characterId);
    if (!character) {
      setStatus('请先选择一个角色');
      return;
    }
    const match = scheduleDraft.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      setStatus('时间格式需要是 HH:mm');
      return;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setStatus('时间需要在 00:00 到 23:59 之间');
      return;
    }
    const setup = buildCharacterProactiveReminderSetup({
      character,
      hour,
      minute,
      clientId: getProactiveReminderClientId(),
    });
    const existing = state.calendarEvents.find((event) => event.id === setup.calendarEvent.id);
    if (existing) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...updates } = setup.calendarEvent;
      updateCalendarEvent(existing.id, updates);
    } else {
      addCalendarEvent(setup.calendarEvent);
    }
    setActiveReminderAutomationEnabled(true);
    const localScheduled = scheduleNativeLocalProactiveReminder(setup.nativeLocalReminder);
    try {
      const result = await registerBackendProactiveReminder(setup.backendReminder);
      addAppLog({
        type: 'info',
        title: '角色主动定时已保存',
        detail: `character=${character.id}; time=${scheduleDraft.time}; backend=${result?.skipped ? 'skipped' : 'registered'}; native_local=${localScheduled ? 'scheduled' : 'unavailable'}`,
      });
      setStatus(result?.skipped
        ? `已保存：${character.name} 每天 ${scheduleDraft.time} 主动联系；后端未配置`
        : `已保存：${character.name} 每天 ${scheduleDraft.time} 主动联系`);
    } catch (error) {
      addAppLog({
        type: 'error',
        title: '角色主动后端注册失败',
        detail: error instanceof Error ? error.message : String(error),
      });
      setStatus(`本地已保存，后端注册失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const configuredSchedules = state.calendarEvents
    .filter((event) => event.tags.includes('角色主动') && event.tags.includes('玩家设置'))
    .slice()
    .sort((a, b) => a.startAt - b.startAt);

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="char 主动" subtitle={status} />

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black">刷新 char 主动</p>
            <p className="mt-1 text-sm font-bold opacity-60">上次刷新：{activeEventLastRefreshAt ? new Date(activeEventLastRefreshAt).toLocaleString('zh-CN') : '还没有'}</p>
          </div>
          <span className="app-chip shrink-0">
            <Clock />
          </span>
        </div>
        <button type="button" onClick={refreshTodayLife} className="fetch-button mt-4">
          <RefreshCw className="h-5 w-5" />
          刷新主动事件
        </button>
        <button
          type="button"
          onClick={() => setActiveReminderAutomationEnabled(!activeReminderAutomationEnabled)}
          className={cn('fetch-button mt-3', activeReminderAutomationEnabled ? 'bg-[#dceecd]' : 'bg-[#ffd6d6]')}
        >
          <Bell className="h-5 w-5" />
          {activeReminderAutomationEnabled ? '主动提醒已开启' : '主动提醒已关闭'}
        </button>
        <p className="mt-2 text-xs font-black opacity-55">开启后，微信里记下的每日提醒到点会直接主动发送。</p>
        <button
          type="button"
          onClick={() => setRandomProactiveMessagesEnabled(!randomProactiveMessagesEnabled)}
          className={cn('fetch-button mt-3', randomProactiveMessagesEnabled ? 'bg-[#dceecd]' : 'bg-[#ffd6d6]')}
        >
          <Sparkles className="h-5 w-5" />
          {randomProactiveMessagesEnabled ? '随机主动已开启' : '随机主动已关闭'}
        </button>
        <p className="mt-2 text-xs font-black opacity-55">开启后，角色会按人设作息和轻量生活事件低频主动发微信；只在小手机运行期间生效。</p>
        <button type="button" onClick={testRandomProactiveMessage} className="fetch-button mt-3">
          <Sparkles className="h-5 w-5" />
          立即测试随机主动
        </button>
        <p className="mt-3 text-xs font-black opacity-55">再次刷新：{formatCooldown(cooldownRemainingMs)}</p>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black">定时主动弹窗</p>
            <p className="mt-1 text-sm font-bold opacity-60">到点后像微信消息一样浮到手机外层，点弹窗进入聊天。</p>
          </div>
          <span className="app-chip shrink-0">
            <Bell />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <select
            value={scheduleDraft.characterId}
            onChange={(event) => setScheduleDraft((draft) => ({ ...draft, characterId: event.target.value }))}
            className="hand-input min-w-0"
          >
            {state.characters.length > 0 ? state.characters.map((character) => (
              <option key={character.id} value={character.id}>{character.name}</option>
            )) : (
              <option value="">暂无角色</option>
            )}
          </select>
          <input
            type="time"
            value={scheduleDraft.time}
            onChange={(event) => setScheduleDraft((draft) => ({ ...draft, time: event.target.value }))}
            className="hand-input w-[112px]"
          />
        </div>
        <button type="button" onClick={saveCharacterProactiveSchedule} className="fetch-button mt-3" disabled={state.characters.length === 0}>
          <Save className="h-5 w-5" />
          保存主动时间
        </button>
        <div className="mt-4 space-y-2">
          {configuredSchedules.length > 0 ? configuredSchedules.map((event) => {
            const character = state.characters.find((item) => item.id === event.characterId);
            const time = new Date(event.reminderAt || event.startAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={event.id} className="rounded-2xl border-[2px] border-[#111]/15 bg-white/60 px-3 py-2 text-sm font-black">
                {character?.name || '未知角色'} · 每天 {time}
              </div>
            );
          }) : (
            <p className="text-xs font-black opacity-55">还没有玩家设置的定时主动。</p>
          )}
        </div>
      </Panel>

      <Panel>
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              confirmed={confirmedIds.includes(suggestion.id)}
              onConfirm={confirmSuggestion}
            />
          ))
        ) : (
          <Empty text="点刷新后，这里会出现少量可确认的建议。" />
        )}
      </Panel>
    </section>
  );
}
