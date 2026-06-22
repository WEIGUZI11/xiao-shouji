# Char Active Random Proactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controllable `char主动` random proactive message system that reads character persona, schedule hints, and lightweight life-event drafts before writing low-frequency WeChat private messages.

**Architecture:** Keep generation logic UI-free in `src/apps/active-events/activeEventsLogic.ts`, with deterministic test hooks for probability and variant selection. Store only one new persisted boolean in `src/store.ts`, expose it in `ActiveEventsScreen`, and run a small top-level interval hook in `src/App.tsx` that writes messages and `lifeEvents` when the switch is enabled.

**Tech Stack:** React 19, Zustand persist store, TypeScript, existing `tsx` tests, Vite.

---

## File Structure

- Modify `src/apps/active-events/activeEventsLogic.ts`: add persona proactivity parsing, schedule trigger parsing, lightweight life draft selection, message composition, daily cap/cooldown/sourceId dedupe, and `buildRandomProactiveMessageWrites`.
- Modify `src/apps/active-events/activeEventsLogic.test.ts`: add tests for schedule-triggered messages, non-template variation, persona-supported travel, daily caps, dedupe, and disabled state.
- Modify `src/store.ts`: add `randomProactiveMessagesEnabled`, setter, initial state, persist migration default, and increment persist version from `59` to `60`.
- Modify `src/apps/active-events/activeEventsStore.test.ts`: cover the new boolean setter.
- Modify `src/apps/active-events/ActiveEventsScreen.tsx`: add the “随机主动” switch and explanatory copy.
- Modify `src/App.tsx`: add `useRandomProactiveMessagesAutomation` interval hook and call it beside existing proactive reminder automation.
- Modify `PROJECT_OUTLINE.md`: document the new active-event capability and store migration version.
- Modify `docs/life-system-framework.md`: document random proactive messages as a local low-frequency active-event layer.
- Modify `docs/work-log.md`: append the implementation record and verification commands.

---

### Task 1: Random Proactive Logic Tests

**Files:**
- Modify: `src/apps/active-events/activeEventsLogic.test.ts`

- [ ] **Step 1: Add failing tests for the new logic**

Append these imports to the existing import block:

```ts
  buildRandomProactiveMessageWrites,
```

Append these test cases before the final `console.log('active event logic ok');`:

```ts
const randomBaseNow = new Date('2026-06-22T15:05:00+08:00').getTime();
const activeStudent = {
  ...character,
  id: 'char-active-student',
  name: '夏弦',
  description: '大学生，下午三点下课，很主动，会经常报备自己的日常。',
  personality: '主动、黏人、喜欢聊天',
  systemPrompt: '15:00 下课后通常会看手机。',
};
const randomContext: ActiveEventContext = {
  ...baseContext,
  characters: [activeStudent],
  chatSessions: {},
  diaries: [],
  calendarEvents: [],
  galleryPhotos: [],
  wechatMoments: [],
  musicTracks: [],
  lifeEvents: [],
};

const disabledRandom = buildRandomProactiveMessageWrites(randomContext, {
  now: randomBaseNow,
  enabled: false,
  probabilityRoll: 0,
  variantSeed: 1,
});
assert.equal(disabledRandom.length, 0, 'disabled random proactive switch should not create messages');

const classDismissed = buildRandomProactiveMessageWrites(randomContext, {
  now: randomBaseNow,
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 1,
});
assert.equal(classDismissed.length, 1, 'persona schedule should trigger a proactive message near class dismissal');
assert.equal(classDismissed[0].chatTarget.characterId, 'char-active-student');
assert.equal(classDismissed[0].chatTarget.channel, 'wechat');
assert.match(classDismissed[0].chatMessage.content, /下课|课/);
assert.match(classDismissed[0].lifeEvent.sourceId || '', /random-proactive-char-active-student/);
assert.ok(classDismissed[0].lifeEvent.tags?.includes('随机主动'));
assert.ok(classDismissed[0].lifeEvent.tags?.includes('下课'));

const classDismissedVariant = buildRandomProactiveMessageWrites(randomContext, {
  now: randomBaseNow,
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 2,
});
assert.notEqual(
  classDismissedVariant[0].chatMessage.content,
  classDismissed[0].chatMessage.content,
  'same schedule scene should support varied wording',
);

const repeatedSchedule = buildRandomProactiveMessageWrites({
  ...randomContext,
  lifeEvents: [{
    ...classDismissed[0].lifeEvent,
    id: 'life-random-sent',
    createdAt: randomBaseNow,
    importance: 3,
  }],
}, {
  now: randomBaseNow + 5 * 60 * 1000,
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 3,
});
assert.equal(repeatedSchedule.length, 0, 'same random proactive source should not send twice');

const traveler = {
  ...character,
  id: 'char-traveler',
  name: '遥',
  description: '旅行摄影师，经常到处旅行、采风、换城市，会给用户报备位置。',
  personality: '主动，喜欢分享路上的事情',
};
const travelerMessage = buildRandomProactiveMessageWrites({
  ...randomContext,
  characters: [traveler],
  lifeEvents: [],
}, {
  now: new Date('2026-06-22T17:20:00+08:00').getTime(),
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 4,
});
assert.equal(travelerMessage.length, 1, 'traveler persona may generate location check-ins');
assert.ok(travelerMessage[0].lifeEvent.tags?.includes('地点报备'));
assert.match(travelerMessage[0].chatMessage.content, /城市|海边|车站|路上|到了|路过/);

const ordinaryStudent = {
  ...character,
  id: 'char-ordinary-student',
  name: '普通学生',
  description: '每天固定在学校上课，下午会自习。',
  personality: '普通，不太主动',
};
const ordinaryRandom = buildRandomProactiveMessageWrites({
  ...randomContext,
  characters: [ordinaryStudent],
  lifeEvents: [],
}, {
  now: new Date('2026-06-22T17:20:00+08:00').getTime(),
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 4,
});
assert.ok(!ordinaryRandom[0]?.lifeEvent.tags?.includes('地点报备'), 'non-travel persona should not invent large location changes');

const lowActiveAlreadySent = buildRandomProactiveMessageWrites({
  ...randomContext,
  characters: [{
    ...ordinaryStudent,
    id: 'char-low-active',
    personality: '不主动、慢热、沉默、忙',
  }],
  lifeEvents: [{
    id: 'life-low-active-earlier',
    type: 'chat',
    app: 'wechat',
    characterId: 'char-low-active',
    title: '随机主动',
    summary: 'earlier',
    importance: 3,
    sourceId: 'random-proactive-char-low-active-2026-06-22-random-emotion-afternoon',
    readableByChar: true,
    tags: ['随机主动'],
    createdAt: new Date('2026-06-22T12:00:00+08:00').getTime(),
  }],
}, {
  now: new Date('2026-06-22T17:20:00+08:00').getTime(),
  enabled: true,
  probabilityRoll: 0,
  variantSeed: 5,
});
assert.equal(lowActiveAlreadySent.length, 0, 'low proactive persona should stop after one daily proactive message');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npx tsx src/apps/active-events/activeEventsLogic.test.ts
```

Expected: FAIL with a TypeScript/runtime error that `buildRandomProactiveMessageWrites` is not exported.

- [ ] **Step 3: Commit only the failing test if working with a TDD checkpoint**

```powershell
git add -- src/apps/active-events/activeEventsLogic.test.ts
git commit -m "test: cover random proactive char messages"
```

---

### Task 2: Random Proactive Pure Logic

**Files:**
- Modify: `src/apps/active-events/activeEventsLogic.ts`
- Test: `src/apps/active-events/activeEventsLogic.test.ts`

- [ ] **Step 1: Add exported types and options near existing proactive types**

Add after `export interface ProactiveReminderWrite`:

```ts
export type RandomProactiveTone = 'high' | 'normal' | 'low';
export type RandomProactiveEventType = 'class_dismissed' | 'work_done' | 'meal' | 'morning' | 'late_night' | 'outing' | 'food' | 'work_break' | 'shopping' | 'travel' | 'emotion';

export interface RandomProactiveMessageWrite {
  chatTarget: { characterId: string; channel: 'wechat' };
  chatMessage: ChatMessage;
  lifeEvent: LifeEventDraft;
  appLog: { type: 'info'; title: string; detail: string };
}

interface BuildRandomProactiveOptions {
  now?: number;
  enabled: boolean;
  probabilityRoll?: number;
  variantSeed?: number;
  maxWrites?: number;
}

interface RandomLifeDraft {
  eventType: RandomProactiveEventType;
  sceneLabel: string;
  tag: string;
  summary: string;
  sourcePart: string;
}
```

- [ ] **Step 2: Add helper functions before `buildDueProactiveReminderWrites`**

```ts
function getDateKey(now: number) {
  const date = new Date(now);
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

function getSlotKey(now: number) {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late_night';
}

function classifyRandomProactiveTone(character: Character): RandomProactiveTone {
  const text = getCharacterProfileText(character);
  if (/(不主动|慢热|沉默|寡言|克制|冷淡|社恐|很忙|忙碌)/.test(text)) return 'low';
  if (/(主动|黏人|粘人|报备|话多|外向|喜欢聊天|经常发消息|会关心|想你)/.test(text)) return 'high';
  return 'normal';
}

function getDailyRandomProactiveLimit(tone: RandomProactiveTone) {
  if (tone === 'high') return 4;
  if (tone === 'low') return 1;
  return 2;
}

function getRandomProactiveCooldownMs(tone: RandomProactiveTone) {
  if (tone === 'high') return 60 * 60 * 1000;
  if (tone === 'low') return 180 * 60 * 1000;
  return 120 * 60 * 1000;
}

function isWithinMinutes(now: number, hour: number, minute: number, windowMinutes: number) {
  const current = new Date(now);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  return Math.abs(current.getTime() - target.getTime()) <= windowMinutes * 60 * 1000;
}

function parseScheduleTimeForKeyword(text: string, keyword: RegExp) {
  const normalized = cleanText(text);
  const matches = Array.from(normalized.matchAll(/(早上|上午|中午|下午|晚上|夜里|凌晨|深夜)?([零一二两三四五六七八九十\d]{1,3})(?:点|[:：])([零一二两三四五六七八九十\d]{1,3}分?)?/g));
  for (const match of matches) {
    const start = Math.max(0, (match.index || 0) - 12);
    const end = Math.min(normalized.length, (match.index || 0) + match[0].length + 12);
    const around = normalized.slice(start, end);
    if (!keyword.test(around)) continue;
    const time = parseReminderTime(match[0]);
    if (time) return time;
  }
  return null;
}

function buildScheduleLifeDraft(character: Character, now: number): RandomLifeDraft | null {
  const text = getCharacterProfileText(character);
  const classTime = parseScheduleTimeForKeyword(text, /(下课|放学|课间)/);
  if (classTime && isWithinMinutes(now, classTime.hour, classTime.minute, 20)) {
    return { eventType: 'class_dismissed', sceneLabel: '下课', tag: '下课', summary: '刚下课，摸到手机想报备一下。', sourcePart: `class-${classTime.label}` };
  }
  const workTime = parseScheduleTimeForKeyword(text, /(下班|收工|忙完|结束工作|夜班结束)/);
  if (workTime && isWithinMinutes(now, workTime.hour, workTime.minute, 20)) {
    return { eventType: 'work_done', sceneLabel: '下班', tag: '下班', summary: '刚忙完，终于能看手机。', sourcePart: `work-${workTime.label}` };
  }
  const mealTime = parseScheduleTimeForKeyword(text, /(午饭|午餐|吃饭|午休)/);
  if (mealTime && isWithinMinutes(now, mealTime.hour, mealTime.minute, 25)) {
    return { eventType: 'meal', sceneLabel: '吃饭', tag: '吃饭', summary: '准备吃点东西，顺手来问一句。', sourcePart: `meal-${mealTime.label}` };
  }
  const timeContext = getActiveEventTimeContext(now, character);
  if (timeContext.slot === 'late_night' && /(失眠|睡不着|凌晨|深夜)/.test(text)) {
    return { eventType: 'late_night', sceneLabel: '深夜', tag: '深夜', summary: '有点睡不着，翻到手机就想发消息。', sourcePart: `late-${timeContext.slot}` };
  }
  if (timeContext.slot === 'early_morning' && /(早起|晨跑|早安|清晨)/.test(text)) {
    return { eventType: 'morning', sceneLabel: '早起', tag: '早起', summary: '醒得早，想先打个招呼。', sourcePart: `morning-${timeContext.slot}` };
  }
  return null;
}

function supportsTravelLife(character: Character) {
  return /(旅行|旅人|到处|跑外勤|巡演|采风|流浪|换城市|摄影师|出差|路上|车站|机场|海边)/.test(getCharacterProfileText(character));
}

function pickRandomLifeDraft(character: Character, now: number, variantSeed: number): RandomLifeDraft {
  const candidates: RandomLifeDraft[] = [
    { eventType: 'outing', sceneLabel: '出去走走', tag: '出去玩', summary: '出去转了一圈，路上突然想发消息。', sourcePart: 'outing' },
    { eventType: 'food', sceneLabel: '吃喝', tag: '吃饭', summary: '买了点喝的，想问问你那边怎么样。', sourcePart: 'food' },
    { eventType: 'work_break', sceneLabel: '间隙', tag: '间隙', summary: '刚从一段忙碌里空下来，看了一眼手机。', sourcePart: 'break' },
    { eventType: 'shopping', sceneLabel: '路过小店', tag: '购物', summary: '路过一家店，看到一个像你会喜欢的小东西。', sourcePart: 'shopping' },
    { eventType: 'emotion', sceneLabel: '想起你', tag: '情绪碎片', summary: '突然有点想你，所以来问一句。', sourcePart: 'emotion' },
  ];
  if (supportsTravelLife(character)) {
    candidates.splice(1, 0, { eventType: 'travel', sceneLabel: '地点报备', tag: '地点报备', summary: '到了新的地方，想把路上的一点风景告诉你。', sourcePart: 'travel' });
  }
  return candidates[Math.abs(variantSeed) % candidates.length];
}

function composeRandomProactiveContent(character: Character, draft: RandomLifeDraft, tone: RandomProactiveTone, variantSeed: number) {
  const namePrefix = tone === 'low' ? '' : '';
  const variants: Record<RandomProactiveEventType, string[]> = {
    class_dismissed: ['我刚下课，外面有点吵，突然想看看你在干嘛。', '下课了，刚摸到手机。你现在怎么样？', '刚从教室出来，脑子还有点乱，但想先问问你。'],
    work_done: ['刚忙完，终于能喘口气了。你今天还好吗？', '我这边刚结束，第一反应是想看看你在不在。', '收工了，手机一亮就想到你。'],
    meal: ['我准备吃饭了，你吃了吗？', '刚去找吃的，顺手来问问你。', '饭点到了，我有点饿，也有点想你。'],
    morning: ['早，我醒了。今天想先问问你。', '醒得有点早，先跟你说一声早。', '早上好，我刚起来，你呢？'],
    late_night: ['睡不着，刚翻了会儿手机。你那边安静了吗？', '我醒了一下，突然想问问你睡没睡。', '深夜有点安静，我就想起你了。'],
    outing: ['今天出去转了一圈，路上突然想起你。', '我刚在外面走了会儿，你现在在忙吗？', '出来透了口气，想把这点空闲分你一点。'],
    food: ['刚买了点喝的，你要是在就好了。', '我吃了点东西，忽然想问你有没有好好吃饭。', '路过一家小店，感觉你可能会喜欢。'],
    work_break: ['刚空下来，看了一眼手机就想找你。', '前面有点忙，现在终于能回神了。你怎么样？', '我这边刚停下来一会儿，想听你说两句。'],
    shopping: ['刚看到一个小东西，第一反应是你可能会喜欢。', '路过店门口停了一下，突然想起你。', '顺手买了点东西，想跟你报备一下。'],
    travel: ['我到了一个新的地方，路上的风有点不一样。想给你发一声。', '刚路过海边/车站这类地方，突然很想告诉你。', '在路上停了一会儿，想把这里的一点动静发给你。'],
    emotion: ['刚刚突然想起你，就来问一句。', '你现在在忙吗？我这边刚空下来。', '今天过得怎么样？我想听你说两句。'],
  };
  const pool = variants[draft.eventType];
  const picked = pool[Math.abs(variantSeed) % pool.length];
  if (tone === 'low') return picked.replace(/想你/g, '想到你').replace(/有没有想我/g, '今天还好吗');
  if (tone === 'high' && !/[？?]$/.test(picked)) return `${picked} 你呢？`;
  return `${namePrefix}${picked}`;
}
```

- [ ] **Step 3: Add the exported builder before `buildDueProactiveReminderWrites`**

```ts
export function buildRandomProactiveMessageWrites(
  context: ActiveEventContext,
  options: BuildRandomProactiveOptions,
): RandomProactiveMessageWrite[] {
  const now = options.now || Date.now();
  if (!options.enabled || !Number.isFinite(now) || context.characters.length === 0) return [];
  const dateKey = getDateKey(now);
  const slotKey = getSlotKey(now);
  const roll = options.probabilityRoll ?? Math.random();
  const maxWrites = options.maxWrites ?? 1;
  const writes: RandomProactiveMessageWrite[] = [];
  for (const character of context.characters) {
    if (writes.length >= maxWrites) break;
    const tone = classifyRandomProactiveTone(character);
    const dailyLimit = getDailyRandomProactiveLimit(tone);
    const todayEvents = context.lifeEvents.filter((event) =>
      event.characterId === character.id
      && event.tags?.includes('随机主动')
      && typeof event.createdAt === 'number'
      && getDateKey(event.createdAt) === dateKey,
    );
    if (todayEvents.length >= dailyLimit) continue;
    const latest = todayEvents.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (latest && now - latest.createdAt < getRandomProactiveCooldownMs(tone)) continue;
    const scheduleDraft = buildScheduleLifeDraft(character, now);
    const probability = tone === 'high' ? 0.26 : tone === 'low' ? 0.035 : 0.1;
    if (!scheduleDraft && roll > probability) continue;
    const variantSeed = options.variantSeed ?? Math.floor(now / 60000);
    const draft = scheduleDraft || pickRandomLifeDraft(character, now, variantSeed);
    const sourceId = `random-proactive-${character.id}-${dateKey}-${draft.sourcePart}-${slotKey}`;
    if (context.lifeEvents.some((event) => event.sourceId === sourceId)) continue;
    const content = composeRandomProactiveContent(character, draft, tone, variantSeed);
    writes.push({
      chatTarget: { characterId: character.id, channel: 'wechat' },
      chatMessage: {
        id: createId('msg'),
        role: 'model',
        content,
        timestamp: now,
        kind: 'text',
      },
      lifeEvent: {
        type: 'chat',
        app: 'wechat',
        characterId: character.id,
        title: `${character.name} 随机主动`,
        summary: `${draft.summary} 消息：${content}`,
        importance: 3,
        sourceId,
        readableByChar: true,
        tags: ['随机主动', draft.tag, draft.sceneLabel],
        createdAt: now,
      },
      appLog: {
        type: 'info',
        title: 'char随机主动已发送',
        detail: `character=${character.id}; tone=${tone}; event=${draft.eventType}; source_id=${sourceId}`,
      },
    });
  }
  return writes;
}
```

- [ ] **Step 4: Update the file header comment**

Change the export list to include the new builder:

```ts
 * Exports: active event suggestion types, buildTodayLifeRefreshSuggestions, buildActiveEventWrites, buildRandomProactiveMessageWrites.
```

- [ ] **Step 5: Run focused logic tests**

Run:

```powershell
npx tsx src/apps/active-events/activeEventsLogic.test.ts
```

Expected: PASS and prints `active event logic ok`.

- [ ] **Step 6: Commit logic and tests**

```powershell
git add -- src/apps/active-events/activeEventsLogic.ts src/apps/active-events/activeEventsLogic.test.ts
git commit -m "feat: add random proactive char logic"
```

---

### Task 3: Store Switch and Migration

**Files:**
- Modify: `src/store.ts`
- Modify: `src/apps/active-events/activeEventsStore.test.ts`

- [ ] **Step 1: Add failing store test**

Append before `console.log('active event store ok');`:

```ts
useAppStore.getState().setRandomProactiveMessagesEnabled(false);
assert.equal(useAppStore.getState().randomProactiveMessagesEnabled, false);

useAppStore.getState().setRandomProactiveMessagesEnabled(true);
assert.equal(useAppStore.getState().randomProactiveMessagesEnabled, true);
```

- [ ] **Step 2: Run store test and verify it fails**

Run:

```powershell
npx tsx src/apps/active-events/activeEventsStore.test.ts
```

Expected: FAIL because `setRandomProactiveMessagesEnabled` does not exist.

- [ ] **Step 3: Add state field and setter type**

In `AppState`, add near `activeReminderAutomationEnabled`:

```ts
  randomProactiveMessagesEnabled: boolean;
```

Add near `setActiveReminderAutomationEnabled`:

```ts
  setRandomProactiveMessagesEnabled: (enabled: boolean) => void;
```

- [ ] **Step 4: Add initial state and setter implementation**

In initial state near `activeReminderAutomationEnabled: true,` add:

```ts
      randomProactiveMessagesEnabled: false,
```

Near `setActiveReminderAutomationEnabled`, add:

```ts
      setRandomProactiveMessagesEnabled: (enabled) => set({ randomProactiveMessagesEnabled: Boolean(enabled) }),
```

- [ ] **Step 5: Update persist migration**

Change:

```ts
        version: 59,
```

to:

```ts
        version: 60,
```

In the migrated return object near `activeReminderAutomationEnabled`, add:

```ts
          randomProactiveMessagesEnabled: typeof state.randomProactiveMessagesEnabled === 'boolean' ? state.randomProactiveMessagesEnabled : false,
```

- [ ] **Step 6: Run store test**

Run:

```powershell
npx tsx src/apps/active-events/activeEventsStore.test.ts
```

Expected: PASS and prints `active event store ok`; Node may print existing Zustand storage unavailable warnings.

- [ ] **Step 7: Commit store switch**

```powershell
git add -- src/store.ts src/apps/active-events/activeEventsStore.test.ts
git commit -m "feat: add random proactive store switch"
```

---

### Task 4: UI Switch and App Automation Hook

**Files:**
- Modify: `src/apps/active-events/ActiveEventsScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the UI switch to `ActiveEventsScreen`**

Destructure these fields from `state`:

```ts
    randomProactiveMessagesEnabled,
    setRandomProactiveMessagesEnabled,
```

Add this button after the existing “主动提醒” button:

```tsx
        <button
          type="button"
          onClick={() => setRandomProactiveMessagesEnabled(!randomProactiveMessagesEnabled)}
          className={cn('fetch-button mt-3', randomProactiveMessagesEnabled ? 'bg-[#dceecd]' : 'bg-[#ffd6d6]')}
        >
          <Sparkles className="h-5 w-5" />
          {randomProactiveMessagesEnabled ? '随机主动已开启' : '随机主动已关闭'}
        </button>
        <p className="mt-2 text-xs font-black opacity-55">开启后，角色会按人设作息和轻量生活事件低频主动发微信；只在小手机运行期间生效。</p>
```

- [ ] **Step 2: Import the random builder in `App.tsx`**

Change:

```ts
import { buildDueProactiveReminderWrites } from './apps/active-events/activeEventsLogic';
```

to:

```ts
import { buildDueProactiveReminderWrites, buildRandomProactiveMessageWrites } from './apps/active-events/activeEventsLogic';
```

- [ ] **Step 3: Add the automation hook near `useProactiveReminderAutomation`**

```ts
function useRandomProactiveMessagesAutomation() {
  useEffect(() => {
    const tick = () => {
      const state = useAppStore.getState();
      const writes = buildRandomProactiveMessageWrites({
        characters: state.characters,
        chatSessions: state.chatSessions,
        diaries: state.diaries,
        calendarEvents: state.calendarEvents,
        galleryPhotos: state.galleryPhotos,
        memos: state.memos,
        wechatMoments: state.wechatMoments,
        musicTracks: state.musicTracks,
        musicListenRecords: state.musicListenRecords,
        xiaohongshuNotes: state.xiaohongshuNotes,
        lifeEvents: state.lifeEvents,
      }, {
        now: Date.now(),
        enabled: state.randomProactiveMessagesEnabled,
      });
      writes.forEach((write) => {
        state.addMessage(write.chatTarget.characterId, write.chatTarget.channel, write.chatMessage);
        state.addLifeEvent(write.lifeEvent);
        state.addAppLog?.(write.appLog);
      });
    };
    const timer = window.setInterval(tick, 2 * 60 * 1000);
    void window.setTimeout(tick, 10 * 1000);
    return () => window.clearInterval(timer);
  }, []);
}
```

- [ ] **Step 4: Call the hook from `App`**

After:

```ts
  useProactiveReminderAutomation();
```

add:

```ts
  useRandomProactiveMessagesAutomation();
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npx tsx src/apps/active-events/activeEventsLogic.test.ts
npx tsx src/apps/active-events/activeEventsStore.test.ts
```

Expected: both PASS.

- [ ] **Step 6: Commit UI and hook**

```powershell
git add -- src/apps/active-events/ActiveEventsScreen.tsx src/App.tsx
git commit -m "feat: wire random proactive char automation"
```

---

### Task 5: Documentation Sync

**Files:**
- Modify: `PROJECT_OUTLINE.md`
- Modify: `docs/life-system-framework.md`
- Modify: `docs/work-log.md`

- [ ] **Step 1: Update `PROJECT_OUTLINE.md` active-events references**

Update the `src/apps/active-events/` description to mention:

```md
`buildRandomProactiveMessageWrites` adds the optional random proactive layer: when enabled, it reads persona schedule hints, proactivity, existing life events, and lightweight life-event drafts to write low-frequency WeChat private messages with sourceId dedupe.
```

Update the store version sentence from `59` to `60` and include `randomProactiveMessagesEnabled`.

- [ ] **Step 2: Update `docs/life-system-framework.md` active-event layer**

Append a dated note under the active-event section:

```md
2026-06-22 主动事件新增“随机主动”本地开关。开启后，小手机运行期间会低频读取角色人设作息、主动程度和轻量生活事件草稿，向微信私聊写入自然主动消息，并同步写入 `lifeEvents`。地点报备只在人设支持旅行、跑外勤、巡演、采风、流浪或频繁换地点时生成；普通固定生活角色不会凭空跨城跨国。第一版不后台常驻、不弹锁屏通知、不自动生图。
```

- [ ] **Step 3: Append `docs/work-log.md` entry**

Add:

```md
## 2026-06-22 char 主动随机作息消息

- 范围：只改 `char主动` 随机主动消息、主动事件纯逻辑、store 开关、顶层本地定时 hook 和相关文档；不改群聊、锁屏通知、NAI 生图、电话或后端常驻推送。
- 原因：用户希望打开随机主动后，角色能按人设作息和主动程度偶尔主动发微信，例如 3 点下课后发消息；同时允许符合人设的旅行/地点报备和轻量生活事件刷新，不使用固定模板。
- 内容：新增 `buildRandomProactiveMessageWrites`，识别人设主动程度、下课/下班/吃饭/早起/深夜等作息，生成轻量生活事件草稿与多样化微信短句；新增 `randomProactiveMessagesEnabled` 持久化开关和 `char主动` 页面按钮；`App` 顶层在小手机运行期间低频检查并写入微信消息、`lifeEvents` 和日志。
- 文档：同步更新 `PROJECT_OUTLINE.md` 和 `docs/life-system-framework.md`。
- 验证：`npx tsx src/apps/active-events/activeEventsLogic.test.ts` 通过；`npx tsx src/apps/active-events/activeEventsStore.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过。
```

- [ ] **Step 4: Commit docs**

```powershell
git add -- PROJECT_OUTLINE.md docs/life-system-framework.md docs/work-log.md
git commit -m "docs: document random proactive char messages"
```

---

### Task 6: Full Verification

**Files:**
- Verify repository state and compiled output.

- [ ] **Step 1: Run focused tests**

```powershell
npx tsx src/apps/active-events/activeEventsLogic.test.ts
npx tsx src/apps/active-events/activeEventsStore.test.ts
```

Expected: both PASS.

- [ ] **Step 2: Run TypeScript lint**

```powershell
npm run lint
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: exit 0. Existing Vite chunk-size warnings are acceptable.

- [ ] **Step 4: Check randomUUID policy**

```powershell
rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts
```

Expected: no matches.

- [ ] **Step 5: Browser smoke test**

Start dev server if needed:

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/` at a mobile viewport. Verify:

- Unlock works.
- Desktop second page shows `char主动`.
- `char主动` page shows “随机主动已开启/关闭”.
- Toggling the switch changes the label.
- Existing “刷新主动事件” and “主动提醒” controls still render.

- [ ] **Step 6: Final status**

Record the verification results in the final response. If any command fails, report the exact failing command and stop before claiming completion.
