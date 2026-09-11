import { Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { cn } from '../../../lib/utils';
import { BubbleOrnaments } from './components/BubbleOrnaments';

type VoiceMessageBubbleProps = {
  content: string;
  duration?: number;
  transcript?: string;
  replyTo?: string;
  isUser: boolean;
  isUnread?: boolean;
  onPlay: () => void;
  onToggleTools?: () => void;
};

export function VoiceMessageBubble({
  content,
  duration,
  transcript,
  replyTo,
  isUser,
  isUnread,
  onPlay,
  onToggleTools,
}: VoiceMessageBubbleProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const voiceDuration = duration || 3;
  const width = Math.min(228, Math.max(112, 92 + voiceDuration * 9));
  const transcriptText = transcript || content;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const armMessageTools = () => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => onToggleTools?.(), 360);
  };

  const playVoice = () => {
    setIsPlaying(true);
    onPlay();
    window.setTimeout(() => setIsPlaying(false), Math.max(900, voiceDuration * 1000));
  };

  return (
    <>
      <button
        type="button"
        onClick={playVoice}
        onContextMenu={(event) => {
          event.preventDefault();
          onToggleTools?.();
        }}
        onPointerDown={armMessageTools}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        className={cn('wechat-voice-bubble', isPlaying && 'is-playing', isUser ? 'wechat-voice-user' : 'wechat-voice-model')}
        style={{ width }}
        title="点击播放，长按或右键查看转写"
      >
        <BubbleOrnaments />
        {replyTo && <span className={cn('wechat-reply-line', isUser ? 'wechat-reply-user' : 'wechat-reply-model')}><b>引用</b>{replyTo}</span>}
        {isUnread && <span className="wechat-voice-unread-dot" aria-label="未听语音" />}
        <span className="wechat-voice-icon">
          <Volume2 className="h-4 w-4" />
        </span>
        <span className="wechat-voice-waves" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="wechat-voice-duration">{voiceDuration}"</span>
      </button>
      <button type="button" onClick={() => setShowTranscript((visible) => !visible)} className="wechat-transcript-toggle">
        {showTranscript ? '收起转文字' : '转文字'}
      </button>
      {showTranscript && <p className="wechat-transcript">{transcriptText}</p>}
    </>
  );
}
