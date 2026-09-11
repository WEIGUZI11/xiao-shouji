import assert from 'node:assert/strict';

import { isTrustedImageProxyUrl } from './imageProxyPolicy';

assert.equal(isTrustedImageProxyUrl('https://api.openai.com/v1/images/generations'), true);
assert.equal(isTrustedImageProxyUrl('https://image.novelai.net/ai/generate-image'), true);
assert.equal(isTrustedImageProxyUrl('http://api.openai.com/v1/images/generations'), false);
assert.equal(isTrustedImageProxyUrl('https://api.openai.com.evil.example/v1/images/generations'), false);
assert.equal(isTrustedImageProxyUrl('https://user:pass@api.openai.com/v1/images/generations'), false);
assert.equal(isTrustedImageProxyUrl('https://images.community.example/generate', ['community.example']), true);

console.log('image proxy policy tests passed');
