import { MessageCircle, Radio, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { QQChannels } from './channels/QQChannels';
import { QQContacts } from './contacts/QQContacts';
import { QQGroupProfile } from './contacts/QQGroupProfile';
import { QQProfile } from './contacts/QQProfile';
import { QQDynamic } from './dynamic/QQDynamic';
import { QQHeader } from './QQHeader';
import { QQMessages } from './messages/QQMessages';
import { QQ_TABS, buildQqHomeRows, buildQqMessageShortcuts, filterQqHomeRows, getQqEmptyStateText, type QqMessageShortcut, type QqTabId, type QqTopActionId } from './qqLogic';

const TAB_ICONS = {
  messages: MessageCircle,
  channels: Radio,
  contacts: Users,
  dynamic: Sparkles,
} satisfies Record<QqTabId, typeof MessageCircle>;

export function QQScreen() {
  const {
    characters,
    chatSessions,
    groupChats,
    pinnedChatIds,
    addGroupChat,
    updateGroupChat,
    deleteGroupChat,
    goBack,
    openChat,
    togglePinnedChat,
    setScreen,
    userName,
    userAvatar,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<QqTabId>('messages');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [groupProfileId, setGroupProfileId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [qqContactTab, setQqContactTab] = useState<'friends' | 'groups' | 'devices' | 'phonebook'>('friends');
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const rows = buildQqHomeRows({ characters, groupChats, pinnedChatIds, chatSessions });
  const messageShortcuts = buildQqMessageShortcuts({ userName, characters, groupChats, chatSessions });
  const filteredRows = filterQqHomeRows(rows, query);
  const emptyText = getQqEmptyStateText(characters.length);
  const profileCharacter = characters.find((item) => item.id === profileId);

  const openQqChat = (characterId: string) => openChat(characterId, 'qq');
  const openQqGroupChat = (groupId: string) => openChat(groupId, 'qq');
  const startQqCall = (characterId: string, screen: 'voice-call' | 'video') => {
    openChat(characterId, 'qq');
    setScreen(screen);
  };
  const openImport = () => setScreen('contacts');
  const handleTopAction = (actionId: QqTopActionId) => {
    setShowTopMenu(false);
    if (actionId === 'add-friend') openImport();
    if (actionId === 'create-group') {
      setActiveTab('contacts');
      setQqContactTab('groups');
      setShowGroupComposer(true);
    }
    if (actionId === 'create-channel') setActiveTab('channels');
  };
  const handleMessageShortcut = (shortcut: QqMessageShortcut) => {
    if (shortcut.id === 'friend-requests') {
      setActiveTab('contacts');
      setQqContactTab('friends');
      return;
    }
    if (shortcut.id === 'mentions' && shortcut.targetId) {
      openQqGroupChat(shortcut.targetId);
      return;
    }
    if (shortcut.id === 'group-notices' && shortcut.targetId) {
      setGroupProfileId(shortcut.targetId);
    }
  };

  if (profileCharacter) {
    return (
      <QQProfile
        character={profileCharacter}
        onBack={() => setProfileId(null)}
        onOpenChat={openQqChat}
        onStartVoiceCall={(characterId) => startQqCall(characterId, 'voice-call')}
        onStartVideoCall={(characterId) => startQqCall(characterId, 'video')}
        onOpenDynamic={() => {
          setProfileId(null);
          setActiveTab('dynamic');
        }}
      />
    );
  }

  const profileGroup = groupChats.find((group) => group.id === groupProfileId);
  if (profileGroup) {
    return (
      <QQGroupProfile
        group={profileGroup}
        characters={characters}
        onBack={() => setGroupProfileId(null)}
        onOpenChat={openQqGroupChat}
        onUpdateGroup={updateGroupChat}
        onDeleteGroup={deleteGroupChat}
      />
    );
  }

  return (
    <section className="qq-home-screen h-full overflow-hidden">
      <QQHeader
        userName={userName}
        userAvatar={userAvatar}
        query={query}
        onBack={goBack}
        onAdd={() => setShowTopMenu((visible) => !visible)}
        onQueryChange={(value) => {
          setQuery(value);
          setShowTopMenu(false);
          if (value.trim()) setActiveTab('messages');
        }}
        onAction={handleTopAction}
        showMenu={showTopMenu}
      />

      <div className="qq-content">
        {activeTab === 'messages' && (
          <QQMessages
            rows={filteredRows}
            shortcuts={query.trim() ? [] : messageShortcuts}
            totalCount={rows.length}
            characters={characters}
            groupChats={groupChats}
            emptyText={emptyText}
            query={query}
            onOpenChat={openQqChat}
            onOpenProfile={setProfileId}
            onOpenGroupProfile={setGroupProfileId}
            onTogglePinned={(targetId) => togglePinnedChat(targetId, 'qq')}
            onOpenShortcut={handleMessageShortcut}
            onImport={openImport}
          />
        )}
        {activeTab === 'contacts' && (
          <QQContacts
            characters={characters}
            groupChats={groupChats}
            userName={userName}
            emptyText={emptyText}
            onOpenChat={openQqChat}
            onOpenGroupChat={openQqGroupChat}
            onOpenGroupProfile={setGroupProfileId}
            onOpenProfile={setProfileId}
            onImport={openImport}
            onAddGroup={addGroupChat}
            onUpdateGroup={updateGroupChat}
            onDeleteGroup={deleteGroupChat}
            initialTab={qqContactTab}
            showGroupComposer={showGroupComposer}
            onShowGroupComposerChange={setShowGroupComposer}
          />
        )}
        {activeTab === 'channels' && <QQChannels />}
        {activeTab === 'dynamic' && <QQDynamic />}
      </div>

      <nav className="qq-bottom-nav" aria-label="QQ 导航">
        {QQ_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(activeTab === tab.id && 'active')}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
