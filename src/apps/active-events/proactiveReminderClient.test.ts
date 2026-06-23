import assert from 'node:assert/strict';

import {
  fetchBackendProactiveReminderOutbox,
  isProactiveReminderBackendConfigured,
  registerBackendProactiveReminder,
} from './proactiveReminderClient';

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error('fetch should not be called without proactive reminder backend url');
};

assert.equal(isProactiveReminderBackendConfigured(), false);

const items = await fetchBackendProactiveReminderOutbox('client-a');
assert.deepEqual(items, []);

const registration = await registerBackendProactiveReminder({
  calendarEventId: 'calendar-1',
  characterId: 'char-1',
  characterName: 'Lin',
  channel: 'wechat',
  title: 'Daily reminder',
  task: 'Drink water',
  hour: 8,
  minute: 30,
  timeZone: 'Asia/Shanghai',
  enabled: true,
});
assert.equal(registration.skipped, true);
assert.equal(fetchCalls, 0);

console.log('proactiveReminderClient tests passed');
