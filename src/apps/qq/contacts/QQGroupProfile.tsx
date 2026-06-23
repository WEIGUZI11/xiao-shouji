import {
  Bell,
  Camera,
  ChevronLeft,
  FileText,
  IdCard,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

import { cn } from '../../../lib/utils';
import type { Character, GroupChat } from '../../../store';
import { buildQqGroupProfileSummary } from '../qqLogic';
import {
  buildQqGroupSharedSpace,
  createQqGroupFile,
  createQqGroupNotice,
  createQqGroupPhoto,
} from './qqGroupProfileLogic';
import { QQGroupAvatar } from './QQGroups';

type GroupUpdate = Partial<Pick<GroupChat, 'name' | 'memberIds' | 'announcement' | 'files' | 'photos' | 'notices' | 'memberCards'>>;

export function QQGroupProfile({
  group,
  characters,
  onBack,
  onOpenChat,
  onUpdateGroup,
  onDeleteGroup,
}: {
  group: GroupChat;
  characters: Character[];
  onBack: () => void;
  onOpenChat: (groupId: string) => void;
  onUpdateGroup: (id: string, updates: GroupUpdate) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const profile = useMemo(() => buildQqGroupProfileSummary({ group, characters }), [characters, group]);
  const sharedSpace = useMemo(() => buildQqGroupSharedSpace({ group, characters }), [characters, group]);
  const [announcement, setAnnouncement] = useState(group.announcement || '');
  const [groupNameDraft, setGroupNameDraft] = useState(group.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [confirmingDissolve, setConfirmingDissolve] = useState(false);
  const [fileDraft, setFileDraft] = useState('群聊资料.txt');
  const [photoDraft, setPhotoDraft] = useState('群聊合照');
  const [noticeDraft, setNoticeDraft] = useState(announcement || '今晚群里集合。');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>(
    Object.fromEntries(group.memberIds.map((id) => [id, true])),
  );
  const [cardDrafts, setCardDrafts] = useState<Record<string, string>>(group.memberCards || {});
  const [status, setStatus] = useState('');

  const renameGroup = () => {
    if (!isRenaming) {
      setIsRenaming(true);
      setConfirmingDissolve(false);
      setStatus('输入新的群名后保存。');
      return;
    }
    const nextName = groupNameDraft.trim();
    if (!nextName) {
      setStatus('群名不能为空。');
      return;
    }
    onUpdateGroup(group.id, { name: nextName });
    setIsRenaming(false);
    setStatus('群名已更新。');
  };

  const saveAnnouncement = () => {
    onUpdateGroup(group.id, { announcement });
    setStatus('群公告已保存。');
  };

  const saveMembers = () => {
    const memberIds = Object.entries(selectedMembers)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    if (memberIds.length === 0) {
      setStatus('群聊至少需要保留一位成员。');
      return;
    }
    onUpdateGroup(group.id, { memberIds });
    setStatus('群成员已更新。');
  };

  const saveCards = () => {
    const memberCards = Object.keys(cardDrafts).reduce<Record<string, string>>((cards, id) => {
      const clean = cardDrafts[id]?.trim() || '';
      if (clean) cards[id] = clean;
      return cards;
    }, {});
    onUpdateGroup(group.id, { memberCards });
    setStatus('群名片已保存，聊天时更像一个真正的群了。');
  };

  const addGroupFile = () => {
    const name = fileDraft.trim();
    if (!name) return;
    onUpdateGroup(group.id, {
      files: [createQqGroupFile({ group, characters, name }), ...(group.files || [])],
    });
    setFileDraft('');
    setStatus('已上传到群文件。');
  };

  const addGroupPhoto = () => {
    const title = photoDraft.trim();
    if (!title) return;
    onUpdateGroup(group.id, {
      photos: [createQqGroupPhoto({ group, characters, title }), ...(group.photos || [])],
    });
    setPhotoDraft('');
    setStatus('已收进群相册。');
  };

  const addGroupNotice = () => {
    const content = noticeDraft.trim();
    if (!content) return;
    onUpdateGroup(group.id, {
      notices: [createQqGroupNotice({ group, characters, content }), ...(group.notices || [])],
    });
    setNoticeDraft('');
    setStatus('群通知已发布。');
  };

  const markNoticesRead = () => {
    onUpdateGroup(group.id, {
      notices: (group.notices || []).map((notice) => ({ ...notice, unread: false })),
    });
    setStatus('群通知已全部设为已读。');
  };

  const dissolveGroup = () => {
    if (!confirmingDissolve) {
      setConfirmingDissolve(true);
      setIsRenaming(false);
      setStatus(`再次点击确认解散「${group.name}」。`);
      return;
    }
    onDeleteGroup(group.id);
    onBack();
  };

  return (
    <section className="qq-home-screen qq-profile-screen h-full overflow-y-auto pb-8">
      <header className="qq-home-header qq-profile-header">
        <div className="qq-home-profile">
          <button type="button" onClick={onBack} className="qq-header-action" aria-label="返回群聊">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="qq-home-kicker">QQ 群资料</p>
            <h1>{profile.name}</h1>
          </div>
        </div>
      </header>

      <div className="qq-profile-card qq-group-profile-hero">
        <QQGroupAvatar group={group} characters={characters} />
        <div className="min-w-0 flex-1">
          <h2>{profile.name}</h2>
          <p>{profile.memberCount} 位成员 · {profile.memberPreview}</p>
          <small>文件 {sharedSpace.fileCount} · 相册 {sharedSpace.photoCount} · 未读通知 {sharedSpace.unreadNoticeCount}</small>
        </div>
      </div>

      <div className="qq-profile-actions">
        <button type="button" onClick={() => onOpenChat(group.id)} className="qq-profile-primary">
          <MessageCircle className="h-5 w-5" />
          <span>进入群聊</span>
        </button>
        <button type="button" onClick={renameGroup} className="qq-profile-secondary">
          <Pencil className="h-5 w-5" />
          <span>{isRenaming ? '保存群名' : '修改群名'}</span>
        </button>
        <button type="button" onClick={dissolveGroup} className={cn('qq-profile-secondary danger', confirmingDissolve && 'armed')}>
          <Trash2 className="h-5 w-5" />
          <span>{confirmingDissolve ? '确认解散' : '解散群'}</span>
        </button>
      </div>

      {isRenaming && (
        <div className="qq-group-inline-editor">
          <input
            value={groupNameDraft}
            onChange={(event) => setGroupNameDraft(event.target.value)}
            placeholder="新的群聊名称"
          />
          <button type="button" onClick={renameGroup}>保存</button>
        </div>
      )}

      <div className="qq-group-feature-grid">
        <MiniStat icon={<FileText />} label="群文件" value={`${sharedSpace.fileCount} 个`} />
        <MiniStat icon={<ImageIcon />} label="群相册" value={`${sharedSpace.photoCount} 张`} />
        <MiniStat icon={<Bell />} label="群通知" value={`${sharedSpace.unreadNoticeCount} 未读`} />
        <MiniStat icon={<IdCard />} label="群名片" value={sharedSpace.cardPreview} />
      </div>

      <div className="qq-profile-panel">
        <div className="qq-profile-panel-title">
          <Megaphone className="h-4 w-4" />
          <span>群公告</span>
        </div>
        <textarea
          value={announcement}
          onChange={(event) => setAnnouncement(event.target.value)}
          placeholder={profile.announcement}
          className="qq-profile-textarea"
        />
        <button type="button" onClick={saveAnnouncement} className="qq-profile-save-button">
          <Save className="h-4 w-4" />
          保存公告
        </button>
      </div>

      <GroupFeaturePanel
        icon={<FileText className="h-4 w-4" />}
        title="群文件"
        actionLabel="上传群文件"
        onAction={addGroupFile}
      >
        <InlineDraft
          value={fileDraft}
          onChange={setFileDraft}
          placeholder="输入群文件名称"
          buttonLabel="上传"
          onSubmit={addGroupFile}
        />
        {(group.files || []).length === 0 && <EmptyLine text="还没有群文件。发一份攻略、设定或截图说明，群才像真的在运转。" />}
        {(group.files || []).map((file) => (
          <div key={file.id} className="qq-group-file-row">
            <span><FileText className="h-4 w-4" /></span>
            <div>
              <b>{file.name}</b>
              <small>{file.uploaderName} 上传 · {file.sizeLabel}</small>
            </div>
          </div>
        ))}
      </GroupFeaturePanel>

      <GroupFeaturePanel
        icon={<Camera className="h-4 w-4" />}
        title="群相册"
        actionLabel="收进群相册"
        onAction={addGroupPhoto}
      >
        <InlineDraft
          value={photoDraft}
          onChange={setPhotoDraft}
          placeholder="输入照片标题"
          buttonLabel="收进"
          onSubmit={addGroupPhoto}
        />
        {(group.photos || []).length === 0 && <EmptyLine text="还没有群相册。可以先收一张成员头像当作群聊照片。" />}
        <div className="qq-group-photo-grid">
          {(group.photos || []).map((photo) => (
            <figure key={photo.id}>
              {photo.url ? <img src={photo.url} alt="" /> : <ImageIcon className="h-5 w-5" />}
              <figcaption>
                <b>{photo.title}</b>
                <small>{photo.sourceMemberName}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </GroupFeaturePanel>

      <GroupFeaturePanel
        icon={<Bell className="h-4 w-4" />}
        title="群通知"
        actionLabel="发布通知"
        onAction={addGroupNotice}
        secondaryLabel="全部已读"
        onSecondary={markNoticesRead}
      >
        <InlineDraft
          value={noticeDraft}
          onChange={setNoticeDraft}
          placeholder="输入群通知内容"
          buttonLabel="发布"
          onSubmit={addGroupNotice}
        />
        {(group.notices || []).length === 0 && <EmptyLine text="还没有群通知。发布集合、任务或群规，会更有群聊现场感。" />}
        {(group.notices || []).map((notice) => (
          <div key={notice.id} className={cn('qq-group-notice-row', notice.unread && 'unread')}>
            <span>{notice.unread ? '新' : '读'}</span>
            <div>
              <b>{notice.content}</b>
              <small>{notice.publisherName} 发布</small>
            </div>
          </div>
        ))}
      </GroupFeaturePanel>

      <div className="qq-profile-panel">
        <div className="qq-profile-panel-title">
          <Users className="h-4 w-4" />
          <span>成员管理</span>
        </div>
        <div className="qq-profile-member-grid">
          {characters.map((character) => (
            <label key={character.id} className={cn(selectedMembers[character.id] && 'active')}>
              <input
                type="checkbox"
                checked={Boolean(selectedMembers[character.id])}
                onChange={(event) => setSelectedMembers((members) => ({ ...members, [character.id]: event.target.checked }))}
              />
              <span>{character.avatar ? <img src={character.avatar} alt="" /> : character.name.slice(0, 1)}</span>
              <b>{character.name}</b>
            </label>
          ))}
        </div>
        <button type="button" onClick={saveMembers} className="qq-profile-save-button">
          <UserRoundPlus className="h-4 w-4" />
          保存成员
        </button>
      </div>

      <div className="qq-profile-panel">
        <div className="qq-profile-panel-title">
          <IdCard className="h-4 w-4" />
          <span>群名片</span>
        </div>
        <div className="qq-group-card-list">
          {sharedSpace.memberCards.map((card) => (
            <label key={card.characterId}>
              <span>{card.name}</span>
              <input
                value={cardDrafts[card.characterId] ?? card.cardName}
                onChange={(event) => setCardDrafts((drafts) => ({ ...drafts, [card.characterId]: event.target.value }))}
                placeholder={`${card.name} 在本群的名字`}
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={saveCards} className="qq-profile-save-button">
          <Save className="h-4 w-4" />
          保存群名片
        </button>
      </div>

      {status && <p className="qq-group-status">{status}</p>}
    </section>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="qq-group-mini-stat">
      <span>{icon}</span>
      <b>{label}</b>
      <small>{value}</small>
    </div>
  );
}

function InlineDraft({
  value,
  onChange,
  placeholder,
  buttonLabel,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  buttonLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="qq-group-inline-draft">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
        }}
        placeholder={placeholder}
      />
      <button type="button" onClick={onSubmit}>{buttonLabel}</button>
    </div>
  );
}

function GroupFeaturePanel({
  icon,
  title,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="qq-profile-panel qq-group-feature-panel">
      <div className="qq-profile-panel-title">
        {icon}
        <span>{title}</span>
        <button type="button" onClick={onAction}>
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" onClick={onSecondary} className="secondary">
            {secondaryLabel}
          </button>
        )}
      </div>
      <div className="qq-group-feature-body">{children}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="qq-group-empty-line">{text}</p>;
}
