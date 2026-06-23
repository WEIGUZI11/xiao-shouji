# User Info App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone User信息 app that saves editable user profile facts and injects them into AI chat context when enabled.

**Architecture:** Store profile data in the existing Zustand persisted app state. Keep prompt formatting as a pure helper under `src/apps/user-info/` so it is testable without React. Render a focused `UserInfoScreen` and wire it into the app catalog and `FeatureScreen`; pass the formatted profile prompt into WeChat AI system prompt construction.

**Tech Stack:** React 19, TypeScript, Zustand persist, Vite, Node assert tests run through `tsx`, lucide-react icons.

---

### Task 1: User Profile Prompt Logic

**Files:**
- Create: `src/apps/user-info/userProfilePrompt.ts`
- Create: `src/apps/user-info/userProfilePrompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/apps/user-info/userProfilePrompt.test.ts` with Node assert cases:

```ts
import assert from 'node:assert/strict';
import { buildUserProfilePrompt, type UserProfile } from './userProfilePrompt';

const fullProfile: UserProfile = {
  sendToAi: true,
  identity: '成年创作者',
  location: '南方城市，夜猫子作息',
  personality: '慢热，嘴硬但心软',
  likes: '雨天、甜饮、被认真回应',
  boundaries: '不要替我决定现实行动',
  relationship: '和 char 是暧昧期室友',
  longTermMemory: '我讨厌突然失联。生日是 8 月 16 日。',
};

assert.equal(buildUserProfilePrompt('我', { ...fullProfile, sendToAi: false }), '');

const prompt = buildUserProfilePrompt('林秋', fullProfile);
assert.match(prompt, /用户信息/);
assert.match(prompt, /昵称：林秋/);
assert.match(prompt, /身份：成年创作者/);
assert.match(prompt, /关系设定：和 char 是暧昧期室友/);
assert.match(prompt, /长期记忆：我讨厌突然失联。生日是 8 月 16 日。/);
assert.doesNotMatch(buildUserProfilePrompt('', { sendToAi: true, likes: '  ' }), /喜好/);

const longPrompt = buildUserProfilePrompt('我', { sendToAi: true, longTermMemory: 'a'.repeat(3000) });
assert(longPrompt.length <= 1800, 'prompt should be capped to avoid oversized system context');

console.log('userProfilePrompt tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/apps/user-info/userProfilePrompt.test.ts`

Expected: FAIL because `src/apps/user-info/userProfilePrompt.ts` does not exist yet.

- [ ] **Step 3: Implement the helper**

Create `src/apps/user-info/userProfilePrompt.ts` exporting:

```ts
export interface UserProfile {
  sendToAi: boolean;
  identity: string;
  location: string;
  personality: string;
  likes: string;
  boundaries: string;
  relationship: string;
  longTermMemory: string;
}

export const defaultUserProfile: UserProfile = {
  sendToAi: true,
  identity: '',
  location: '',
  personality: '',
  likes: '',
  boundaries: '',
  relationship: '',
  longTermMemory: '',
};

export function buildUserProfilePrompt(userName: string, profile: Partial<UserProfile> | undefined) {
  const safeProfile = { ...defaultUserProfile, ...profile };
  if (!safeProfile.sendToAi) return '';
  const lines = [
    ['昵称', userName],
    ['身份', safeProfile.identity],
    ['所在地/生活环境', safeProfile.location],
    ['性格', safeProfile.personality],
    ['喜好', safeProfile.likes],
    ['雷点/禁区', safeProfile.boundaries],
    ['关系设定', safeProfile.relationship],
    ['长期记忆', safeProfile.longTermMemory],
  ]
    .map(([label, value]) => [label, String(value || '').trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}：${value}`);
  if (lines.length === 0) return '';
  const prompt = ['用户信息：', ...lines].join('\n');
  return prompt.length > 1800 ? `${prompt.slice(0, 1792)}……` : prompt;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/apps/user-info/userProfilePrompt.test.ts`

Expected: PASS and prints `userProfilePrompt tests passed`.

### Task 2: Persist Profile Data

**Files:**
- Modify: `src/store.ts`

- [ ] **Step 1: Add store fields and action**

Import `UserProfile` and `defaultUserProfile`, add `userProfile: UserProfile` to `AppState`, add `setUserProfile: (updates: Partial<UserProfile>) => void`, initialize `userProfile: defaultUserProfile`, and implement `setUserProfile` by shallow merging current profile.

- [ ] **Step 2: Add migration fallback**

In the persist `migrate` return object, add `userProfile: { ...defaultUserProfile, ...state.userProfile }`.

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: PASS, or only report unrelated pre-existing errors. Fix any errors introduced by the new store fields.

### Task 3: Standalone User Info App UI

**Files:**
- Create: `src/apps/user-info/UserInfoScreen.tsx`
- Modify: `src/apps/appsStructure.test.ts`
- Modify: `src/shell/appCatalog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add structure test expectation**

Add `user-info` to `requiredApps` and assert `src/apps/user-info/UserInfoScreen.tsx` plus `src/apps/user-info/userProfilePrompt.ts` exist.

- [ ] **Step 2: Run structure test to verify it fails**

Run: `npx tsx src/apps/appsStructure.test.ts`

Expected: FAIL because `UserInfoScreen.tsx` is not created yet.

- [ ] **Step 3: Create the screen**

Create a scrollable screen with a header, send-to-AI checkbox, the existing `userName` field, and textareas for identity, location, personality, likes, boundaries, relationship, and long-term memory. Use existing `Header`, `Panel`, and `Field` primitives plus lucide icons.

- [ ] **Step 4: Wire the app into the shell**

Add `user-info` to the `Screen` union, import `UserInfoScreen` in `src/App.tsx`, return it from `FeatureScreen`, and add a second-page catalog icon with a `CircleUserRound` icon and label `User信息`.

- [ ] **Step 5: Run structure test to verify it passes**

Run: `npx tsx src/apps/appsStructure.test.ts`

Expected: PASS and prints `apps folder structure ok`.

### Task 4: Inject Profile Into WeChat AI Context

**Files:**
- Modify: `src/apps/wechat/ai/wechatAi.ts`
- Modify: `src/apps/wechat/chat/ChatScreen.tsx`
- Test: `src/apps/user-info/userProfilePrompt.test.ts`

- [ ] **Step 1: Extend WeChat prompt builder**

Add optional `userProfilePrompt?: string` to `buildWeChatSystemPrompt` and include it after `characterPrompt`.

- [ ] **Step 2: Pass the profile prompt from ChatScreen**

Import `buildUserProfilePrompt`, read `userName` and `userProfile` from `useAppStore`, build the prompt inside `requestOneReply`, and pass it into `buildWeChatSystemPrompt`.

- [ ] **Step 3: Run targeted tests and lint**

Run:

```powershell
npx tsx src/apps/user-info/userProfilePrompt.test.ts
npx tsx src/apps/appsStructure.test.ts
npm run lint
```

Expected: both tests pass; typecheck passes or reports unrelated pre-existing errors only.

### Task 5: Manual Verification

**Files:**
- No code changes required unless verification finds a defect.

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Start dev server**

Run: `npm run dev -- --port=3012`

Expected: Vite serves the phone app at `http://127.0.0.1:3012/`.

- [ ] **Step 3: Browser smoke test**

Open the app in the Codex in-app browser, verify the desktop shows `User信息`, the app opens, fields can be edited, and no obvious layout overlap appears at phone size.
