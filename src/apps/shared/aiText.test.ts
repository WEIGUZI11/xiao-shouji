import assert from 'node:assert/strict';
import {
  describeChatMessage,
  extractAssistantContent,
  getChatCompletionEndpoint,
  getModelListEndpoint,
  prepareChatCompletionMessages,
  requestChatCompletion,
  stringifyForPrompt,
} from './aiText';
import { useAppStore } from '../../store';
import { getTheaterMaxTokens, buildTheaterUserPrompt, buildTheaterContinuationPrompt, appendTheaterContinuation } from '../theater/theaterLogic';

const fixedNow = new Date('2026-07-05T17:45:00+08:00');
const fixedShanghaiPrompt = '当前用户所在地时间：2026年7月5日 17:45（星期日，下午，时区 Asia/Shanghai，UTC+08:00）。';

assert.deepEqual(
  prepareChatCompletionMessages([
    { role: 'system', content: 'Rules stay here.' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' },
  ], { now: fixedNow, promptRoleMode: 'user', timeZone: 'Asia/Shanghai' }),
  [
    { role: 'user', content: `${fixedShanghaiPrompt}\n\nSystem settings:\nRules stay here.` },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' },
  ],
);

assert.deepEqual(
  prepareChatCompletionMessages([
    { role: 'system', content: 'Rules stay here.' },
    { role: 'user', content: 'Hello' },
  ], { now: fixedNow, promptRoleMode: 'system', timeZone: 'Asia/Shanghai' }),
  [
    { role: 'system', content: `${fixedShanghaiPrompt}\n\nRules stay here.` },
    { role: 'user', content: 'Hello' },
  ],
);

assert.deepEqual(
  prepareChatCompletionMessages([
    { role: 'system', content: 'Rules stay here.' },
    { role: 'user', content: 'Hello' },
  ], { now: fixedNow, promptRoleMode: 'default', timeZone: 'Asia/Shanghai' }),
  [
    { role: 'system', content: `${fixedShanghaiPrompt}\n\nRules stay here.` },
    { role: 'user', content: 'Hello' },
  ],
);

assert.deepEqual(
  prepareChatCompletionMessages([
    { role: 'user', content: 'Only user prompt.' },
  ], { now: fixedNow, promptRoleMode: 'user', timeZone: 'Asia/Shanghai' }),
  [
    { role: 'user', content: fixedShanghaiPrompt },
    { role: 'user', content: 'Only user prompt.' },
  ],
);

assert.match(
  prepareChatCompletionMessages([
    { role: 'user', content: 'Where am I in the day?' },
  ], { now: fixedNow, promptRoleMode: 'user', timeZone: 'America/New_York' })[0].content,
  /当前用户所在地时间：2026年7月5日 05:45（星期日，清晨，时区 America\/New_York，UTC-04:00）/,
);

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});

const originalFetch = globalThis.fetch;
let capturedBody = '';
let capturedUrl = '';
globalThis.fetch = (async (input, init) => {
  capturedUrl = String(input);
  capturedBody = String(init?.body || '');
  return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

try {
  useAppStore.getState().setModelConfig({ chatPromptRoleMode: 'default' });
  const completion = await requestChatCompletion({
    baseUrl: 'https://ai.example.test',
    apiKey: 'test-key',
    model: 'dv4-compatible',
    messages: [
      { role: 'system', content: 'Always stay in character.' },
      { role: 'user', content: 'Say hi.' },
    ],
    temperature: 0.7,
    maxTokens: 32,
  });
  const body = JSON.parse(capturedBody);
  assert.equal(completion, 'ok');
  assert.equal(capturedUrl, 'https://ai.example.test/v1/chat/completions');
  assert.deepEqual(body.messages, [
    { role: 'system', content: body.messages[0].content },
    { role: 'user', content: 'Say hi.' },
  ]);
  assert.match(body.messages[0].content, /当前用户所在地时间：\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/);
  assert.match(body.messages[0].content, /时区 .+，UTC[+-]\d{2}:\d{2}/);
  assert.doesNotMatch(body.messages[0].content, /请按这个用户所在地时间判断早晚、作息和问候，不要混用其他时区。/);
  assert.doesNotMatch(body.messages[0].content, /System settings:/);
  assert.match(body.messages[0].content, /Always stay in character\./);
  assert.equal(body.messages[0].role, 'system');
} finally {
  globalThis.fetch = originalFetch;
}

globalThis.fetch = (async () => new Response(JSON.stringify({
  choices: [{ message: { content: '四千 Token 下仍然没有说完的正文' }, finish_reason: 'length' }],
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})) as typeof fetch;
try {
  const maxLimited = await requestChatCompletion({
    baseUrl: 'https://max-length.example.test/v1',
    apiKey: '',
    model: 'length-model',
    messages: [{ role: 'user', content: '请完整回答' }],
    temperature: 0.7,
    maxTokens: 4000,
  });
  assert.match(maxLimited, /当前最大输出长度 4000 Token/);
  assert.doesNotMatch(maxLimited, /调高“最大回复长度”/);
} finally {
  globalThis.fetch = originalFetch;
}

globalThis.fetch = (async () => new Response(JSON.stringify({
  choices: [{ message: { content: '还没有说完的正文' }, finish_reason: 'length' }],
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})) as typeof fetch;
try {
  const limited = await requestChatCompletion({
    baseUrl: 'https://length.example.test/v1',
    apiKey: '',
    model: 'length-model',
    messages: [{ role: 'user', content: '请完整回答' }],
    temperature: 0.7,
    maxTokens: 120,
  });
  assert.match(limited, /还没有说完的正文/);
  assert.match(limited, /达到长度上限/);
} finally {
  globalThis.fetch = originalFetch;
}

globalThis.fetch = (async () => new Response(JSON.stringify({
  choices: [{ message: { content: '', reasoning_content: '这是模型内部推理，不能显示' }, finish_reason: 'stop' }],
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})) as typeof fetch;
try {
  await assert.rejects(
    requestChatCompletion({
      baseUrl: 'https://empty.example.test/v1',
      apiKey: '',
      model: 'empty-model',
      messages: [{ role: 'user', content: '你好' }],
      temperature: 0.7,
      maxTokens: 120,
    }),
    /没有可显示的正文/,
  );
} finally {
  globalThis.fetch = originalFetch;
}

const dataUrl = `data:image/png;base64,${'A'.repeat(2000)}`;
const describedImage = describeChatMessage({
  kind: 'image',
  content: dataUrl,
  stickerLabel: '窗边热茶',
});

assert.equal(describedImage, '[图片] 窗边热茶');
assert.doesNotMatch(describedImage, /data:image|base64|AAAA/);

const describedUnlabeledImage = describeChatMessage({
  kind: 'image',
  content: dataUrl,
});

assert.equal(describedUnlabeledImage, '[图片]');
assert.equal(stringifyForPrompt('x'.repeat(6100)).endsWith('\n...'), true);

assert.equal(
  extractAssistantContent({ message: { content: '', reasoning_content: '收到' } }),
  '',
);

assert.equal(
  extractAssistantContent({ delta: { content: '', reasoning_content: '流式收到' } }),
  '',
);

assert.equal(
  extractAssistantContent({ message: { content: [{ type: 'text', text: '第一段' }, { type: 'text', text: '第二段' }] } }),
  '第一段第二段',
);

assert.equal(
  getChatCompletionEndpoint('https://generativelanguage.googleapis.com/v1beta/openai/'),
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
);
assert.equal(
  getChatCompletionEndpoint('https://relay.example.test/v1/chat/completions'),
  'https://relay.example.test/v1/chat/completions',
);
assert.equal(
  getModelListEndpoint('https://generativelanguage.googleapis.com/v1beta/openai/'),
  'https://generativelanguage.googleapis.com/v1beta/openai/models',
);

console.log('aiText tests passed');

// Exercise the actual serialized request, not just the displayed length label.
const theaterRequests: Array<Record<string, any>> = [];
globalThis.fetch = (async (_input, init) => {
  theaterRequests.push(JSON.parse(String(init?.body)));
  return new Response(JSON.stringify({ choices: [{ message: { content: '未写完的'.repeat(100) }, finish_reason: 'length' }] }), { status: 200 });
}) as typeof fetch;
try {
  let previousContent = '';
  for (const wordCount of ['400', '1200', '4000']) {
    let finish: { finishReason: string; truncated: boolean } | undefined;
    const input = { theme: '测试主题', length: 'custom' as const, customLengthText: wordCount, actorNames: ['测试角色'], rollResult: '' };
    const prompt = previousContent ? buildTheaterContinuationPrompt({ ...input, previousContent }) : buildTheaterUserPrompt(input);
    const result = await requestChatCompletion({
      baseUrl: 'https://theater.example.test/v1', apiKey: '', model: 'mock-only', temperature: 0.7,
      maxTokens: getTheaterMaxTokens('custom', wordCount), messages: [{ role: 'user', content: prompt }],
      includeLengthNotice: false, onFinish: (value) => { finish = value; },
    });
    assert.deepEqual(finish, { finishReason: 'length', truncated: true });
    assert.equal(result, '未写完的'.repeat(100), 'length notice must not pollute the saved story');
    const sent = theaterRequests.at(-1)!;
    assert.equal(sent.max_tokens, Number(wordCount) * 2.5 + 1024);
    assert.match(JSON.stringify(sent.messages), new RegExp(`约 ${wordCount} 字`));
    if (previousContent) assert.ok(sent.messages.some((message: any) => message.content.includes(previousContent)));
    previousContent = appendTheaterContinuation(previousContent, result);
  }
  assert.equal(previousContent.length, 1200, 'two continuations append, never replace the original 400 characters');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('theater actual request: 400/1200/4000 word targets and repeated length-limit continuations passed');
