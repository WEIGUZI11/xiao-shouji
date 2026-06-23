import type { ChatMessage } from '../../store';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const reminderApiUrl = (viteEnv.VITE_PROACTIVE_REMINDER_API_URL || '').replace(/\/+$/, '');
const clientIdKey = 'small-phone.proactive-reminder-client-id';

export type ProactiveReminderRegistration = {
  clientId?: string;
  calendarEventId: string;
  characterId?: string;
  characterName?: string;
  channel: 'wechat';
  title: string;
  task: string;
  hour: number;
  minute: number;
  timeZone: string;
  enabled: boolean;
  sourceMessageId?: string;
  createdAt?: number;
};

export type ProactiveReminderDeviceRegistration = {
  clientId: string;
  pushToken: string;
  platform: string;
  enabled?: boolean;
};

export type NativeLocalReminderSchedule = {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  data?: Record<string, unknown>;
};

export type ProactiveReminderOutboxItem = {
  id: string;
  reminderId: string;
  clientId?: string;
  occurrenceKey: string;
  characterId: string;
  characterName?: string;
  channel: 'wechat';
  content: string;
  task: string;
  createdAt: number;
};

function endpoint(path: string) {
  return `${reminderApiUrl}${path}`;
}

export function isProactiveReminderBackendConfigured() {
  return Boolean(reminderApiUrl);
}

export function getProactiveReminderClientId() {
  let id = window.localStorage.getItem(clientIdKey);
  if (!id) {
    id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(clientIdKey, id);
  }
  return id;
}

export async function registerBackendProactiveReminder(reminder: ProactiveReminderRegistration) {
  if (!isProactiveReminderBackendConfigured()) {
    return { skipped: true, reason: 'proactive reminder backend is not configured' };
  }
  const response = await fetch(endpoint('/api/proactive-reminders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reminder),
  });
  if (!response.ok) throw new Error(`主动提醒后端注册失败：HTTP ${response.status}`);
  return response.json();
}

export async function registerBackendProactiveReminderDevice(device: ProactiveReminderDeviceRegistration) {
  if (!isProactiveReminderBackendConfigured()) {
    return { skipped: true, reason: 'proactive reminder backend is not configured' };
  }
  const response = await fetch(endpoint('/api/proactive-reminders/devices'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  });
  if (!response.ok) throw new Error(`Proactive reminder device registration failed: HTTP ${response.status}`);
  return response.json();
}

export function installNativePushTokenBridge(onResult?: (result: { ok: boolean; pushToken?: string; error?: string }) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ pushToken?: string; platform?: string }>).detail || {};
    const pushToken = String(detail.pushToken || '').trim();
    if (!pushToken) return;
    const clientId = getProactiveReminderClientId();
    void registerBackendProactiveReminderDevice({
      clientId,
      pushToken,
      platform: String(detail.platform || 'android'),
      enabled: true,
    })
      .then(() => onResult?.({ ok: true, pushToken }))
      .catch((error) => onResult?.({
        ok: false,
        pushToken,
        error: error instanceof Error ? error.message : String(error),
      }));
  };
  window.addEventListener('small-phone-native-push-token', handler);
  return () => window.removeEventListener('small-phone-native-push-token', handler);
}

export function scheduleNativeLocalProactiveReminder(reminder: NativeLocalReminderSchedule) {
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({
    type: 'small-phone-schedule-local-reminder',
    ...reminder,
  }));
  return true;
}

export async function fetchBackendProactiveReminderOutbox(clientId: string) {
  if (!isProactiveReminderBackendConfigured()) return [];
  const response = await fetch(endpoint(`/api/proactive-reminders/outbox?clientId=${encodeURIComponent(clientId)}`));
  if (!response.ok) throw new Error(`主动提醒后端拉取失败：HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.items) ? data.items as ProactiveReminderOutboxItem[] : [];
}

export async function ackBackendProactiveReminderOutbox(id: string, clientId: string) {
  if (!isProactiveReminderBackendConfigured()) return;
  await fetch(endpoint(`/api/proactive-reminders/outbox/${encodeURIComponent(id)}/ack`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
}

export function buildReminderMessageFromOutbox(item: ProactiveReminderOutboxItem): ChatMessage {
  return {
    id: `msg-${item.id}`,
    role: 'model',
    content: item.content,
    timestamp: item.createdAt,
    kind: 'text',
  };
}
