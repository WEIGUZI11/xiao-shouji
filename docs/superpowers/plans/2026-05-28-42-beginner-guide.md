# 42 Beginner Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing 42 tutorial popup useful for first-time users.

**Architecture:** Move guide copy into a small pure data module under `src/shell/` and render it in the existing `Desktop` guide modal. Keep the existing 42 button and modal behavior unchanged.

**Tech Stack:** React, TypeScript, Vite, Node assert tests with `tsx`.

---

### Task 1: Guide Copy Data

**Files:**
- Create: `src/shell/desktopGuide.ts`
- Create: `src/shell/desktopGuide.test.ts`

- [ ] Write a test requiring four sections: 作者信息, 新手快速上手, 桌面布局, 数据安全.
- [ ] Run `npx tsx src/shell/desktopGuide.test.ts` and confirm it fails because the module is missing.
- [ ] Implement `desktopGuideSections` with concise beginner steps.
- [ ] Run `npx tsx src/shell/desktopGuide.test.ts` and confirm it passes.

### Task 2: Render Guide Sections

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] Import `desktopGuideSections` into `src/App.tsx`.
- [ ] Replace the hard-coded guide paragraphs with mapped guide sections.
- [ ] Add small CSS for section titles and ordered/unordered lists inside `.guide-panel`.
- [ ] Run `npm run lint` and `npm run build`.

### Task 3: Browser Smoke Test

**Files:**
- No code changes unless smoke testing finds a layout issue.

- [ ] Open the local app, enter local preview, unlock, click 42, and confirm the popup shows beginner steps without obvious overlap.
