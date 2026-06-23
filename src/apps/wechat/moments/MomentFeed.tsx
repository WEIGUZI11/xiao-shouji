import { type DecoratedMoment } from './momentsLogic';
import { MomentCard } from './MomentCard';

export function MomentFeed({
  moments,
  userAvatar,
  userName,
  onDelete,
  onTogglePin,
  onToggleLike,
  onComment,
  onRefreshReplies,
  onOpenCharacter,
}: {
  moments: DecoratedMoment[];
  userAvatar: string | null;
  userName: string;
  onDelete: (index: number) => void;
  onTogglePin: (index: number) => void;
  onToggleLike: (index: number) => void;
  onComment: (index: number, content: string) => void;
  onRefreshReplies: (index: number) => void;
  onOpenCharacter?: (characterId: string) => void;
}) {
  if (moments.length === 0) return <p className="wechat-muted-text">还没有朋友圈。</p>;

  return (
    <div className="grid gap-2">
      {moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          userAvatar={userAvatar}
          userName={userName}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
          onToggleLike={onToggleLike}
          onComment={onComment}
          onRefreshReplies={onRefreshReplies}
          onOpenCharacter={onOpenCharacter}
        />
      ))}
    </div>
  );
}
