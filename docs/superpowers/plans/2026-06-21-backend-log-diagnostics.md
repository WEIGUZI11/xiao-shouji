# Backend Log Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop local preview from spamming proactive-reminder backend errors and make the in-phone backend console more useful for API diagnosis.

**Architecture:** Keep proactive-reminder backend access behind the existing client module, with an explicit configured-backend guard. Add small pure parsing helpers to the logs module so the UI can show structured request diagnostics without changing the persisted `appLogs` shape.

**Tech Stack:** React, TypeScript, Zustand persisted app logs, Vite env vars, `tsx` node-style tests.

---

### Task 1: Proactive Reminder Backend Guard

**Files:**
- Modify: `src/apps/active-events/proactiveReminderClient.ts`
- Test: `src/apps/active-events/proactiveReminderClient.test.ts`

- [ ] Write a failing test that calls `fetchBackendProactiveReminderOutbox` and `registerBackendProactiveReminder` with no configured backend and asserts `fetch` is not called.
- [ ] Add `isProactiveReminderBackendConfigured()` and make backend fetch/register functions skip quietly when `VITE_PROACTIVE_REMINDER_API_URL` is empty.
- [ ] Run `npx tsx src/apps/active-events/proactiveReminderClient.test.ts`.

### Task 2: Log Diagnostic Fields

**Files:**
- Modify: `src/apps/logs/logConsole.ts`
- Modify: `src/apps/logs/LogsScreen.tsx`
- Test: `src/apps/logs/logConsole.test.ts`

- [ ] Write a failing test for extracting `HTTP 400`, `/v1/chat/completions`, `model`, and rough size from log detail.
- [ ] Add `getLogDiagnostics()` and render its chips under each console entry.
- [ ] Run `npx tsx src/apps/logs/logConsole.test.ts`.

### Task 3: Verification And Notes

**Files:**
- Modify: `docs/work-log.md`

- [ ] Run focused tests for proactive reminders and logs.
- [ ] Run `npx tsx src/lib/runtimeErrorLog.test.ts`, `npx tsx src/apps/appsStructure.test.ts`, `npm run lint`, and `npm run build`.
- [ ] Add a short work-log entry with exact verification commands and known warnings.
