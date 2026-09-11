import assert from 'node:assert/strict';

import { assertImageGenerationAllowed, ImageGenerationDisabledError } from './appImageGeneration';

assert.throws(
  () => assertImageGenerationAllowed({ imageGenerationEnabled: false, proactiveImageGenerationEnabled: true, triggerType: 'manual' }),
  ImageGenerationDisabledError,
);
assert.throws(
  () => assertImageGenerationAllowed({ imageGenerationEnabled: true, proactiveImageGenerationEnabled: false, triggerType: 'proactive' }),
  /主动生图已关闭/,
);
assert.doesNotThrow(() => assertImageGenerationAllowed({ imageGenerationEnabled: true, proactiveImageGenerationEnabled: false, triggerType: 'manual' }));

console.log('app image generation switches ok');
