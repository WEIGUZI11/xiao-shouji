import assert from 'node:assert/strict';

import { buildTtsAudioCacheKey, canStoreTtsAudio, TTS_AUDIO_CACHE_LIMIT_BYTES } from './ttsAudioCache';
import type { TtsConfig } from './tts';

const config: TtsConfig = {
  provider: 'minimax', baseUrl: 'https://api.minimax.io/', apiKey: 'secret-one', model: 'speech-2.8-hd', voiceId: 'female',
};
const sameWithoutSecret = { ...config, apiKey: 'secret-two' };
assert.equal(buildTtsAudioCacheKey(config, '你好'), buildTtsAudioCacheKey(sameWithoutSecret, '你好'), 'API key must not affect or leak into cache key');
assert.notEqual(buildTtsAudioCacheKey(config, '你好'), buildTtsAudioCacheKey(config, '再见'));
const doubaoBase: TtsConfig = {
  provider: 'doubao', baseUrl: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional', apiKey: 'secret', model: 'seed-tts-2.0', voiceId: 'voice', doubaoModel: 'seed-tts-2.0-standard',
};
assert.notEqual(
  buildTtsAudioCacheKey(doubaoBase, '你好'),
  buildTtsAudioCacheKey({ ...doubaoBase, doubaoModel: 'seed-tts-2.0-expressive' }, '你好'),
  'Doubao standard and expressive audio must not share a cache entry',
);
assert.equal(canStoreTtsAudio(TTS_AUDIO_CACHE_LIMIT_BYTES - 10, 10), true);
assert.equal(canStoreTtsAudio(TTS_AUDIO_CACHE_LIMIT_BYTES - 10, 11), false);
assert.equal(canStoreTtsAudio(TTS_AUDIO_CACHE_LIMIT_BYTES, 20, 20), true, 'replacing an entry does not grow usage');

console.log('tts audio cache helpers ok');
