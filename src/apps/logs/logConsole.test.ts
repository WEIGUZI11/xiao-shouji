import assert from 'node:assert/strict';

import {
  buildLogCopyText,
  filterConsoleLogs,
  getConsoleLogMeta,
  getLogDiagnostics,
  getLogDetailExcerpt,
} from './logConsole';
import type { AppLogEntry } from '../../store';

const logs: AppLogEntry[] = [
  {
    id: '1',
    type: 'error',
    title: '微信聊天 API 失败',
    detail: 'POST /v1/chat/completions\nHTTP 429 Too Many Requests\n{"error":"rate limit"}',
    createdAt: new Date('2026-06-21T12:00:00+08:00').getTime(),
  },
  {
    id: '2',
    type: 'image',
    title: 'NAI 生图成功',
    detail: 'prompt_hash=abc123; image_id=img1',
    createdAt: new Date('2026-06-21T12:01:00+08:00').getTime(),
  },
  {
    id: '3',
    type: 'ai',
    title: 'AI 返回内容',
    detail: '你好，我在。',
    createdAt: new Date('2026-06-21T12:02:00+08:00').getTime(),
  },
];

assert.deepEqual(getConsoleLogMeta(logs[0]), {
  level: 'ERROR',
  source: '微信',
  tone: 'danger',
});
assert.deepEqual(getConsoleLogMeta(logs[1]), {
  level: 'IMAGE',
  source: 'NAI',
  tone: 'image',
});

assert.equal(filterConsoleLogs(logs, { level: 'error', query: '' }).length, 1);
assert.equal(filterConsoleLogs(logs, { level: 'all', query: 'rate limit' })[0].id, '1');
assert.equal(filterConsoleLogs(logs, { level: 'generation', query: '' })[0].id, '2');

assert.equal(getLogDetailExcerpt(logs[0].detail, 26), 'POST /v1/chat/completions...');
assert.equal(getLogDetailExcerpt('', 20), '无详情');

const copyText = buildLogCopyText(logs[0]);
assert.match(copyText, /\[ERROR\]\[微信\]/);
assert.match(copyText, /HTTP 429 Too Many Requests/);

const diagnostics = getLogDiagnostics({
  detail: [
    'http://upstream.test/v1/chat/completions',
    'HTTP 400 Bad Request - AI failed',
    JSON.stringify({ model: 'test-model', messages: [{ role: 'user', content: 'hello' }] }),
  ].join('\n'),
});
assert.deepEqual(diagnostics.slice(0, 3), [
  { label: 'HTTP', value: '400 Bad Request' },
  { label: 'Endpoint', value: 'http://upstream.test/v1/chat/completions' },
  { label: 'Model', value: 'test-model' },
]);
assert.ok(diagnostics.some((item) => item.label === 'Size' && item.value.endsWith(' chars')));

console.log('logConsole tests passed');
