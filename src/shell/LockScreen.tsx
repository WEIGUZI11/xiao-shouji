/**
 * Lock screen UI for the phone shell.
 * Main component: LockScreen.
 * Dependencies: ShellNotification data and NotificationCard renderer.
 * Maintenance note: keep unlock/open-notification behavior owned by App.tsx.
 */
import { BellRing, Unlock } from 'lucide-react';

import { cn } from '../lib/utils';
import { PersistentImage } from '../components/PersistentImage';
import { NotificationCard } from './NotificationCenter';
import type { ShellNotification } from './notifications';

export function LockScreen({
  notifications,
  wallpaper,
  onUnlock,
  onOpenNotification,
}: {
  notifications: ShellNotification[];
  wallpaper: string | null;
  onUnlock: () => void;
  onOpenNotification: (notification: ShellNotification) => void;
}) {
  const now = new Date();
  const visibleNotifications = notifications.slice(0, 4);
  return (
    <section className={cn('lock-screen', wallpaper ? 'has-custom-wallpaper' : 'has-default-lock-art')}>
      {wallpaper && <PersistentImage src={wallpaper} alt="" className="lock-wallpaper-image" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
      <div className="lock-wallpaper-shade" />
      <div className="lock-status-row">
        <span>{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <span>WiFi · 88%</span>
      </div>
      <div className="lock-clock">
        <p>{now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
        <h1>{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</h1>
      </div>
      <div className="lock-notification-stack">
        {visibleNotifications.length > 0 ? (
          visibleNotifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} compact onClick={() => onOpenNotification(notification)} />
          ))
        ) : (
          <div className="lock-empty-card">
            <BellRing className="h-5 w-5" />
            <span>今天暂时很安静</span>
          </div>
        )}
      </div>
      <button type="button" onClick={onUnlock} className="lock-unlock-button">
        <Unlock className="h-5 w-5" />
        <span>解锁</span>
      </button>
    </section>
  );
}
