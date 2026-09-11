const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createProactiveReminderStore,
  formatReminderMessage,
} = require('./proactive-reminders.cjs');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'small-phone-reminders-'));
const storePath = path.join(tempDir, 'reminders.json');

try {
  const store = createProactiveReminderStore({ filePath: storePath });
  const device = store.upsertDevice({
    clientId: 'client-a',
    pushToken: 'ExponentPushToken[device-a]',
    platform: 'android',
  });
  assert.equal(device.clientId, 'client-a');
  assert.equal(device.pushToken, 'ExponentPushToken[device-a]');
  assert.equal(store.getDevicesForClient('client-a').length, 1);
  assert.equal(store.getDevicesForClient('client-b').length, 0);

  const reminder = store.upsertReminder({
    clientId: 'client-a',
    calendarEventId: 'calendar-1',
    characterId: 'char-1',
    characterName: 'Lin',
    channel: 'wechat',
    title: 'Daily 20:30 reminder: drink water',
    task: 'drink water',
    hour: 20,
    minute: 30,
    timeZone: 'Asia/Shanghai',
    enabled: true,
    sourceMessageId: 'msg-1',
    createdAt: 1782000000000,
  });

  assert.equal(reminder.clientId, 'client-a');
  assert.equal(reminder.task, 'drink water');
  assert.equal(reminder.timeZone, 'Asia/Shanghai');

  const early = store.checkDueReminders(new Date('2026-06-21T20:20:00+08:00').getTime());
  assert.equal(early.length, 0, 'reminder should not fire before its minute');

  const due = store.checkDueReminders(new Date('2026-06-21T20:31:00+08:00').getTime());
  assert.equal(due.length, 1, 'reminder should create an outbox message when due');
  assert.equal(due[0].clientId, 'client-a');
  assert.equal(due[0].characterId, 'char-1');
  assert.equal(due[0].channel, 'wechat');
  assert.match(due[0].content, /20:31/);
  assert.match(due[0].content, /drink water/);

  const duplicate = store.checkDueReminders(new Date('2026-06-21T20:35:00+08:00').getTime());
  assert.equal(duplicate.length, 0, 'same occurrence should not be queued twice');

  assert.equal(store.getPendingOutbox('client-a').length, 1);
  assert.equal(store.getPendingOutbox('client-b').length, 0);
  const pending = store.getPendingOutbox('client-a');
  store.markOutboxPushed(pending[0].id, 'ExponentPushToken[device-a]', { status: 'ok' });
  assert.equal(store.read().outbox[0].deliveredTo.length, 1);
  store.ackOutbox(pending[0].id, 'client-a');
  assert.equal(store.getPendingOutbox('client-a').length, 0);

  const nextDay = store.checkDueReminders(new Date('2026-06-22T20:31:00+08:00').getTime());
  assert.equal(nextDay.length, 1, 'daily reminder should fire again next day');

  assert.equal(
    formatReminderMessage({ timeZone: 'America/New_York', hour: 6, minute: 5, task: 'wake up' }, new Date('2026-06-21T18:05:00+08:00').getTime()),
    '现在是用户所在地时间 2026年6月21日 06:05（星期日，清晨，时区 America/New_York，UTC-04:00）。提醒：wake up',
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('proactive reminder backend ok');
