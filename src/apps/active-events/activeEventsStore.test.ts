import assert from 'node:assert/strict';

import { useAppStore } from '../../store';

useAppStore.getState().setActiveEventLastRefreshAt(12345);
assert.equal(useAppStore.getState().activeEventLastRefreshAt, 12345);

useAppStore.getState().setActiveEventLastRefreshAt(0);
assert.equal(useAppStore.getState().activeEventLastRefreshAt, 0);

useAppStore.getState().setActiveReminderAutomationEnabled(false);
assert.equal(useAppStore.getState().activeReminderAutomationEnabled, false);

useAppStore.getState().setActiveReminderAutomationEnabled(true);
assert.equal(useAppStore.getState().activeReminderAutomationEnabled, true);

useAppStore.getState().setRandomProactiveMessagesEnabled(false);
assert.equal(useAppStore.getState().randomProactiveMessagesEnabled, false);

useAppStore.getState().setRandomProactiveMessagesEnabled(true);
assert.equal(useAppStore.getState().randomProactiveMessagesEnabled, true);

console.log('active event store ok');
