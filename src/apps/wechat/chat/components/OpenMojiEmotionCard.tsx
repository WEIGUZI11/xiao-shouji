import type { HTMLAttributes } from 'react';

import type { OpenMojiEmotionText } from '../openMojiEmotion';

export function OpenMojiEmotionCard({
  emotion,
  events,
}: {
  emotion: OpenMojiEmotionText;
  events?: HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className="wechat-emotion-card" {...events}>
      <span className="wechat-emotion-icon">☺</span>
      <span>
        <strong>{emotion.title}</strong>
        <small>{emotion.body}</small>
      </span>
    </div>
  );
}
