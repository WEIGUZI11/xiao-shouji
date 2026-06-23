import { ChevronLeft, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAppStore } from '../../../store';
import { WeChatAvatar } from '../shared/WeChatShared';
import { MomentComposer } from './MomentComposer';
import { MomentFeed } from './MomentFeed';
import {
  appendMomentComment,
  buildAutoMomentReplies,
  buildCharacterMomentProfile,
  createMomentMeta,
  decorateMoments,
  generateCharacterMomentDrafts,
  generateSettingFriendComments,
  getCharacterMomentFeed,
  getMomentComposerToggleLabel,
  limitWechatMoments,
  removeMomentMetaAt,
  toggleMomentLike,
  togglePinnedMoment,
  type MomentDraft,
  type MomentMeta,
} from './momentsLogic';

const momentMetaStorageKey = 'wechat-moment-meta-v1';

function loadMomentMetas(): MomentMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(momentMetaStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMomentMetas(metas: MomentMeta[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(momentMetaStorageKey, JSON.stringify(limitWechatMoments(metas)));
}

export function WeChatMoments() {
  const {
    characters,
    userAvatar,
    userName,
    wechatMoments,
    addWechatMoment,
    deleteWechatMoment,
  } = useAppStore();
  const [metas, setMetas] = useState<MomentMeta[]>(loadMomentMetas);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const decoratedMoments = useMemo(() => decorateMoments(wechatMoments, metas), [wechatMoments, metas]);
  const activeCharacter = characters.find((character) => character.id === activeCharacterId) || null;
  const activeCharacterProfile = activeCharacter ? buildCharacterMomentProfile(activeCharacter) : null;
  const activeCharacterMoments = activeCharacterId ? getCharacterMomentFeed(wechatMoments, metas, activeCharacterId) : [];

  const updateMetas = (nextMetas: MomentMeta[]) => {
    const limited = limitWechatMoments(nextMetas);
    setMetas(limited);
    saveMomentMetas(limited);
  };

  const getMomentMetaAt = (index: number) => metas[index] || createMomentMeta({
    content: wechatMoments[index] || '',
    mood: 'daily',
    visibility: 'public',
    decoration: 'plain',
    visibleCharacterIds: [],
    images: [],
  });

  const updateMomentMetaAt = (index: number, updater: (meta: MomentMeta) => MomentMeta) => {
    if (!wechatMoments[index]) return;
    const expanded = [...metas];
    expanded[index] = updater(getMomentMetaAt(index));
    updateMetas(expanded);
  };

  const publishMoment = (draft: MomentDraft) => {
    const comments = buildAutoMomentReplies(characters, draft.content);
    const meta = createMomentMeta({ ...draft, comments });
    if (!meta.content) return;
    addWechatMoment(meta.content);
    updateMetas([meta, ...metas]);
    setShowComposer(false);
  };

  const deleteMoment = (index: number) => {
    deleteWechatMoment(index);
    updateMetas(removeMomentMetaAt(metas, index));
  };

  const togglePin = (index: number) => {
    const expanded = [...metas];
    if (!expanded[index] && wechatMoments[index]) expanded[index] = getMomentMetaAt(index);
    updateMetas(togglePinnedMoment(expanded, index));
  };

  const toggleLike = (index: number) => {
    updateMomentMetaAt(index, (meta) => toggleMomentLike(meta, {
      id: 'user',
      name: userName || '我',
      avatar: userAvatar || '',
      kind: 'user',
    }));
  };

  const addUserComment = (index: number, content: string) => {
    updateMomentMetaAt(index, (meta) => appendMomentComment(meta, {
      authorId: 'user',
      authorName: userName || '我',
      authorAvatar: userAvatar || '',
      sourceCharacterId: 'user',
      content,
    }));
  };

  const refreshMomentReplies = (index: number) => {
    updateMomentMetaAt(index, (meta) => {
      const replies = buildAutoMomentReplies(characters, meta.content, meta.sourceCharacterId);
      const sourceCharacter = characters.find((character) => character.id === meta.sourceCharacterId);
      const settingReplies = sourceCharacter ? generateSettingFriendComments(sourceCharacter, meta.content) : [];
      return [...replies, ...settingReplies].reduce((nextMeta, reply) => appendMomentComment(nextMeta, {
        authorId: reply.sourceCharacterId,
        authorName: reply.authorName,
        authorAvatar: reply.authorAvatar,
        sourceCharacterId: reply.sourceCharacterId,
        content: reply.content,
      }), meta);
    });
  };

  const createGeneratedMeta = (draft: MomentDraft, now = Date.now()) => {
    const sourceCharacter = characters.find((character) => character.id === draft.sourceCharacterId);
    return createMomentMeta({
      ...draft,
      comments: [
        ...buildAutoMomentReplies(characters, draft.content, draft.sourceCharacterId, now),
        ...(sourceCharacter ? generateSettingFriendComments(sourceCharacter, draft.content, now + 17) : []),
      ],
    }, now);
  };

  const refreshMoments = () => {
    const drafts = generateCharacterMomentDrafts(characters, 3);
    if (drafts.length === 0) return;
    const now = Date.now();
    const generatedMetas = drafts.map((draft, index) => createGeneratedMeta(draft, now + index));
    [...generatedMetas].reverse().forEach((meta) => addWechatMoment(meta.content));
    updateMetas([...generatedMetas, ...metas]);
  };

  const refreshCharacterMoments = () => {
    if (!activeCharacter) return;
    const draft = generateCharacterMomentDrafts([activeCharacter], 1)[0];
    if (!draft) return;
    const meta = createGeneratedMeta(draft);
    addWechatMoment(meta.content);
    updateMetas([meta, ...metas]);
  };

  if (activeCharacter && activeCharacterProfile) {
    return (
      <section className="wechat-photo-wall space-y-3">
        <button type="button" onClick={() => setActiveCharacterId(null)} className="wechat-return-button">
          <ChevronLeft className="h-4 w-4" />
          返回好友动态
        </button>
        <div className={`wechat-character-moments-hero tone-${activeCharacterProfile.coverTone}`}>
          <div className="wechat-character-cover" />
          <div className="wechat-character-profile-row">
            <WeChatAvatar src={activeCharacterProfile.avatar || null} name={activeCharacterProfile.name} large />
            <div className="min-w-0">
              <p className="text-xs font-black opacity-65">TA 的朋友圈</p>
              <h2>{activeCharacterProfile.name}</h2>
              <p>{activeCharacterProfile.signature}</p>
            </div>
          </div>
          {activeCharacterProfile.friendNames.length > 0 && (
            <div className="wechat-character-friends">
              {activeCharacterProfile.friendNames.map((friend) => <span key={friend}>{friend}</span>)}
            </div>
          )}
          <button type="button" onClick={refreshCharacterMoments} className="wechat-refresh-moments">
            <RefreshCw className="h-4 w-4" />
            刷 TA 的朋友圈
          </button>
        </div>
        <MomentFeed
          moments={activeCharacterMoments}
          userAvatar={userAvatar}
          userName={userName}
          onDelete={deleteMoment}
          onTogglePin={togglePin}
          onToggleLike={toggleLike}
          onComment={addUserComment}
          onRefreshReplies={refreshMomentReplies}
        />
      </section>
    );
  }

  return (
    <section className="wechat-photo-wall space-y-3">
      <div className="wechat-moments-hero">
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black opacity-55">好友动态</p>
            <h2 className="text-xl font-black">{userName || '我'}的朋友圈</h2>
          </div>
          <WeChatAvatar src={userAvatar} name={userName} large />
        </div>
        <div className="wechat-moments-actions">
          <button
            type="button"
            onClick={() => setShowComposer((visible) => !visible)}
            className={showComposer ? 'wechat-compose-moment-button active' : 'wechat-compose-moment-button'}
            aria-expanded={showComposer}
          >
            <Plus className="h-4 w-4" />
            {getMomentComposerToggleLabel(showComposer)}
          </button>
          <button type="button" onClick={refreshMoments} disabled={characters.length === 0} className="wechat-refresh-moments">
            <RefreshCw className="h-4 w-4" />
            {characters.length === 0 ? '先导入角色' : '刷一下'}
          </button>
        </div>
      </div>
      {showComposer && <MomentComposer characters={characters} onPublish={publishMoment} />}
      <MomentFeed
        moments={decoratedMoments}
        userAvatar={userAvatar}
        userName={userName}
        onDelete={deleteMoment}
        onTogglePin={togglePin}
        onToggleLike={toggleLike}
        onComment={addUserComment}
        onRefreshReplies={refreshMomentReplies}
        onOpenCharacter={setActiveCharacterId}
      />
    </section>
  );
}
