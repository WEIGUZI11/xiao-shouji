import assert from 'node:assert/strict';

import { createImageGenerationTaskId, hashImageTaskPrompt, normalizeImageGenerationTasks } from './imageGenerationTasks';

assert.equal(createImageGenerationTaskId(1000, 0.5), 'image-task-rs-i');
assert.equal(hashImageTaskPrompt('same'), hashImageTaskPrompt('same'));
assert.notEqual(hashImageTaskPrompt('same'), hashImageTaskPrompt('different'));

const tasks = normalizeImageGenerationTasks([
  {
    id: 'running', status: 'running', source: 'gallery', triggerType: 'manual', provider: 'novelai', model: 'nai',
    width: 512, height: 512, prompt: 'test', promptHash: '1', createdAt: 100, startedAt: 200,
  },
  {
    id: 'done', status: 'success', source: 'gallery', triggerType: 'manual', provider: 'novelai', model: 'nai',
    width: 512, height: 512, prompt: 'test', promptHash: '1', createdAt: 100, completedAt: 300,
  },
], 500);

assert.equal(tasks[0].status, 'interrupted');
assert.equal(tasks[0].completedAt, 500);
assert.equal(tasks[0].durationMs, 300);
assert.equal(tasks[1].status, 'success');

console.log('image generation task helpers ok');
