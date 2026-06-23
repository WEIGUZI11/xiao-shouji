/**
 * Notification center UI for the phone shell.
 * Main components: NotificationCenter, NotificationCard.
 * Dependencies: ShellNotification data from notifications.ts and shared cn utility.
 * Maintenance note: notification derivation stays in notifications.ts; this file renders only.
 */
import { CalendarDays, FileText, MessageCircle, Phone } from 'lucide-react';
import React from 'react';

import { cn } from '../lib/utils';
import type { ShellNotification } from './notifications';

export function NotificationCenter({
  notifications,
  onClose,
  onOpenNotification,
}: {
  notifications: ShellNotification[];
  onClose: () => void;
  onOpenNotification: (notification: ShellNotification) => void;
}) {
  return (
    <div className="notification-center">
      <div className="notification-sheet">
        <div className="notification-header">
          <div>
            <p>通知中心</p>
            <h2>{notifications.length > 0 ? `${notifications.length} 条提醒` : '暂无提醒'}</h2>
          </div>
          <button type="button" onClick={onClose} className="widget-delete static" aria-label="关闭通知中心">
            ×
          </button>
        </div>
        <div className="notification-list">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} onClick={() => onOpenNotification(notification)} />
            ))
          ) : (
            <div className="notification-empty">未读消息、未接电话和提醒会显示在这里。</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCard({ notification, compact, onClick }: { key?: React.Key; notification: ShellNotification; compact?: boolean; onClick: () => void }) {
  const icon = notification.kind === 'chat'
    ? <MessageCircle />
    : notification.kind === 'call'
      ? <Phone />
      : notification.kind === 'calendar'
        ? <CalendarDays />
        : <FileText />;
  return (
    <button type="button" onClick={onClick} className={cn('notification-card', compact && 'compact')}>
      <span className={cn('notification-icon', `kind-${notification.kind}`)}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="notification-title">{notification.title}</span>
        <span className="notification-body">{notification.body}</span>
      </span>
      {notification.count && notification.count > 1 ? <span className="notification-count">{notification.count}</span> : null}
    </button>
  );
}
