import { Copy, Heart, MessageCircle, MoreHorizontal, Pin, RefreshCw, Send, Trash2 } from 'lucide-react';
import type { Key } from 'react';
import { useState } from 'react';

import { WeChatAvatar } from '../shared/WeChatShared';
import { momentDecorationLabels, momentMoodLabels, type DecoratedMoment } from './momentsLogic';

const decorationClass: Record<DecoratedMoment['decoration'], string> = {
  plain: 'bg-white',
  note: 'bg-[#fff7d7]',
  polaroid: 'bg-white ring-4 ring-white shadow-md',
  night: 'bg-[#161821] text-white',
  sunny: 'bg-[#fff0c2]',
};

export function MomentCard({
  moment,
  userAvatar,
  userName,
  onDelete,
  onTogglePin,
  onToggleLike,
  onComment,
  onRefreshReplies,
  onOpenCharacter,
}: {
  key?: Key;
  moment: DecoratedMoment;
  userAvatar: string | null;
  userName: string;
  onDelete: (index: number) => void;
  onTogglePin: (index: number) => void;
  onToggleLike: (index: number) => void;
  onComment: (index: number, content: string) => void;
  onRefreshReplies: (index: number) => void;
  onOpenCharacter?: (characterId: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const authorName = moment.authorName || userName || '我';
  const authorAvatar = moment.authorName ? moment.authorAvatar || null : userAvatar;
  const userLiked = (moment.likes || []).some((like) => like.kind === 'user' && like.authorId === 'user');
  const canOpenAuthor = Boolean(moment.sourceCharacterId && moment.authorName && onOpenCharacter);
  const visibilityText = moment.visibility === 'private'
    ? '仅自己'
    : moment.visibility === 'selected'
      ? `${moment.visibleCharacterIds.length || 0}人可见`
      : '公开';

  return (
    <article className={`wechat-moment-card ${decorationClass[moment.decoration]}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => moment.sourceCharacterId && onOpenCharacter?.(moment.sourceCharacterId)}
          className="wechat-moment-author-button"
          disabled={!canOpenAuthor}
          aria-label={canOpenAuthor ? `查看${authorName}的朋友圈` : undefined}
        >
          <WeChatAvatar src={authorAvatar} name={authorName} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => moment.sourceCharacterId && onOpenCharacter?.(moment.sourceCharacterId)}
                className="wechat-moment-author-name"
                disabled={!canOpenAuthor}
              >
                {authorName}
              </button>
              <span className="text-[11px] font-bold opacity-55">
                {momentMoodLabels[moment.mood]} · {momentDecorationLabels[moment.decoration]} · {visibilityText}
              </span>
            </div>
            <button type="button" onClick={() => setShowActions((visible) => !visible)} className="wechat-icon-button" aria-label="朋友圈操作">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{moment.content}</p>

          {moment.images.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {moment.images.map((image, index) => (
                <img key={`${image}-${index}`} src={image} alt="朋友圈图片" className="aspect-square rounded-[6px] object-cover" />
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-[11px] font-bold opacity-50">
            <span>{moment.pinned ? '置顶' : '刚刚'}</span>
            <span>{moment.visibility === 'public' ? '朋友可见' : visibilityText}</span>
          </div>

          {((moment.likes && moment.likes.length > 0) || (moment.comments && moment.comments.length > 0)) && (
            <div className="wechat-moment-interactions">
              {moment.likes && moment.likes.length > 0 && (
                <div className="wechat-moment-likes">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{moment.likes.map((like) => like.authorName).join('、')}</span>
                </div>
              )}
              {moment.comments && moment.comments.length > 0 && (
                <div className="wechat-moment-comments">
                  {moment.comments.map((comment) => (
                    <p key={comment.id}>
                      <strong>{comment.authorName}</strong>
                      <span>{comment.content}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="wechat-moment-quick-actions">
            <button type="button" onClick={() => onToggleLike(moment.index)} className={userLiked ? 'wechat-mini-button active' : 'wechat-mini-button'}>
              <Heart className={userLiked ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
              {userLiked ? '已赞' : '点赞'}
            </button>
            <button type="button" onClick={() => setShowCommentBox((visible) => !visible)} className="wechat-mini-button">
              <MessageCircle className="h-4 w-4" />
              评论
            </button>
            <button type="button" onClick={() => onRefreshReplies(moment.index)} className="wechat-mini-button">
              <RefreshCw className="h-4 w-4" />
              刷回复
            </button>
          </div>

          {showCommentBox && (
            <form
              className="wechat-moment-comment-box"
              onSubmit={(event) => {
                event.preventDefault();
                if (!commentDraft.trim()) return;
                onComment(moment.index, commentDraft);
                setCommentDraft('');
                setShowCommentBox(false);
              }}
            >
              <input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="评论这一条朋友圈" />
              <button type="submit" aria-label="发送朋友圈评论">
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}

          {showActions && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => onTogglePin(moment.index)} className="wechat-mini-button">
                <Pin className="h-4 w-4" />
                {moment.pinned ? '取消置顶' : '置顶'}
              </button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(moment.content)} className="wechat-mini-button">
                <Copy className="h-4 w-4" />
                复制
              </button>
              <button type="button" onClick={() => onDelete(moment.index)} className="wechat-mini-button danger">
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
