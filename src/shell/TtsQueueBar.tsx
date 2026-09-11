import { Square, Volume2 } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { getTtsQueueSnapshot, stopAllTts, subscribeTtsQueue } from '../tts';

const statusLabels = {
  waiting: '等待中',
  synthesizing: '合成中',
  playing: '播放中',
} as const;

export function TtsQueueBar() {
  const snapshot = useSyncExternalStore(subscribeTtsQueue, getTtsQueueSnapshot, getTtsQueueSnapshot);
  if (!snapshot.current && snapshot.waiting.length === 0) return null;
  const current = snapshot.current || snapshot.waiting[0];
  return (
    <aside className="tts-queue-bar" aria-live="polite">
      <Volume2 className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <strong>{statusLabels[current.status]} · {current.source}</strong>
        <p>{current.text}</p>
        {snapshot.waiting.length > 0 && <small>另有 {snapshot.waiting.length} 条等待</small>}
      </div>
      <button type="button" onClick={stopAllTts} aria-label="停止全部 TTS">
        <Square className="h-4 w-4" />
        停止全部
      </button>
    </aside>
  );
}
