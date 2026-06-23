import { useRef, useState } from 'react';

import type { Character, GroupChat } from '../../../store';
import { WeChatGroupAvatar } from '../shared/WeChatShared';

export function WeChatGroups({
  characters,
  groupChats,
  openChat,
  addGroupChat,
  updateGroupChat,
  deleteGroupChat,
  setStatus,
  showComposer,
}: {
  characters: Character[];
  groupChats: GroupChat[];
  openChat: (characterId: string, channel: 'wechat' | 'qq') => void;
  addGroupChat: (name: string, memberIds: string[]) => void;
  updateGroupChat: (id: string, updates: Partial<Pick<GroupChat, 'name' | 'memberIds'>>) => void;
  deleteGroupChat: (id: string) => void;
  setStatus: (status: string) => void;
  showComposer: boolean;
}) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const renameTimer = useRef<number | null>(null);
  const skipOpenAfterRename = useRef(false);

  const createGroup = () => {
    const memberIds = Object.entries(selectedMembers)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    if (memberIds.length === 0) {
      setStatus('至少选择一个联系人再拉群聊');
      return;
    }
    addGroupChat(groupName, memberIds);
    setGroupName('');
    setSelectedMembers({});
    setStatus('群聊已创建');
  };

  const clearRenameTimer = () => {
    if (renameTimer.current) {
      window.clearTimeout(renameTimer.current);
      renameTimer.current = null;
    }
  };

  const renameGroup = (group: Pick<GroupChat, 'id' | 'name'>) => {
    skipOpenAfterRename.current = true;
    const nextName = window.prompt('修改群聊名称', group.name)?.trim();
    if (nextName) {
      updateGroupChat(group.id, { name: nextName });
      setStatus('群聊名称已更新');
    }
    window.setTimeout(() => {
      skipOpenAfterRename.current = false;
    }, 0);
  };

  const armRename = (group: Pick<GroupChat, 'id' | 'name'>) => {
    clearRenameTimer();
    renameTimer.current = window.setTimeout(() => renameGroup(group), 520);
  };

  return (
    <>
      {showComposer && (
        <div className="wechat-inline-panel">
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="群聊名称" className="wechat-inline-input" />
          <div className="wechat-check-list">
            {characters.map((character) => (
              <label key={character.id}>
                <input
                  type="checkbox"
                  checked={Boolean(selectedMembers[character.id])}
                  onChange={(event) => setSelectedMembers((state) => ({ ...state, [character.id]: event.target.checked }))}
                />
                <span>{character.name}</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={createGroup} className="wechat-mini-button">创建群聊</button>
        </div>
      )}
      {groupChats.map((group) => (
        <div
          key={group.id}
          className="wechat-contact-row"
          onContextMenu={(event) => { event.preventDefault(); renameGroup(group); }}
          onPointerDown={() => armRename(group)}
          onPointerUp={clearRenameTimer}
          onPointerCancel={clearRenameTimer}
          onPointerLeave={clearRenameTimer}
          title="长按或右键修改群名"
        >
          <WeChatGroupAvatar group={group} characters={characters} />
          <button
            type="button"
            onClick={() => {
              if (skipOpenAfterRename.current) return;
              openChat(group.id, 'wechat');
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="wechat-row-title small">{group.name}</p>
            <p className="wechat-row-preview compact">{group.memberIds.length}个成员 · 点开聊天</p>
          </button>
          <button
            type="button"
            onClick={() => window.confirm(`确定解散「${group.name}」吗？`) && deleteGroupChat(group.id)}
            onPointerDown={(event) => event.stopPropagation()}
            className="wechat-mini-button danger"
          >
            解散
          </button>
        </div>
      ))}
    </>
  );
}
