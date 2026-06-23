import { Bell, Check, Clock, FileText, Image as ImageIcon, MessageCircle, Music, RefreshCw, Sparkles } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

import { cn, createId } from '../../lib/utils';
import { buildChatImagePrompt, evaluateImageGenerationGate, requestNaiImage } from '../../lib/naiImage';
import { useAppStore } from '../../store';
import { Empty, Header, Panel } from '../shared/AppPrimitives';
import {
  ACTIVE_EVENT_REFRESH_COOLDOWN_MS,
  buildActiveEventWrites,
  buildRandomProactiveMessageWrites,
  buildTodayLifeRefreshSuggestions,
  type ActiveEventSuggestion,
} from './activeEventsLogic';

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
    generatedImageRecords,
    recordGeneratedImage,
    activeUserProfileId,
    userName,
  } = state;
  const [suggestions, setSuggestions] = useState<ActiveEventSuggestion[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [status, setStatus] = useState('等待手动刷新');
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(() =>
    Math.max(0, ACTIVE_EVENT_REFRESH_COOLDOWN_MS - (Date.now() - activeEventLastRefreshAt)),
  );

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
        const imageUrl = await requestNaiImage({
          config: imageGenerationConfig,
          prompt: fullPrompt,
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
