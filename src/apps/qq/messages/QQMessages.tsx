import { AtSign, Bell, MessageCircle, Pin, PinOff, UserCheck } from 'lucide-react';
import { useRef, useState } from 'react';

import { cn } from '../../../lib/utils';
import type { Character, GroupChat } from '../../../store';
import { Avatar } from '../../shared/AppPrimitives';
import type { QqHomeRow, QqMessageShortcut } from '../qqLogic';
import { QQGroupAvatar } from '../contacts/QQGroups';

export function QQMessages({
  rows,
  shortcuts,
  totalCount,
  characters,
  groupChats,
  emptyText,
  query,
  onOpenChat,
  onOpenProfile,
  onOpenGroupProfile,
  onTogglePinned,
  onOpenShortcut,
  onImport,
}: {
  rows: QqHomeRow[];
  shortcuts: QqMessageShortcut[];
  totalCount: number;
  characters: Character[];
  groupChats: GroupChat[];
  emptyText: string;
  query: string;
  onOpenChat: (targetId: string) => void;
  onOpenProfile: (characterId: string) => void;
  onOpenGroupProfile: (groupId: string) => void;
  onTogglePinned: (targetId: string) => void;
  onOpenShortcut: (shortcut: QqMessageShortcut) => void;
  onImport: () => void;
}) {
  const activeRows = rows.filter((row) => row.hasSession);
  const longPressTimerRef = useRef<number | null>(null);
  const [menu, setMenu] = useState<{ targetId: string; name: string; isPinned: boolean; x: number; y: number } | null>(null);
  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };
  const openRowMenu = (row: QqHomeRow, x: number, y: number) => {
    clearLongPressTimer();
    setMenu({
      targetId: row.targetId,
      name: row.name,
      isPinned: Boolean(row.isPinned),
      x: Math.min(Math.max(x, 18), window.innerWidth - 172),
      y: Math.min(Math.max(y, 92), window.innerHeight - 96),
    });
  };
  const togglePinnedFromMenu = () => {
    if (!menu) return;
    onTogglePinned(menu.targetId);
    setMenu(null);
  };

  return (
    <>
      <div className="qq-section-heading">
        <span>{activeRows.length ? '消息' : 'QQ 联系人'}</span>
        <small>{query.trim() ? `${rows.length} 条结果` : `${totalCount} 个入口`}</small>
      </div>

      <div className="qq-row-list qq-message-list">
        {shortcuts.length > 0 && (
          <div className="qq-system-shortcuts">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.id === 'friend-requests' ? UserCheck : shortcut.id === 'mentions' ? AtSign : Bell;
              return (
                <button key={shortcut.id} type="button" onClick={() => onOpenShortcut(shortcut)} className={cn(shortcut.count > 0 && 'active')}>
                  <span className="qq-system-shortcut-icon"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <b>{shortcut.title}</b>
                    <small>{shortcut.preview}</small>
                  </span>
                  {shortcut.count > 0 && <em>{shortcut.count > 99 ? '99+' : shortcut.count}</em>}
                </button>
              );
            })}
          </div>
        )}
        {rows.length === 0 && query.trim() && (
          <div className="qq-empty-state">
            <MessageCircle className="h-6 w-6" />
            <span>没有找到相关 QQ 消息或好友。</span>
          </div>
        )}
        {rows.length === 0 && !query.trim() && (
          <button type="button" onClick={onImport} className="qq-empty-state">
            <MessageCircle className="h-6 w-6" />
            <span>{emptyText}</span>
          </button>
        )}
        {rows.map((row) => {
          const character = characters.find((item) => item.id === row.targetId);
          const group = groupChats.find((item) => item.id === row.targetId);
          const openProfile = () => {
            if (row.type === 'group') {
              onOpenGroupProfile(row.targetId);
              return;
            }
            onOpenProfile(row.targetId);
          };
          return (
            <div
              key={`${row.type}:${row.targetId}`}
              className={cn('qq-row', row.hasSession && 'active', row.isPinned && 'pinned', row.type === 'group' && 'qq-group-row')}
              onContextMenu={(event) => {
                event.preventDefault();
                openRowMenu(row, event.clientX, event.clientY);
              }}
              onPointerDown={(event) => {
                clearLongPressTimer();
                longPressTimerRef.current = window.setTimeout(() => openRowMenu(row, event.clientX, event.clientY), 560);
              }}
              onPointerUp={clearLongPressTimer}
              onPointerLeave={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
            >
              <button type="button" onClick={openProfile} className="qq-avatar-button" aria-label={`打开 ${row.name} 的 QQ 资料`}>
                {row.type === 'group' && group ? <QQGroupAvatar group={group} characters={characters} /> : <Avatar character={character} />}
              </button>
              <button type="button" onClick={() => onOpenChat(row.targetId)} className="qq-row-main">
                <div className="qq-row-title-line">
                  <p>{row.name}</p>
                  <span>{row.isPinned ? '置顶' : row.hasSession ? '刚刚' : row.type === 'group' ? `${row.memberCount || 0}人群` : '好友'}</span>
                </div>
                <div className="qq-row-preview-line">
                  <p>{row.lastMessageText}</p>
                  {!row.hasSession && <span className="qq-new-chat-pill">{row.type === 'group' ? '群聊' : '新聊天'}</span>}
                </div>
              </button>
              {row.unread > 0 && <span className="qq-unread-dot">{row.unread > 9 ? '9+' : row.unread}</span>}
            </div>
          );
        })}
      </div>

      {menu && (
        <div className="qq-message-context-menu" style={{ left: menu.x, top: menu.y }}>
          <p>{menu.name}</p>
          <button type="button" onClick={togglePinnedFromMenu}>
            {menu.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            <span>{menu.isPinned ? '取消置顶' : '置顶聊天'}</span>
          </button>
          <button type="button" onClick={() => setMenu(null)}>取消</button>
        </div>
      )}
    </>
  );
}
