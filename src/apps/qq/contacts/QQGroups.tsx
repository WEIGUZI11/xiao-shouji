import { MessageCircle, Pencil, Trash2, UserRoundPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Character, GroupChat } from '../../../store';
import { cn } from '../../../lib/utils';
import { buildQqGroupRows, getQqGroupEmptyStateText } from '../qqLogic';

export function QQGroupAvatar({
  group,
  characters,
}: {
  group: GroupChat;
  characters: Character[];
}) {
  const members = group.memberIds
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character))
    .slice(0, 4);

  return (
    <div className="qq-group-avatar" aria-hidden>
      {members.length === 0 && <Users className="h-6 w-6" />}
      {members.map((member) => (
        <span key={member.id}>
          {member.avatar ? <img src={member.avatar} alt="" /> : member.name.slice(0, 1)}
        </span>
      ))}
    </div>
  );
}

export function QQGroups({
  characters,
  groupChats,
  showComposer,
  onShowComposerChange,
  onOpenGroup,
  onOpenGroupProfile,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
}: {
  characters: Character[];
  groupChats: GroupChat[];
  showComposer: boolean;
  onShowComposerChange: (visible: boolean) => void;
  onOpenGroup: (groupId: string) => void;
  onOpenGroupProfile: (groupId: string) => void;
  onAddGroup: (name: string, memberIds: string[]) => void;
  onUpdateGroup: (id: string, updates: Partial<Pick<GroupChat, 'name' | 'memberIds'>>) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState('');
  const groupRows = useMemo(() => buildQqGroupRows({ groupChats, characters }), [characters, groupChats]);

  const createGroup = () => {
    const memberIds = Object.entries(selectedMembers)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    if (memberIds.length === 0) {
      setStatus('至少选择一个联系人再拉群。');
      return;
    }
    onAddGroup(groupName, memberIds);
    setGroupName('');
    setSelectedMembers({});
    setStatus('群聊已创建。');
    onShowComposerChange(false);
  };

  const renameGroup = (group: GroupChat) => {
    const nextName = window.prompt('修改群聊名称', group.name)?.trim();
    if (!nextName) return;
    onUpdateGroup(group.id, { name: nextName });
    setStatus('群聊名称已更新。');
  };

  const dissolveGroup = (group: GroupChat) => {
    if (!window.confirm(`确定解散「${group.name}」吗？`)) return;
    onDeleteGroup(group.id);
    setStatus('群聊已解散。');
  };

  return (
    <div className="qq-group-section">
      <div className="qq-section-heading">
        <span>群聊</span>
        <small>{groupRows.length} 个</small>
      </div>

      <button type="button" onClick={() => onShowComposerChange(!showComposer)} className={cn('qq-group-create-row', showComposer && 'active')}>
        <span className="qq-group-create-icon"><UserRoundPlus className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <b>{showComposer ? '收起发起群聊' : '发起群聊'}</b>
          <small>选择 QQ 联系人，拉一个新的群聊</small>
        </span>
      </button>

      {showComposer && (
        <div className="qq-group-composer">
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="群聊名称" />
          <div className="qq-group-member-grid">
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
          <button type="button" onClick={createGroup}>创建群聊</button>
        </div>
      )}

      {status && <p className="qq-group-status">{status}</p>}

      {groupRows.length === 0 && (
        <button type="button" onClick={() => onShowComposerChange(true)} className="qq-empty-state">
          <Users className="h-6 w-6" />
          <span>{getQqGroupEmptyStateText(characters.length)}</span>
        </button>
      )}

      <div className="qq-row-list">
        {groupRows.map((row) => {
          const group = groupChats.find((item) => item.id === row.id);
          if (!group) return null;
          return (
            <div key={group.id} className="qq-row qq-group-row">
              <button type="button" onClick={() => onOpenGroupProfile(group.id)} className="qq-avatar-button" aria-label={`打开 ${group.name} 群资料`}>
                <QQGroupAvatar group={group} characters={characters} />
              </button>
              <button type="button" onClick={() => onOpenGroupProfile(group.id)} className="qq-row-main">
                <p className="truncate text-base font-black">{group.name}</p>
                <p className="truncate text-sm opacity-65">{row.memberCount} 位成员 · {row.memberPreview}</p>
              </button>
              <button type="button" onClick={() => onOpenGroup(group.id)} className="qq-mini-chat-button" aria-label="发消息">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => renameGroup(group)} className="qq-mini-icon-button" aria-label="改名">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => dissolveGroup(group)} className="qq-mini-icon-button danger" aria-label="解散">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
