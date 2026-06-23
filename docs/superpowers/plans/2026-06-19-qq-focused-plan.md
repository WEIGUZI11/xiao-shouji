# QQ Focused Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 QQ 做成小手机里一个独立、好用、有 QQ 感的聊天功能，同时不碰微信、日记、音乐、小红书等其他功能。

**Architecture:** 保持现有 `channel: 'qq'` 聊天数据隔离，QQ 自己的入口、首页逻辑、视觉文案都放在 `src/apps/qq/`。聊天房间继续复用 `src/apps/wechat/chat/ChatScreen.tsx` 的成熟发送、AI 回复、图片、语音和表情能力，只给 QQ 加轻量配置和样式钩子，避免复制微信整套模块。

**Tech Stack:** React 19, TypeScript, Zustand, Vite, lucide-react, CSS variables, `tsx` logic tests, `npm run lint`, `npm run build`.

---

## Scope Lock

| Rule | Decision |
| --- | --- |
| 只做 QQ | 只主动修改 `src/apps/qq/`、QQ 相关 CSS、必要的聊天共享配置、QQ 文档 |
| 不碰其他 App | 不改微信四页签、日记、相册、音乐、小红书、B站、电话、主动事件 |
| 数据模型 | 继续使用现有 `chatSessions` + `channel: 'qq'`，第一轮不新增持久化字段 |
| 群聊/空间 | 第一轮先做 QQ 入口和可点击界面骨架，不做跨模块生活事件联动 |
| 文档 | 只同步 `PROJECT_OUTLINE.md` 的 QQ 描述、`模块/QQ/README.md`、`docs/work-log.md` |

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `src/apps/qq/qqLogic.ts` | Modify | QQ 首页行数据、预览文案、快捷入口状态、搜索过滤 |
| `src/apps/qq/qqLogic.test.ts` | Modify | QQ 逻辑测试，覆盖乱码修复、QQ-only 会话、排序、搜索、空状态 |
| `src/apps/qq/QQScreen.tsx` | Modify | QQ 首页 UI、顶部状态、搜索框、最近聊天、好友列表、快捷入口 |
| `src/apps/qq/qqUiText.ts` | Create | QQ 专属中文文案集中管理，避免再出现乱码散落 |
| `src/apps/wechat/chat/ChatScreen.tsx` | Modify narrowly | 只加 QQ 文案和 class 配置，不移动微信逻辑 |
| `src/index.css` | Modify narrowly | QQ 首页和 QQ 聊天样式；只追加 `.qq-*` 范围规则 |
| `模块/QQ/README.md` | Rewrite | 更新为当前 QQ 架构、边界和下一步 |
| `PROJECT_OUTLINE.md` | Modify one QQ paragraph | 把 QQ 入口说明更新为真实状态 |
| `docs/work-log.md` | Append | 记录本轮 QQ 工作和验证结果 |

## Plan Table

| Phase | Task | Files | Done When | Verification |
| --- | --- | --- | --- | --- |
| 1 | 修 QQ 乱码和基础测试 | `src/apps/qq/qqUiText.ts`, `src/apps/qq/qqLogic.ts`, `src/apps/qq/qqLogic.test.ts`, `src/apps/qq/QQScreen.tsx` | QQ 首页、测试、空状态文案都显示正常中文 | `npx tsx src/apps/qq/qqLogic.test.ts` |
| 2 | 强化 QQ 首页 | `src/apps/qq/qqLogic.ts`, `src/apps/qq/QQScreen.tsx`, `src/index.css` | 首页有 QQ 顶栏、搜索、最近聊天、好友列表、未读数、快速入口 | `npm run lint` plus browser check |
| 3 | 做 QQ 聊天房间差异化 | `src/apps/wechat/chat/ChatScreen.tsx`, `src/index.css` | QQ 聊天页标题、背景、输入栏、气泡风格不再像微信 | `npm run lint`, manual QQ chat send |
| 4 | 加 QQ 快捷功能入口骨架 | `src/apps/qq/QQScreen.tsx`, `src/apps/qq/qqLogic.ts`, `src/index.css` | 群聊、空间、戳一戳等入口有清晰状态，不误导为已完整实现 | `npx tsx src/apps/qq/qqLogic.test.ts` |
| 5 | 文档同步 | `模块/QQ/README.md`, `PROJECT_OUTLINE.md`, `docs/work-log.md` | 文档说清楚 QQ 已独立到 `src/apps/qq/`，聊天引擎仍复用共享房间 | Read changed docs |
| 6 | 整体验收 | no new files | QQ 首页和聊天可打开、无黑屏、构建通过 | `npx tsx src/apps/qq/qqLogic.test.ts`, `npx tsx src/apps/appsStructure.test.ts`, `npm run lint`, `npm run build` |

---

### Task 1: 修 QQ 乱码和文案来源

**Files:**
- Create: `src/apps/qq/qqUiText.ts`
- Modify: `src/apps/qq/qqLogic.ts`
- Modify: `src/apps/qq/qqLogic.test.ts`
- Modify: `src/apps/qq/QQScreen.tsx`

- [ ] **Step 1: Write the failing text test**

Add assertions in `src/apps/qq/qqLogic.test.ts` that expect normal Chinese:

```ts
assert.equal(rows[0].lastMessageText, 'QQ消息');
assert.equal(rows[1].lastMessageText, '晚上打游戏吗');
assert.equal(getQqEmptyStateText(0), '还没有角色。先去通讯录导入 PNG/JSON 酒馆卡。');
assert.equal(getQqEmptyStateText(2), '还没有 QQ 会话，找个好友聊一句吧。');
```

- [ ] **Step 2: Run test to verify current failure**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: FAIL because current test fixtures and helper strings include mojibake text.

- [ ] **Step 3: Create `qqUiText.ts`**

Create a small text registry:

```ts
export const QQ_TEXT = {
  appName: 'QQ',
  online: '手机在线',
  searchPlaceholder: '搜索好友、聊天记录',
  friends: '好友',
  groups: '群聊',
  qzone: '空间',
  recentChats: '最近聊天',
  qqFriends: 'QQ 好友',
  newChat: '新聊天',
  justNow: '刚刚',
  friend: '好友',
  startChat: '点开建立 QQ 聊天',
  noCharacters: '还没有角色。先去通讯录导入 PNG/JSON 酒馆卡。',
  noSessions: '还没有 QQ 会话，找个好友聊一句吧。',
  sticker: '表情包',
  image: '图片',
  voice: '语音条',
  transfer: '转账',
  redPacket: '红包',
  shopping: '购物',
  callNote: '通话记录',
} as const;
```

- [ ] **Step 4: Replace hard-coded QQ text**

Import `QQ_TEXT` in `qqLogic.ts` and `QQScreen.tsx`; replace current garbled strings with constants.

- [ ] **Step 5: Run test to verify pass**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: PASS with `qqLogic tests passed`.

### Task 2: 强化 QQ 首页

**Files:**
- Modify: `src/apps/qq/qqLogic.ts`
- Modify: `src/apps/qq/qqLogic.test.ts`
- Modify: `src/apps/qq/QQScreen.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add search/filter logic test**

Add a test for `filterQqHomeRows(rows, '小')` returning only matching names or preview text.

- [ ] **Step 2: Implement `filterQqHomeRows`**

Keep it UI-free:

```ts
export function filterQqHomeRows(rows: QqHomeRow[], query: string) {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return rows;
  return rows.filter((row) =>
    [row.name, row.lastMessageText].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)),
  );
}
```

- [ ] **Step 3: Wire search state in `QQScreen.tsx`**

Use local `useState('')`, bind the search input, and render filtered rows. Keep `openChat(row.characterId, 'qq')`.

- [ ] **Step 4: Polish QQ home CSS**

Only touch `.qq-*` selectors. Ensure no text overflow at 360px width, quick actions have stable sizes, and list rows do not shift when unread count appears.

- [ ] **Step 5: Verify**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: PASS.

### Task 3: QQ 聊天房间差异化

**Files:**
- Modify narrowly: `src/apps/wechat/chat/ChatScreen.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Confirm existing QQ hook**

Check `const isQq = activeChannel === 'qq'` remains in `ChatScreen.tsx`.

- [ ] **Step 2: Add QQ-only labels**

Keep shared behavior, but make QQ-facing labels read:

```ts
const chatSubtitle = activeGroup ? `${groupMembers.length} 个成员` : isQq ? 'QQ 聊天' : '';
```

- [ ] **Step 3: Add QQ CSS variables**

Append or refine `.qq-chat-screen`, `.qq-chat-header`, `.qq-message-list`, `.qq-input-bar` rules only. Do not modify `.wechat-*` rules unless they are already consumed through QQ-specific parent selectors.

- [ ] **Step 4: Verify**

Run: `npm run lint`

Expected: PASS.

### Task 4: QQ 快捷入口骨架

**Files:**
- Modify: `src/apps/qq/QQScreen.tsx`
- Modify: `src/apps/qq/qqLogic.ts`
- Modify: `src/apps/qq/qqLogic.test.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Define quick actions**

Create `buildQqQuickActions()` in `qqLogic.ts` returning:

```ts
[
  { id: 'friends', label: '好友', status: 'ready' },
  { id: 'groups', label: '群聊', status: 'coming-soon' },
  { id: 'qzone', label: '空间', status: 'coming-soon' },
  { id: 'poke', label: '戳一戳', status: 'coming-soon' },
]
```

- [ ] **Step 2: Test quick actions**

Assert the first action is ready and the others are `coming-soon`.

- [ ] **Step 3: Render actions**

In `QQScreen.tsx`, make `friends` route to `setScreen('contacts')`; other actions show a small disabled/helper state inside QQ home instead of navigating elsewhere.

- [ ] **Step 4: Verify**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: PASS.

### Task 5: 文档同步

**Files:**
- Modify: `模块/QQ/README.md`
- Modify: `PROJECT_OUTLINE.md`
- Modify: `docs/work-log.md`

- [ ] **Step 1: Rewrite QQ README**

State the current source of truth:

```md
# QQ

QQ 的独立入口在 `src/apps/qq/QQScreen.tsx`。
QQ 首页逻辑在 `src/apps/qq/qqLogic.ts`。
QQ 聊天数据沿用 `src/store.ts` 的 `chatSessions`，通过 `channel: 'qq'` 与微信隔离。
QQ 聊天房间暂时复用 `src/apps/wechat/chat/ChatScreen.tsx`，只添加 QQ 文案和样式钩子。
```

- [ ] **Step 2: Update `PROJECT_OUTLINE.md` QQ line**

Replace the outdated QQ sentence with one that mentions `QQScreen.tsx`, `qqLogic.ts`, and shared chat room reuse.

- [ ] **Step 3: Append work log**

Add a dated entry describing QQ-only scope and verification commands.

### Task 6: 验收

**Files:**
- No source files unless verification finds a QQ-specific bug.

- [ ] **Step 1: Run QQ logic test**

Run: `npx tsx src/apps/qq/qqLogic.test.ts`

Expected: PASS with `qqLogic tests passed`.

- [ ] **Step 2: Run app structure test**

Run: `npx tsx src/apps/appsStructure.test.ts`

Expected: PASS.

- [ ] **Step 3: Run TypeScript lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS and `dist/` generated.

- [ ] **Step 5: Browser check**

Start dev server: `npm run dev`

Open the local URL and verify:
- QQ icon opens QQ home.
- QQ home Chinese text is readable.
- Search filters rows.
- Tapping a row opens a QQ chat, not WeChat.
- Chat page uses QQ title/styling.
- No unrelated App has been visually changed.

## Self Review

- Spec coverage: The plan covers QQ-only scope,乱码修复, 首页, 聊天差异化, 快捷入口, 文档, verification.
- Placeholder scan: No `TBD`, `TODO`, or undefined future task remains.
- Type consistency: New helpers are in `qqLogic.ts`, UI constants in `qqUiText.ts`, and existing store channel remains `'qq'`.
