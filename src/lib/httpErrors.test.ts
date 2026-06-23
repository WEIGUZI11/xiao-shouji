import assert from 'node:assert/strict';
import { buildHttpErrorMessage } from './httpErrors';

assert.equal(
  buildHttpErrorMessage('AI 接口失败', { status: 400, statusText: 'Bad Request' }),
  'HTTP 400 Bad Request - AI 接口失败',
);

assert.equal(
  buildHttpErrorMessage('NAI 请求失败', { status: 500, statusText: '', detail: 'upstream broke' }),
  'HTTP 500 - NAI 请求失败 - upstream broke',
);

assert.equal(
  buildHttpErrorMessage('电话 AI 失败', { status: 429, statusText: 'Too Many Requests', detail: 'quota exceeded' }),
  'HTTP 429 Too Many Requests - 电话 AI 失败 - quota exceeded',
);

console.log('httpErrors tests passed');
