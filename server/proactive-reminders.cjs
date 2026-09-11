const fs = require('node:fs');
const path = require('node:path');

const defaultFilePath = path.resolve(process.cwd(), 'data', 'proactive-reminders.json');

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function resolveTimeZone(timeZone) {
  const candidate = String(timeZone || 'Asia/Shanghai').trim() || 'Asia/Shanghai';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return 'Asia/Shanghai';
  }
}

function getTimeParts(now, timeZone) {
  const resolvedTimeZone = resolveTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const value = (type) => parts.find((part) => part.type === type)?.value || '00';
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute')),
  };
}

function getWeekdayLabel(now, timeZone) {
  const resolvedTimeZone = resolveTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: resolvedTimeZone,
    weekday: 'long',
  }).formatToParts(new Date(now));
  return parts.find((part) => part.type === 'weekday')?.value || '';
}

function getDayPeriod(hour) {
  if (hour >= 23) return '深夜';
  if (hour < 5) return '凌晨';
  if (hour < 7) return '清晨';
  if (hour < 11) return '上午';
  if (hour < 14) return '中午';
  if (hour < 18) return '下午';
  return '晚上';
}

function formatUtcOffset(now, timeZone) {
  const resolvedTimeZone = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimeZone,
      hour: '2-digit',
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(now));
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
    if (offset === 'GMT' || offset === 'UTC') return 'UTC+00:00';
    const match = offset.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!match) return offset.replace('GMT', 'UTC');
    const [, sign, hour, minute = '00'] = match;
    return `UTC${sign}${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch {
    return 'UTC+00:00';
  }
}

function formatReminderMessage(reminder, now) {
  const timeZone = resolveTimeZone(reminder.timeZone);
  const parts = getTimeParts(now, timeZone);
  const weekday = getWeekdayLabel(now, timeZone);
  const dayPeriod = getDayPeriod(parts.hour);
  const utcOffset = formatUtcOffset(now, timeZone);
  return `现在是用户所在地时间 ${parts.year}年${parts.month}月${parts.day}日 ${pad(parts.hour)}:${pad(parts.minute)}（${weekday}，${dayPeriod}，时区 ${timeZone}，${utcOffset}）。提醒：${reminder.task || reminder.title || 'this task'}`;
}

function occurrenceKey(reminder, now) {
  const parts = getTimeParts(now, reminder.timeZone || 'Asia/Shanghai');
  return `${reminder.id}-${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function normalizeState(value) {
  return {
    reminders: Array.isArray(value?.reminders) ? value.reminders : [],
    outbox: Array.isArray(value?.outbox) ? value.outbox : [],
    devices: Array.isArray(value?.devices) ? value.devices : [],
  };
}

function normalizeClientId(clientId) {
  return String(clientId || 'default').trim() || 'default';
}

function createProactiveReminderStore({ filePath = defaultFilePath } = {}) {
  const read = () => {
    try {
      return normalizeState(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch {
      return normalizeState({});
    }
  };

  const write = (state) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(normalizeState(state), null, 2));
  };

  const upsertReminder = (input) => {
    const state = read();
    const now = Date.now();
    const id = input.id || input.calendarEventId || createId('reminder');
    const reminder = {
      id,
      clientId: normalizeClientId(input.clientId),
      calendarEventId: input.calendarEventId || id,
      characterId: String(input.characterId || '').trim(),
      characterName: String(input.characterName || '').trim(),
      channel: input.channel === 'wechat' ? 'wechat' : 'wechat',
      title: String(input.title || input.task || 'Proactive reminder').trim(),
      task: String(input.task || input.title || 'this task').trim(),
      hour: Math.max(0, Math.min(23, Math.round(Number(input.hour || 0)))),
      minute: Math.max(0, Math.min(59, Math.round(Number(input.minute || 0)))),
      timeZone: String(input.timeZone || 'Asia/Shanghai').trim(),
      enabled: input.enabled !== false,
      sourceMessageId: input.sourceMessageId ? String(input.sourceMessageId) : undefined,
      createdAt: Number.isFinite(input.createdAt) ? Number(input.createdAt) : now,
      updatedAt: now,
    };
    write({
      ...state,
      reminders: [reminder, ...state.reminders.filter((item) => item.id !== id)],
    });
    return reminder;
  };

  const upsertDevice = (input) => {
    const state = read();
    const now = Date.now();
    const clientId = normalizeClientId(input.clientId);
    const pushToken = String(input.pushToken || '').trim();
    if (!pushToken) throw new Error('pushToken is required');
    const device = {
      id: input.id || `${clientId}:${pushToken}`,
      clientId,
      pushToken,
      platform: String(input.platform || 'android').trim() || 'android',
      enabled: input.enabled !== false,
      createdAt: Number.isFinite(input.createdAt) ? Number(input.createdAt) : now,
      updatedAt: now,
    };
    write({
      ...state,
      devices: [device, ...state.devices.filter((item) => item.clientId !== clientId || item.pushToken !== pushToken)],
    });
    return device;
  };

  const getDevicesForClient = (clientId = 'default') => {
    const normalizedClientId = normalizeClientId(clientId);
    return read().devices.filter((device) => device.enabled !== false && device.clientId === normalizedClientId && device.pushToken);
  };

  const checkDueReminders = (now = Date.now()) => {
    const state = read();
    const created = [];
    const outbox = [...state.outbox];
    state.reminders.filter((reminder) => reminder.enabled && reminder.characterId).forEach((reminder) => {
      const parts = getTimeParts(now, reminder.timeZone || 'Asia/Shanghai');
      const targetMinute = Number(reminder.hour) * 60 + Number(reminder.minute);
      const currentMinute = parts.hour * 60 + parts.minute;
      if (currentMinute < targetMinute || currentMinute - targetMinute > 10) return;
      const key = occurrenceKey(reminder, now);
      if (outbox.some((item) => item.occurrenceKey === key)) return;
      const item = {
        id: createId('outbox'),
        reminderId: reminder.id,
        clientId: normalizeClientId(reminder.clientId),
        occurrenceKey: key,
        characterId: reminder.characterId,
        characterName: reminder.characterName,
        channel: reminder.channel || 'wechat',
        content: formatReminderMessage(reminder, now),
        task: reminder.task,
        createdAt: now,
        deliveredTo: [],
        ackedBy: [],
      };
      outbox.push(item);
      created.push(item);
    });
    if (created.length > 0) write({ ...state, outbox });
    return created;
  };

  const getPendingOutbox = (clientId = 'default') => {
    const normalizedClientId = normalizeClientId(clientId);
    return read().outbox.filter((item) =>
      normalizeClientId(item.clientId) === normalizedClientId
      && (!Array.isArray(item.ackedBy) || !item.ackedBy.includes(normalizedClientId))
    );
  };

  const ackOutbox = (outboxId, clientId = 'default') => {
    const state = read();
    const normalizedClientId = normalizeClientId(clientId);
    let updated = null;
    const outbox = state.outbox.map((item) => {
      if (item.id !== outboxId) return item;
      const ackedBy = Array.from(new Set([...(Array.isArray(item.ackedBy) ? item.ackedBy : []), normalizedClientId]));
      updated = { ...item, ackedBy, ackedAt: Date.now() };
      return updated;
    });
    write({ ...state, outbox });
    return updated;
  };

  const markOutboxPushed = (outboxId, pushToken, result = {}) => {
    const state = read();
    const token = String(pushToken || '').trim();
    let updated = null;
    const outbox = state.outbox.map((item) => {
      if (item.id !== outboxId) return item;
      const deliveredTo = Array.isArray(item.deliveredTo) ? item.deliveredTo : [];
      const entry = {
        pushToken: token,
        status: String(result.status || 'unknown'),
        message: result.message ? String(result.message) : undefined,
        deliveredAt: Date.now(),
      };
      updated = {
        ...item,
        deliveredTo: [...deliveredTo.filter((delivery) => delivery.pushToken !== token), entry],
      };
      return updated;
    });
    write({ ...state, outbox });
    return updated;
  };

  return {
    read,
    upsertReminder,
    upsertDevice,
    getDevicesForClient,
    checkDueReminders,
    getPendingOutbox,
    ackOutbox,
    markOutboxPushed,
  };
}

module.exports = {
  createProactiveReminderStore,
  formatReminderMessage,
};
