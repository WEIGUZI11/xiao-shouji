import assert from 'node:assert/strict';

import { isTrustedTtsProxyUrl } from './ttsProxyPolicy';

assert.equal(isTrustedTtsProxyUrl('https://api.minimax.io/v1/t2a_v2'), true);
assert.equal(isTrustedTtsProxyUrl('https://openspeech.bytedance.com/api/v3/tts/unidirectional'), true);
assert.equal(isTrustedTtsProxyUrl('http://127.0.0.1:9880/tts'), false);
assert.equal(isTrustedTtsProxyUrl('https://evil.example/internal'), false);
assert.equal(isTrustedTtsProxyUrl('https://tts.example.test/v1', ['tts.example.test']), true);

console.log('TTS proxy trusted-host policy ok');
