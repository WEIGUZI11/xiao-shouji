# QQ Simple MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple QQ MVP that feels like a separate QQ app while reusing the existing character, chat, AI, media, and message-store foundations.

**Architecture:** Keep the existing `channel='qq'` data separation. Replace the QQ entry screen with a QQ-specific home/list component, add small pure helpers for testable QQ view-model behavior, and add channel-aware styling hooks to the shared chat screen instead of forking the full chat engine.

**Tech Stack:** React 19, TypeScript, Zustand store, Vite, standalone `tsx` tests with Node `assert`.

---

### Task 1: QQ Home View Model

**Files:**
- Create: `src/apps/qq/qqLogic.ts`
- Create: `src/apps/qq/qqLogic.test.ts`

- [ ] **Step 1: Write the failing test**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: FAIL before `qqLogic.ts` exists.

- [ ] **Step 2: Implement minimal helper logic**

Create `buildQqHomeRows` to combine characters with only QQ sessions, sort active QQ sessions before characters without sessions, and expose simple row text. Create `getQqEmptyStateText`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: PASS with `qqLogic tests passed`.

### Task 2: QQ Home Screen

**Files:**
- Modify: `src/apps/qq/QQScreen.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Replace the thin wrapper with a QQ-specific home**

Use `buildQqHomeRows` in `QQScreen`. Render a blue/white QQ home with a compact header, search-looking bar, quick actions, and friend/session rows. Each row calls `openChat(characterId, 'qq')`.

- [ ] **Step 2: Add QQ home CSS**

Add scoped classes such as `.qq-home-screen`, `.qq-home-header`, `.qq-row`, `.qq-quick-action`, and `.qq-unread-dot` to `src/index.css`.

### Task 3: QQ Chat Styling Hooks

**Files:**
- Modify: `src/apps/wechat/chat/ChatScreen.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add channel-aware classes**

Introduce `const isQq = activeChannel === 'qq'` and apply QQ classes to the chat root, header, message list, and input bar.

- [ ] **Step 2: Adjust labels for QQ**

Keep existing behavior but change user-facing QQ labels where the shared screen currently reads as WeChat-only.

- [ ] **Step 3: Add CSS for QQ chat**

Add `.qq-chat-screen`, `.qq-chat-header`, `.qq-message-list`, and `.qq-input-bar` rules so QQ has a light blue, rounded, app-like feel without breaking WeChat.

### Task 4: Verification

- [ ] Run `npx tsx src/apps/qq/qqLogic.test.ts`.
- [ ] Run `npx tsx src/apps/appsStructure.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Launch the app locally and inspect QQ home/chat in the browser.
