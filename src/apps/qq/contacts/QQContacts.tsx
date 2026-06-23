import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Character, GroupChat } from '../../../store';
import { Avatar } from '../../shared/AppPrimitives';
import { QQDevices } from './QQDevices';
import { QQGroups } from './QQGroups';
import { QQPhonebook } from './QQPhonebook';

type QqContactTab = 'friends' | 'groups' | 'devices' | 'phonebook';

export function QQContacts({
  characters,
  groupChats,
  userName,
  emptyText,
  onOpenChat,
  onOpenGroupChat,
  onOpenGroupProfile,
  onOpenProfile,
  onImport,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  initialTab = 'friends',
  showGroupComposer = false,
  onShowGroupComposerChange,
}: {
  characters: Character[];
  groupChats: GroupChat[];
  userName: string;
  emptyText: string;
  onOpenChat: (characterId: string) => void;
  onOpenGroupChat: (groupId: string) => void;
  onOpenGroupProfile: (groupId: string) => void;
  onOpenProfile: (characterId: string) => void;
  onImport: () => void;
  onAddGroup: (name: string, memberIds: string[]) => void;
  onUpdateGroup: (id: string, updates: Partial<Pick<GroupChat, 'name' | 'memberIds'>>) => void;
  onDeleteGroup: (id: string) => void;
  initialTab?: QqContactTab;
  showGroupComposer?: boolean;
  onShowGroupComposerChange?: (visible: boolean) => void;
}) {
  const [activeContactTab, setActiveContactTab] = useState<QqContactTab>(initialTab);
  useEffect(() => {
    setActiveContactTab(initialTab);
  }, [initialTab]);

  const setGroupsVisible = (visible: boolean) => {
    onShowGroupComposerChange?.(visible);
    if (visible) setActiveContactTab('groups');
  };

  return (
    <>
      <div className="qq-contact-tabs">
        <button type="button" onClick={() => setActiveContactTab('friends')} className={activeContactTab === 'friends' ? 'active' : ''}>好友</button>
        <button type="button" onClick={() => setActiveContactTab('groups')} className={activeContactTab === 'groups' ? 'active' : ''}>群聊</button>
        <button type="button" onClick={() => setActiveContactTab('devices')} className={activeContactTab === 'devices' ? 'active' : ''}>设备</button>
        <button type="button" onClick={() => setActiveContactTab('phonebook')} className={activeContactTab === 'phonebook' ? 'active' : ''}>通讯录</button>
      </div>

      {activeContactTab === 'friends' && (
        <>
          <div className="qq-section-heading">
            <span>联系人</span>
            <small>{characters.length} 位</small>
          </div>
          <div className="qq-row-list">
            {characters.length === 0 && (
              <button type="button" onClick={onImport} className="qq-empty-state">
                <UserPlus className="h-6 w-6" />
                <span>{emptyText}</span>
              </button>
            )}
            {characters.map((character) => (
              <div key={character.id} className="qq-row">
                <button type="button" onClick={() => onOpenProfile(character.id)} className="qq-avatar-button" aria-label={`打开 ${character.name} 的 QQ 主页`}>
                  <Avatar character={character} />
                </button>
                <button type="button" onClick={() => onOpenProfile(character.id)} className="qq-row-main">
                  <p className="truncate text-base font-black">{character.name}</p>
                  <p className="truncate text-sm opacity-65">{character.description || character.personality || character.firstMessage || 'QQ 联系人'}</p>
                </button>
                <button type="button" onClick={() => onOpenChat(character.id)} className="qq-mini-chat-button">
                  发消息
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {activeContactTab === 'groups' && (
        <QQGroups
          characters={characters}
          groupChats={groupChats}
          showComposer={showGroupComposer}
          onShowComposerChange={setGroupsVisible}
          onOpenGroup={onOpenGroupChat}
          onOpenGroupProfile={onOpenGroupProfile}
          onAddGroup={onAddGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
        />
      )}

      {activeContactTab === 'devices' && (
        <QQDevices />
      )}

      {activeContactTab === 'phonebook' && (
        <QQPhonebook userName={userName} characterCount={characters.length} />
      )}
    </>
  );
}
