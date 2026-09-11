import { Clapperboard, Copy, Gift, Mic, Phone, Quote, RefreshCw, ShoppingBag, Star, Trash2, Undo2, Video } from 'lucide-react';
import React, { memo, useRef, useState } from 'react';

import { cn } from '../../../../lib/utils';
import type { Character, ChatMessage } from '../../../../store';
import { useAppStore } from '../../../../store';
import { speakWithConfiguredTts } from '../../../../tts';
import { formatMessageTime, WeChatAvatar } from '../../shared/WeChatShared';
import { canAcceptLifeCard, parseOpenMojiEmotionText } from '../wechatInteraction';
import { isUnreadVoiceMessage } from '../voiceUnread';
import { VoiceMessageBubble } from '../VoiceMessageBubble';
import { ChatImageContent } from './ChatImageContent';
import { BubbleOrnaments } from './BubbleOrnaments';
import { OpenMojiEmotionCard } from './OpenMojiEmotionCard';

function speak(text: string) {
  const { ttsConfig } = useAppStore.getState();
  speakWithConfiguredTts(text, ttsConfig);
}

export type ChatBubbleProps = {
  key?: React.Key;
  role: 'user' | 'model';
  content: string;
  kind: string;
  duration?: number;
  transcript?: string;
  stickerLabel?: string;
  favorite?: boolean;
  replyTo?: string;
  amount?: string;
  note?: string;
  itemName?: string;
  status?: 'pending' | 'accepted';
  voicePlayedAt?: number;
  timestamp?: number;
  showTools?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  channel?: 'wechat' | 'qq';
  character?: Character;
  onToggleTools?: () => void;
  onToggleSelected?: () => void;
  onStartSelection?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onCopy?: () => void;
  onReply?: () => void;
  onRecall?: () => void;
  onVoicePlayed?: () => void;
  onAcceptLifeCard?: () => void;
};

export const ChatBubble = memo(function ChatBubble({
  role,
  content,
  kind,
  duration,
  transcript,
  stickerLabel,
  favorite,
  replyTo,
  amount,
  note,
  itemName,
  status,
  voicePlayedAt,
  timestamp,
  showTools,
  selectionMode,
  selected,
  channel,
  character,
  onToggleTools,
  onToggleSelected,
  onStartSelection,
  onDelete,
  onToggleFavorite,
  onCopy,
  onReply,
  onRecall,
  onVoicePlayed,
  onAcceptLifeCard,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const isWechat = channel === 'wechat';
  const isQq = channel === 'qq';
  const isChatChannel = isWechat || isQq;
  const userAvatar = useAppStore((state) => state.userAvatar);
  const userName = useAppStore((state) => state.userName);
  const longPressTimer = useRef<number | null>(null);
  const [theaterExpanded, setTheaterExpanded] = useState(false);
  const runTool = (event: React.MouseEvent<HTMLButtonElement>, action?: () => void) => {
    event.stopPropagation();
    action?.();
  };
  const messageTools = showTools ? (
    <div className={cn('wechat-message-tools', isUser ? 'justify-end' : 'justify-start')}>
      {onReply && (
        <button type="button" onClick={(event) => runTool(event, onReply)} className="quote" title="引用">
          <Quote className="h-3.5 w-3.5" />
          <span>引用</span>
        </button>
      )}
      {onToggleFavorite && (
        <button type="button" onClick={(event) => runTool(event, onToggleFavorite)} className={cn(favorite && 'active')} title={favorite ? '取消收藏' : '收藏'}>
          <Star className="h-3.5 w-3.5" />
          <span>{favorite ? '已收藏' : '收藏'}</span>
        </button>
      )}
      {onCopy && (
        <button type="button" onClick={(event) => runTool(event, onCopy)} title="复制">
          <Copy className="h-3.5 w-3.5" />
          <span>复制</span>
        </button>
      )}
      {onRecall && (
        <button type="button" onClick={(event) => runTool(event, onRecall)} className="recall" title="撤回">
          <Undo2 className="h-3.5 w-3.5" />
          <span>撤回</span>
        </button>
      )}
      {!isUser && onDelete && (
        <button type="button" onClick={(event) => runTool(event, onDelete)} title="删除">
          <Trash2 className="h-3.5 w-3.5" />
          <span>删除</span>
        </button>
      )}
    </div>
  ) : null;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const armMessageTools = () => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      if (selectionMode) {
        onToggleSelected?.();
        return;
      }
      (onStartSelection || onToggleTools)?.();
    }, 360);
  };

  const messageEvents = {
    onClick: (event: React.MouseEvent) => {
      if (selectionMode) {
        event.stopPropagation();
        onToggleSelected?.();
        return;
      }
      onToggleTools?.();
    },
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      if (selectionMode) {
        onToggleSelected?.();
        return;
      }
      (onStartSelection || onToggleTools)?.();
    },
    onPointerDown: armMessageTools,
    onPointerUp: clearLongPress,
    onPointerCancel: clearLongPress,
    onPointerLeave: clearLongPress,
  };
  const canReceiveLifeCard = canAcceptLifeCard({ role, kind: kind as ChatMessage['kind'], status });
  const lifeCardEvents = canReceiveLifeCard && onAcceptLifeCard ? {
    ...messageEvents,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      clearLongPress();
      onAcceptLifeCard();
    },
  } : messageEvents;

  const meta = timestamp ? <span className="wechat-message-time">{formatMessageTime(timestamp)}</span> : null;
  const selectionControl = isChatChannel && selectionMode ? (
    <button
      type="button"
      className={cn('wechat-selection-dot', selected && 'active')}
      aria-label={selected ? '取消选择消息' : '选择消息'}
      aria-pressed={Boolean(selected)}
      onClick={(event) => {
        event.stopPropagation();
        onToggleSelected?.();
      }}
    >
      <span />
    </button>
  ) : null;

  if (content === '' && kind === 'text') {
    return <p className="wechat-recalled-text">{isUser ? '你撤回了一条消息' : '对方撤回了一条消息'}</p>;
  }

  const replyLine = replyTo ? <p className={cn('wechat-reply-line', isUser ? 'wechat-reply-user' : 'wechat-reply-model')}><span>引用</span>{replyTo}</p> : null;

  const isTheaterMessage = kind === 'theater' || (kind === 'call-note' && content.trimStart().startsWith('【小剧场】'));
  if (isTheaterMessage) {
    const theaterText = content.replace(/^【小剧场】\s*/, '');
    return (
      <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
        {isChatChannel && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
        {!isUser && selectionControl}
        <div className={cn('flex max-w-[84%] flex-col', isUser ? 'items-end' : 'items-start')}>
          <article className={cn('wechat-theater-card', theaterExpanded && 'is-expanded')} {...messageEvents}>
            <header><Clapperboard className="h-4 w-4" /><strong>小剧场</strong></header>
            <p>{theaterText}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                clearLongPress();
                setTheaterExpanded((current) => !current);
              }}
            >
              {theaterExpanded ? '收起' : '展开全文'}
            </button>
          </article>
          {meta}
          {isChatChannel && messageTools}
        </div>
        {isUser && selectionControl}
        {isChatChannel && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
      </div>
    );
  }

  if (kind === 'call-note') {
    const isVideoCall = content.includes('视频');
    return (
      <div className="wechat-call-note">
        {isVideoCall ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
        <span>{content}</span>
        {meta}
        {isUser && onRecall && (
          <button type="button" onClick={(event) => runTool(event, onRecall)} className="wechat-mini-button">
            取消
          </button>
        )}
      </div>
    );
  }

  if (kind === 'transfer' || kind === 'red-packet' || kind === 'shopping') {
    const isRedPacket = kind === 'red-packet';
    const isShopping = kind === 'shopping';
    const title = isShopping ? itemName || content || '购物记录' : isRedPacket ? note || content || '恭喜发财，大吉大利' : note || content || '转账';
    const amountText = amount ? `￥${amount}` : isRedPacket ? '红包' : '未填金额';
    return (
      <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
        {isChatChannel && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
        {!isUser && selectionControl}
        <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
          {replyLine}
          <button type="button" className={cn('wechat-life-card', kind, canReceiveLifeCard && 'receivable')} {...lifeCardEvents}>
            <span className="wechat-life-icon">
              {isShopping ? <ShoppingBag className="h-5 w-5" /> : isRedPacket ? <Gift className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <strong>{title}</strong>
              <small>{isShopping ? (note || '生活购物') : status === 'accepted' ? '已收' : canReceiveLifeCard ? '点击收款' : '待收'}</small>
            </span>
            <b>{amountText}</b>
          </button>
          {meta}
          {isChatChannel && messageTools}
        </div>
        {isUser && selectionControl}
        {isChatChannel && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
      </div>
    );
  }

  if (kind === 'sticker') {
    if (isChatChannel) {
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          {!isUser && selectionControl}
          <figure className="wechat-sticker-wrap" {...messageEvents}>
            {replyLine}
            <img src={content} className="wechat-sticker" alt={stickerLabel || '表情包'} />
            {meta}
            {messageTools}
          </figure>
          {isUser && selectionControl}
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <img src={content} className="max-h-36 max-w-36 rounded-2xl border-[3px] border-[#111] object-cover" />
      </div>
    );
  }

  if (kind === 'image') {
    if (isChatChannel) {
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          {!isUser && selectionControl}
          <figure className="wechat-image-wrap" {...messageEvents}>
            {replyLine}
            <ChatImageContent content={content} alt={stickerLabel || '聊天图片'} />
            {stickerLabel && <figcaption>{stickerLabel}</figcaption>}
            {meta}
            {messageTools}
          </figure>
          {isUser && selectionControl}
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <img src={content} className="max-h-56 max-w-56 rounded-2xl border-[3px] border-[#111] object-cover" />
      </div>
    );
  }

  if (kind === 'voice') {
    if (isChatChannel) {
      return (
        <div className={cn('wechat-message mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
          {!isUser && selectionControl}
          <div className={cn('flex max-w-[78%] flex-col', isUser ? 'items-end' : 'items-start')}>
            <VoiceMessageBubble
              content={content}
              duration={duration}
              transcript={transcript}
              replyTo={replyTo}
              isUser={isUser}
              isUnread={isUnreadVoiceMessage({ role, kind, voicePlayedAt })}
              onPlay={() => {
                speak(content);
                onVoicePlayed?.();
              }}
              onToggleTools={selectionMode ? onToggleSelected : onStartSelection || onToggleTools}
            />
            {meta}
            {messageTools}
          </div>
          {isUser && selectionControl}
          {isUser && <WeChatAvatar src={userAvatar} name={userName} />}
        </div>
      );
    }

    return (
      <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
        <button
          onClick={() => {
            speak(content);
            onVoicePlayed?.();
          }}
          className={cn('hand-bubble flex min-w-32 items-center gap-2', isUser ? 'bg-[#d7efc7]' : 'bg-white')}
        >
          <Mic className="h-4 w-4" />
          <span>{duration || 3}"</span>
          <span className="text-xs opacity-65">点按播放</span>
        </button>
      </div>
    );
  }

  const emotion = parseOpenMojiEmotionText(content);

  return (
    <div className={cn(isChatChannel ? 'wechat-message' : '', 'mb-3 flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {isChatChannel && !isUser && <WeChatAvatar src={character?.avatar} name={character?.name || 'char'} />}
      {!isUser && selectionControl}
      <div className={cn('flex flex-col', isQq ? 'qq-message-stack' : 'max-w-[78%]', isUser ? 'items-end' : 'items-start')}>
        {emotion && replyLine}
        {emotion ? (
          <OpenMojiEmotionCard emotion={emotion} events={messageEvents} />
        ) : (
          <div
            className={cn(
              isChatChannel && 'wechat-text-wrap',
              'hand-bubble whitespace-pre-wrap leading-relaxed',
              isChatChannel ? (isUser ? 'wechat-text-user' : 'wechat-text-model') : (isUser ? 'bg-[#d7efc7]' : 'bg-white'),
            )}
            {...messageEvents}
          >
            <BubbleOrnaments />
            {replyLine}
            <span className="bubble-content">{content}</span>
          </div>
        )}
        {meta}
        {isChatChannel && messageTools}
      </div>
      {isUser && selectionControl}
      {isChatChannel && isUser && <WeChatAvatar src={userAvatar} name={userName} />}
    </div>
  );
});
