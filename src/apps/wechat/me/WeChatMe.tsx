import { ChevronRight, CircleUserRound, Grid2X2, Settings, ShoppingBag, Sparkles, Star } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAppStore } from '../../../store';
import { compileChatPresetEntries } from '../presets/chatPresetEntries';
import { createSmallPhonePresetEntries, getSmallPhoneRpMode } from '../presets/smallPhonePreset';
import { clampNumber, describeChatMessage, WeChatAvatar, wechatChatPresets, WeChatTopBar } from '../shared/WeChatShared';

export function WeChatMe() {
  const {
    userName,
    userAvatar,
    setUserName,
    setUserAvatar,
    wechatId,
    setWechatId,
    wechatStatus,
    setWechatStatus,
    characters,
    chatSessions,
    stickers,
    purchaseRecords,
    chatPresetName,
    chatPresetPrompt,
    chatPresetEntries,
    chatContextDepth,
    chatTemperature,
    chatMaxTokens,
    chatReplyStyle,
    setModelConfig,
    setChatPresetEntries,
    setScreen,
  } = useAppStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [meView, setMeView] = useState<'home' | 'favorites' | 'settings'>('home');
  const favoriteMessages = Object.values(chatSessions).flatMap((session) =>
    session.messages
      .filter((message) => message.favorite && !message.recalled)
      .map((message) => ({ ...message, session })),
  );
  const favoriteStickers = stickers.filter((sticker) => sticker.favorite);

  const uploadAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUserAvatar(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (meView === 'favorites') {
    return (
      <div className="wechat-page">
        <WeChatTopBar title="收藏" onBack={() => setMeView('home')} right={<button type="button" onClick={() => setMeView('home')} className="wechat-mini-button">返回</button>} />
        <div className="wechat-list">
          <div className="wechat-section-title">收藏的消息</div>
          {favoriteMessages.length === 0 && <div className="wechat-empty-card">还没有收藏消息。</div>}
          {favoriteMessages.map((message) => {
            const character = characters.find((item) => item.id === message.session.characterId);
            return (
              <article key={`${message.session.id}-${message.id}`} className="wechat-favorite-card">
                <p className="font-semibold">{character?.name || '聊天'}</p>
                <p>{describeChatMessage(message)}</p>
              </article>
            );
          })}
          <div className="wechat-section-title">收藏的表情</div>
          {favoriteStickers.length === 0 && <div className="wechat-empty-card">还没有收藏表情。</div>}
          <div className="wechat-sticker-library">
            {favoriteStickers.map((sticker) => (
              <div key={sticker.id} className="wechat-sticker-card">
                <img src={sticker.url} alt={sticker.label} />
                <p className="mt-2 text-xs font-bold">{sticker.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (meView === 'settings') {
    const applyPreset = (name: string) => {
      const preset = wechatChatPresets.find((item) => item.name === name) || wechatChatPresets[0];
      const nextEntries = preset.entries
        ? createSmallPhonePresetEntries(getSmallPhoneRpMode(preset.replyStyle), chatPresetEntries)
        : [];
      setChatPresetEntries(nextEntries, preset.name);
      setModelConfig({
        chatPresetName: preset.name,
        chatPresetPrompt: nextEntries.length > 0 ? compileChatPresetEntries(nextEntries, { replyStyle: preset.replyStyle }) : preset.prompt,
        chatContextDepth: preset.contextDepth,
        chatTemperature: preset.temperature,
        chatMaxTokens: preset.maxTokens,
        chatReplyStyle: preset.replyStyle,
      });
    };

    return (
      <div className="wechat-page">
        <WeChatTopBar title="微信设置" onBack={() => setMeView('home')} right={<button type="button" onClick={() => setMeView('home')} className="wechat-mini-button">返回</button>} />
        <div className="wechat-list">
          <section className="wechat-photo-wall">
            <h2>聊天预设</h2>
            <p>微信和 QQ 共用这里的当前预设；导入、增删、开关和排序请到桌面的“预设”App。</p>
            <select value={chatPresetName} onChange={(event) => applyPreset(event.target.value)} className="wechat-inline-input mt-3">
              {!wechatChatPresets.some((preset) => preset.name === chatPresetName) && <option value={chatPresetName}>{chatPresetName}</option>}
              {wechatChatPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
            </select>
            <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-sm font-bold dark:border-white/10 dark:bg-white/[0.04]">
              {chatPresetEntries.length > 0
                ? `当前：${chatPresetName} · 共 ${chatPresetEntries.length} 条 · 已开启 ${chatPresetEntries.filter((entry) => entry.enabled).length} 条`
                : `当前：${chatPresetName} · 单段预设`}
            </div>
            <button type="button" onClick={() => setScreen('presets')} className="wechat-mini-button mt-3 w-full">去预设 App 管理条目</button>
          </section>
          <section className="wechat-photo-wall">
            <h2>生成参数</h2>
            <label className="wechat-setting-row">
              <span>上下文消息数</span>
              <div className="wechat-setting-control">
                <input type="range" min={1} max={1000} value={chatContextDepth} onChange={(event) => setModelConfig({ chatContextDepth: Number(event.target.value) })} />
                <input type="number" min={1} max={1000} value={chatContextDepth} onChange={(event) => setModelConfig({ chatContextDepth: clampNumber(Number(event.target.value), 1, 1000) })} />
              </div>
            </label>
            <label className="wechat-setting-row">
              <span>温度 {chatTemperature.toFixed(2)}</span>
              <div className="wechat-setting-control">
                <input type="range" min={0.1} max={1.6} step={0.05} value={chatTemperature} onChange={(event) => setModelConfig({ chatTemperature: Number(event.target.value) })} />
              </div>
            </label>
            <label className="wechat-setting-row">
              <span>最大回复长度（Token 上限，实际回复可更短）</span>
              <input type="number" min={120} max={4000} step={20} value={chatMaxTokens} onChange={(event) => setModelConfig({ chatMaxTokens: clampNumber(Number(event.target.value), 120, 4000) })} />
            </label>
            <p className="mt-2 text-xs font-bold leading-5 opacity-60">当前为{chatReplyStyle === 'single' ? '长 RP（完整单气泡）' : '短 RP（多条完整短气泡）'}。短 / 长只在上方“聊天预设”切换；括号是否出现由预设 App 里的“括号风格”条目决定。</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="wechat-page">
      <WeChatTopBar title="我" right={<Grid2X2 className="h-5 w-5" />} />
      <div className="wechat-me-hero">
        <button type="button" onClick={() => avatarInputRef.current?.click()} className="wechat-avatar-upload-button" aria-label="更换头像">
          <WeChatAvatar src={userAvatar} name={userName} large />
          <span>换头像</span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        <div className="min-w-0 flex-1">
          <input value={userName} onChange={(event) => setUserName(event.target.value)} className="wechat-profile-name" />
          <div className="wechat-profile-id">
            <span>微信号</span>
            <input value={wechatId} onChange={(event) => setWechatId(event.target.value)} aria-label="微信号" />
          </div>
          <div className="wechat-profile-chips">
            <span>{wechatStatus || '设个状态'}</span>
            <span>{characters.length || 0}个朋友</span>
            <span className="dot" />
          </div>
        </div>
      </div>
      <div className="wechat-list">
        <label className="wechat-menu-row">
          <span className="wechat-color-icon green"><CircleUserRound className="h-5 w-5" /></span>
          <span>状态</span>
          <input value={wechatStatus} onChange={(event) => setWechatStatus(event.target.value)} placeholder="设个状态" className="wechat-row-input" />
        </label>
        <button type="button" onClick={() => setMeView('favorites')} className="wechat-menu-row">
          <span className="wechat-color-icon yellow"><Star className="h-5 w-5" /></span>
          <span>收藏</span>
          <span className="wechat-row-meta">{favoriteMessages.length + favoriteStickers.length}项</span>
          <ChevronRight className="wechat-row-chevron h-5 w-5" />
        </button>
        <button type="button" className="wechat-menu-row">
          <span className="wechat-color-icon green"><Sparkles className="h-5 w-5" /></span>
          <span>服务</span>
          <ChevronRight className="wechat-row-chevron ml-auto h-5 w-5" />
        </button>
        <button type="button" onClick={() => setScreen('accounting')} className="wechat-menu-row">
          <span className="wechat-color-icon red"><ShoppingBag className="h-5 w-5" /></span>
          <span>记账与订单</span>
          <span className="wechat-row-meta">{purchaseRecords.length}条</span>
          <ChevronRight className="wechat-row-chevron ml-auto h-5 w-5" />
        </button>
        <button type="button" onClick={() => setMeView('settings')} className="wechat-menu-row">
          <span className="wechat-color-icon blue"><Settings className="h-5 w-5" /></span>
          <span>设置</span>
          <ChevronRight className="wechat-row-chevron ml-auto h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
