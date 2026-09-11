import assert from 'node:assert/strict';

import {
  cancelPaidTask,
  getPaidTaskSnapshot,
  PaidTaskBusyError,
  resetPaidTaskManagerForTests,
  runPaidTask,
} from './paidTaskManager';

resetPaidTaskManagerForTests();

let finishImage!: () => void;
const firstImage = runPaidTask({
  kind: 'image-generation',
  key: 'gallery:one',
  run: () => new Promise<void>((resolve) => { finishImage = resolve; }),
});
assert.equal(getPaidTaskSnapshot()['image-generation']?.key, 'gallery:one');

await assert.rejects(
  runPaidTask({ kind: 'image-generation', key: 'chat:two', run: async () => undefined }),
  PaidTaskBusyError,
);

const ttsResult = await runPaidTask({ kind: 'tts-synthesis', key: 'tts:one', run: async () => 'ok' });
assert.equal(ttsResult, 'ok', 'different paid task kinds may run in parallel');

finishImage();
await firstImage;
assert.equal(getPaidTaskSnapshot()['image-generation'], undefined);

let aborted = false;
const cancellable = runPaidTask({
  kind: 'music-generation',
  key: 'music:one',
  run: (signal) => new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => { aborted = true; resolve(); }, { once: true });
  }),
});
assert.equal(cancelPaidTask('music-generation'), true);
await cancellable;
assert.equal(aborted, true);

console.log('paid task manager ok');
