import assert from 'node:assert/strict';

import {
  ACTIVE_EVENT_REFRESH_COOLDOWN_MS,
  buildActiveEventWrites,
  buildDueProactiveReminderWrites,
  buildRandomProactiveMessageWrites,
  buildTodayLifeRefreshSuggestions,
  parseDailyWechatReminderRequest,
  type ActiveEventContext,
} from './activeEventsLogic';

const now = new Date('2026-05-10T12:00:00+08:00').getTime();
const character = {
  id: 'char-1',
  name: '林雾',
  avatar: '',
  description: '喜欢把日常细节记下来。',
  personality: '温柔、敏锐',
  firstMessage: '',
  systemPrompt: '',
};

const baseContext: ActiveEventContext = {
  characters: [character],
  chatSessions: {
    'wechat:char-1': {
      id: 'session-1',
      characterId: 'char-1',
      channel: 'wechat',
      lastUpdated: now - 10 * 60 * 1000,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: '今天下班想去江边走一走，顺便买热可可。',
          kind: 'text',
          timestamp: now - 20 * 60 * 1000,
        },
      ],
    },
  },
  diaries: [
    {
      id: 'diary-1',
      owner: 'user',
      title: '午后的计划',
      content: '想去江边散步，晚上早点休息。',
      tags: ['生活'],
      createdAt: now - 60 * 60 * 1000,
      updatedAt: now - 60 * 60 * 1000,
    },
  ],
  calendarEvents: [
    {
      id: 'calendar-1',
      owner: 'shared',
      characterId: 'char-1',
      title: '傍晚散步',
      note: '江边见面。',
      startAt: now + 5 * 60 * 60 * 1000,
      tags: ['约定'],
      createdAt: now - 2 * 60 * 60 * 1000,
      updatedAt: now - 2 * 60 * 60 * 1000,
    },
  ],
  galleryPhotos: [
    {
      id: 'photo-1',
      url: 'photo://river',
      title: '江边照片',
      description: '今天拍到的云和水面。',
      album: '生活',
      tags: ['日常'],
      readableByChar: true,
      createdAt: now - 30 * 60 * 1000,
      updatedAt: now - 30 * 60 * 1000,
    },
  ],
  memos: [],
  wechatMoments: ['今天想喝热可可。'],
  musicTracks: [
    {
      id: 'track-1',
      title: 'River Light',
      artist: '小手机曲库',
      tags: ['散步'],
      liked: true,
      playCount: 2,
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      updatedAt: now - 10 * 24 * 60 * 60 * 1000,
    },
  ],
  musicListenRecords: [],
  xiaohongshuNotes: [],
  lifeEvents: [],
};

const refresh = buildTodayLifeRefreshSuggestions(baseContext, { now, lastRefreshAt: now - ACTIVE_EVENT_REFRESH_COOLDOWN_MS - 1 });
assert.equal(refresh.canRefresh, true);
assert.ok(refresh.suggestions.length > 0, 'manual refresh should produce suggestions from real same-day data');
assert.ok(refresh.suggestions.length <= 3, 'manual refresh should stay low-volume');
assert.ok(refresh.suggestions.every((suggestion) => suggestion.reason && suggestion.preview && suggestion.sourceIds.length > 0));
assert.ok(refresh.suggestions.some((suggestion) => suggestion.action === 'send_message'));
assert.ok(refresh.suggestions.some((suggestion) => suggestion.action === 'send_image'));
assert.ok(refresh.suggestions.some((suggestion) => suggestion.action === 'recommend_music'));

const cooledDown = buildTodayLifeRefreshSuggestions(baseContext, { now, lastRefreshAt: now - 30 * 60 * 1000 });
assert.equal(cooledDown.canRefresh, false);
assert.equal(cooledDown.suggestions.length, 0);
assert.ok(cooledDown.cooldownRemainingMs > 0);

const empty = buildTodayLifeRefreshSuggestions({ ...baseContext, chatSessions: {}, diaries: [], calendarEvents: [], galleryPhotos: [], wechatMoments: [], musicTracks: [] }, { now });
assert.equal(empty.canRefresh, true);
assert.equal(empty.suggestions.length, 0, 'refresh should not invent suggestions without source data');

const messageSuggestion = refresh.suggestions.find((suggestion) => suggestion.action === 'send_message');
assert.ok(messageSuggestion);
const messageWrites = buildActiveEventWrites(messageSuggestion, { now });
assert.equal(messageWrites.chatMessage?.role, 'model');
assert.equal(messageWrites.chatTarget?.channel, 'wechat');
assert.equal(messageWrites.lifeEvent.app, 'wechat');
assert.equal(messageWrites.lifeEvent.sourceId, messageSuggestion.id);
assert.ok(!messageWrites.diaryEntry, 'previewing a message suggestion should only prepare writes for confirmation');

const musicSuggestion = refresh.suggestions.find((suggestion) => suggestion.action === 'recommend_music');
assert.ok(musicSuggestion);
const musicWrites = buildActiveEventWrites(musicSuggestion, { now });
assert.equal(musicWrites.musicListenRecord?.trackId, 'track-1');
assert.equal(musicWrites.lifeEvent.app, 'music');

const imageSuggestion = refresh.suggestions.find((suggestion) => suggestion.action === 'send_image');
assert.ok(imageSuggestion);
assert.ok(imageSuggestion.payload.imagePrompt);
assert.doesNotMatch(imageSuggestion.payload.imagePrompt, /shared by/i);
const imageWrites = buildActiveEventWrites(imageSuggestion, { now });
assert.equal(imageWrites.chatTarget?.characterId, 'char-1');
assert.equal(imageWrites.imagePrompt, imageSuggestion.payload.imagePrompt);
assert.equal(imageWrites.lifeEvent.app, 'wechat');

const morningCharacter = {
  ...character,
  id: 'char-morning',
  name: '晨间角色',
  description: '习惯早上六点给对方发早安，会按自己的作息主动问候。',
  personality: '温柔，自律',
  systemPrompt: '每天 6:00 左右会想起对方。',
};
const morningContext: ActiveEventContext = {
  ...baseContext,
  characters: [morningCharacter],
  chatSessions: {},
  diaries: [],
  calendarEvents: [],
  galleryPhotos: [],
  wechatMoments: [],
  musicTracks: [],
  lifeEvents: [],
};
const sixAm = new Date('2026-05-10T06:05:00+08:00').getTime();
const morningRefresh = buildTodayLifeRefreshSuggestions(morningContext, { now: sixAm, cooldownMs: 0, maxSuggestions: 3 });
const morningMessage = morningRefresh.suggestions.find((suggestion) => suggestion.action === 'send_message');
assert.ok(morningMessage, 'character schedule should create a morning proactive message');
assert.equal(morningMessage.characterId, 'char-morning');
assert.match(morningMessage.payload.content || '', /现在是早上 06:05/);
assert.match(morningMessage.payload.content || '', /早安/);

const noonCharacter = {
  ...character,
  id: 'char-noon',
  name: '午间角色',
  description: '喜欢中午十二点发消息提醒吃饭。',
  personality: '会照顾人',
  systemPrompt: '12:00 左右会主动发一句午饭提醒。',
};
const noonContext: ActiveEventContext = {
  ...morningContext,
  characters: [noonCharacter],
};
const noon = new Date('2026-05-10T12:02:00+08:00').getTime();
const noonRefresh = buildTodayLifeRefreshSuggestions(noonContext, { now: noon, cooldownMs: 0, maxSuggestions: 3 });
const noonMessage = noonRefresh.suggestions.find((suggestion) => suggestion.action === 'send_message');
assert.ok(noonMessage, 'character schedule should create a noon proactive message');
assert.equal(noonMessage.characterId, 'char-noon');
assert.match(noonMessage.payload.content || '', /现在是中午 12:02/);
assert.match(noonMessage.payload.content || '', /吃饭|午饭/);

const offSlotRefresh = buildTodayLifeRefreshSuggestions(morningContext, { now: noon, cooldownMs: 0, maxSuggestions: 3 });
assert.ok(!offSlotRefresh.suggestions.some((suggestion) => suggestion.characterId === 'char-morning' && suggestion.action === 'send_message'), 'morning-only character should not send at noon');

const americaCharacter = {
  ...character,
  id: 'char-america',
  name: '纽约角色',
  description: '住在美国纽约，习惯早上六点给对方发早安。',
  personality: '温柔自律',
  systemPrompt: '当地时间 6:00 左右会想起对方。',
};
const americaContext: ActiveEventContext = {
  ...morningContext,
  characters: [americaCharacter],
};
const beijingMorning = new Date('2026-05-10T06:05:00+08:00').getTime();
const americaOffSlot = buildTodayLifeRefreshSuggestions(americaContext, { now: beijingMorning, cooldownMs: 0, maxSuggestions: 3 });
assert.ok(!americaOffSlot.suggestions.some((suggestion) => suggestion.characterId === 'char-america' && suggestion.action === 'send_message'), 'US character should not send morning message just because Beijing is morning');

const newYorkMorning = new Date('2026-05-10T18:05:00+08:00').getTime();
const americaRefresh = buildTodayLifeRefreshSuggestions(americaContext, { now: newYorkMorning, cooldownMs: 0, maxSuggestions: 3 });
const americaMessage = americaRefresh.suggestions.find((suggestion) => suggestion.action === 'send_message');
assert.ok(americaMessage, 'US character should use local New York morning time');
assert.match(americaMessage.payload.content || '', /纽约时间早上 06:05/);

const reminderParsed = parseDailyWechatReminderRequest('以后每天晚上8点半记得提醒我喝水', {
  now,
  characterId: 'char-1',
  sourceMessageId: 'msg-reminder-1',
});
assert.ok(reminderParsed, 'daily reminder should be parsed from a user chat message');
assert.equal(reminderParsed.calendarEvent.repeat, 'daily');
assert.equal(reminderParsed.calendarEvent.owner, 'user');
assert.equal(reminderParsed.calendarEvent.characterId, 'char-1');
assert.equal(reminderParsed.calendarEvent.source, 'wechat');
assert.deepEqual(reminderParsed.calendarEvent.relatedMessageIds, ['msg-reminder-1']);
assert.ok(reminderParsed.calendarEvent.tags.includes('主动提醒'));
assert.ok(reminderParsed.calendarEvent.tags.includes('长期记忆'));
assert.match(reminderParsed.calendarEvent.title, /喝水/);
assert.match(reminderParsed.lifeEvent.summary, /每天 20:30/);

const dueReminder = buildDueProactiveReminderWrites({
  calendarEvents: [{
    ...reminderParsed.calendarEvent,
    id: 'calendar-reminder-1',
    createdAt: now,
    updatedAt: now,
  }],
  lifeEvents: [],
  characters: [character],
  now: new Date('2026-05-10T20:31:00+08:00').getTime(),
  enabled: true,
});
assert.equal(dueReminder.length, 1, 'enabled reminder automation should actively create due reminder messages');
assert.equal(dueReminder[0].chatTarget.channel, 'wechat');
assert.equal(dueReminder[0].chatTarget.characterId, 'char-1');
assert.equal(dueReminder[0].chatMessage.kind, 'text');
assert.match(dueReminder[0].chatMessage.content, /现在是晚上 20:31/);
assert.match(dueReminder[0].chatMessage.content, /喝水/);
assert.match(dueReminder[0].lifeEvent.sourceId || '', /calendar-reminder-1/);

const alreadySent = buildDueProactiveReminderWrites({
  calendarEvents: [{
    ...reminderParsed.calendarEvent,
    id: 'calendar-reminder-1',
    createdAt: now,
    updatedAt: now,
  }],
  lifeEvents: [{ ...dueReminder[0].lifeEvent, id: 'life-sent', createdAt: dueReminder[0].lifeEvent.createdAt || now, importance: 4 }],
  characters: [character],
  now: new Date('2026-05-10T20:35:00+08:00').getTime(),
  enabled: true,
});
assert.equal(alreadySent.length, 0, 'same reminder occurrence should not be sent twice');

const disabledReminder = buildDueProactiveReminderWrites({
  calendarEvents: [{
    ...reminderParsed.calendarEvent,
    id: 'calendar-reminder-1',
    createdAt: now,
    updatedAt: now,
  }],
  lifeEvents: [],
  characters: [character],
  now: new Date('2026-05-10T20:31:00+08:00').getTime(),
  enabled: false,
});
assert.equal(disabledReminder.length, 0, 'disabled reminder automation should not send messages');

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
  variantSeed: 5,
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

const manualRandomTest = buildRandomProactiveMessageWrites({
  ...randomContext,
  characters: [{
    ...ordinaryStudent,
    id: 'char-manual-test',
    personality: '不主动、慢热、沉默、忙',
  }],
  lifeEvents: [{
    id: 'life-manual-test-earlier',
    type: 'chat',
    app: 'wechat',
    characterId: 'char-manual-test',
    title: '随机主动',
    summary: 'earlier',
    importance: 3,
    sourceId: 'random-proactive-char-manual-test-2026-06-22-random-emotion-afternoon',
    readableByChar: true,
    tags: ['随机主动'],
    createdAt: new Date('2026-06-22T12:00:00+08:00').getTime(),
  }],
}, {
  now: new Date('2026-06-22T17:20:00+08:00').getTime(),
  enabled: true,
  probabilityRoll: 1,
  variantSeed: 6,
  triggerMode: 'manual_test',
});
assert.equal(manualRandomTest.length, 1, 'manual random proactive test should bypass automatic pacing');
assert.match(manualRandomTest[0].lifeEvent.sourceId || '', /random-proactive-test-char-manual-test/);
assert.ok(manualRandomTest[0].appLog.detail.includes('mode=manual_test'));

console.log('active event logic ok');
