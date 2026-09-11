import assert from 'node:assert/strict';

import {
  enqueueTtsPlayback,
  getTtsQueueSnapshot,
  resetTtsQueueForTests,
  stopAllTtsQueue,
  TtsQueueDuplicateError,
} from './ttsQueue';

resetTtsQueueForTests();
const order: string[] = [];
let finishFirst!: () => void;
const first = enqueueTtsPlayback({
  id: 'one', dedupeKey: 'same', text: 'one', source: 'test', provider: 'mock',
  run: async (_signal, setStatus) => {
    order.push('one:start');
    setStatus('playing');
    await new Promise<void>((resolve) => { finishFirst = resolve; });
    order.push('one:end');
  },
});
const second = enqueueTtsPlayback({
  id: 'two', dedupeKey: 'two', text: 'two', source: 'test', provider: 'mock',
  run: async () => { order.push('two'); },
});
await assert.rejects(
  enqueueTtsPlayback({ id: 'duplicate', dedupeKey: 'same', text: 'same', source: 'test', provider: 'mock', run: async () => undefined }),
  TtsQueueDuplicateError,
);
assert.equal(getTtsQueueSnapshot().waiting.length, 1);
finishFirst();
await Promise.all([first, second]);
assert.deepEqual(order, ['one:start', 'one:end', 'two']);

let aborted = false;
const stopped = enqueueTtsPlayback({
  id: 'stop', dedupeKey: 'stop', text: 'stop', source: 'test', provider: 'mock',
  run: (signal) => new Promise<void>((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true });
  }),
});
stopAllTtsQueue();
await assert.rejects(stopped);
assert.equal(aborted, true);
assert.equal(getTtsQueueSnapshot().current, null);

console.log('tts queue core ok');
