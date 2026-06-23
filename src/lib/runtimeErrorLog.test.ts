import assert from 'node:assert/strict';

import { buildRuntimeErrorLog, serializeRuntimeError } from './runtimeErrorLog';

const error = new Error('界面崩了');
error.stack = 'Error: 界面崩了\n    at App.tsx:10:2';

assert.match(serializeRuntimeError(error), /界面崩了/);
assert.match(serializeRuntimeError(error), /App\.tsx:10:2/);
assert.equal(serializeRuntimeError('plain failure'), 'plain failure');
assert.match(serializeRuntimeError({ reason: 'bad upstream' }), /bad upstream/);

const boundaryLog = buildRuntimeErrorLog({
  title: '小手机界面崩溃',
  error,
  componentStack: 'at ChatScreen',
});

assert.equal(boundaryLog.type, 'error');
assert.equal(boundaryLog.title, '小手机界面崩溃');
assert.match(boundaryLog.detail || '', /componentStack/);
assert.match(boundaryLog.detail || '', /ChatScreen/);

const promiseLog = buildRuntimeErrorLog({
  title: '未处理 Promise 错误',
  error: new Error('HTTP 400 Bad Request - upstream broke'),
});
assert.match(promiseLog.detail || '', /HTTP 400 Bad Request/);

console.log('runtimeErrorLog tests passed');
