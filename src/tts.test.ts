import { strict as assert } from 'node:assert';
import { buildExternalTtsRequest, defaultTtsConfig, extractDoubaoStreamAudioChunks } from './tts';

const openai = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'openai',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini-tts',
    voiceId: 'alloy',
  },
  '电话里说一句。',
);
assert.equal(openai?.url, 'https://api.openai.com/v1/audio/speech');
assert.equal(openai?.responseType, 'audio');
assert.equal(openai?.init.headers.Authorization, 'Bearer sk-test');
assert.equal(JSON.parse(String(openai?.init.body)).input, '电话里说一句。');

const gemini = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'gemini',
    apiKey: 'gemini-key',
    model: 'gemini-2.5-flash-preview-tts',
    voiceId: 'Kore',
  },
  '请生成电话音色。',
);
const geminiBody = JSON.parse(String(gemini?.init.body));
assert.equal(gemini?.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=gemini-key');
assert.equal(gemini?.responseType, 'gemini-json');
assert.deepEqual(geminiBody.generationConfig.responseModalities, ['AUDIO']);
assert.equal(geminiBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');

const local = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'local',
    baseUrl: 'http://127.0.0.1:9880/tts',
    voiceId: 'char-a',
  },
  '本地服务读这句。',
);
assert.equal(local?.url, 'http://127.0.0.1:9880/tts');
assert.equal(local?.responseType, 'auto');
assert.equal(JSON.parse(String(local?.init.body)).voiceId, 'char-a');

const minimax = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'minimax',
    apiKey: 'mini-key',
    model: 'speech-2.8-hd',
    voiceId: 'female-shaonv',
  },
  'MiniMax 试听。',
);
const minimaxBody = JSON.parse(String(minimax?.init.body));
assert.equal(minimax?.url, 'https://api.minimax.io/v1/t2a_v2');
assert.equal(minimax?.responseType, 'minimax-json');
assert.equal(minimax?.init.headers.Authorization, 'Bearer mini-key');
assert.equal(minimaxBody.model, 'speech-2.8-hd');
assert.equal(minimaxBody.voice_setting.voice_id, 'female-shaonv');
assert.equal(minimaxBody.audio_setting.format, 'mp3');

const doubao = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'doubao',
    baseUrl: '',
    apiKey: 'doubao-token',
    appId: 'doubao-appid',
    model: 'volcano_tts',
    voiceId: 'BV001_streaming',
  },
  '豆包试听。',
);
const doubaoBody = JSON.parse(String(doubao?.init.body));
assert.equal(doubao?.url, 'https://openspeech.bytedance.com/api/v1/tts');
assert.equal(doubao?.responseType, 'doubao-json');
assert.equal(doubao?.init.headers.Authorization, 'Bearer;doubao-token');
assert.equal(doubaoBody.app.appid, 'doubao-appid');
assert.equal(doubaoBody.app.token, 'doubao-token');
assert.equal(doubaoBody.app.cluster, 'volcano_tts');
assert.equal(doubaoBody.audio.voice_type, 'BV001_streaming');
assert.equal(doubaoBody.audio.encoding, 'mp3');
assert.equal(doubaoBody.request.operation, 'query');

assert.equal(buildExternalTtsRequest({ ...defaultTtsConfig, provider: 'browser' }, '免费浏览器语音'), null);

const doubaoArk = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'doubao',
    baseUrl: '',
    apiKey: 'ark-key',
    appId: '',
    model: 'seed-tts-2.0',
    voiceId: 'zh_female_cancan_uranus_bigtts',
  },
  '豆包新版语音试听。',
);
const doubaoArkBody = JSON.parse(String(doubaoArk?.init.body));
assert.equal(doubaoArk?.url, 'https://openspeech.bytedance.com/api/v3/tts/unidirectional');
assert.equal(doubaoArk?.responseType, 'doubao-stream-json');
assert.equal(doubaoArk?.init.headers['X-Api-Key'], 'ark-key');
assert.equal(doubaoArk?.init.headers['X-Api-Resource-Id'], 'seed-tts-2.0');
assert.equal(doubaoArkBody.req_params.text, '豆包新版语音试听。');
assert.equal(doubaoArkBody.req_params.speaker, 'zh_female_cancan_uranus_bigtts');
assert.equal(doubaoArkBody.req_params.audio_params.format, 'mp3');
assert.equal(doubaoArkBody.req_params.additions, undefined);

const doubaoArkBlankVoice = buildExternalTtsRequest(
  {
    ...defaultTtsConfig,
    provider: 'doubao',
    baseUrl: '',
    apiKey: 'ark-key',
    appId: '',
    model: 'seed-tts-2.0',
    voiceId: '',
  },
  '豆包新版没有填写音色。',
);
const doubaoArkBlankVoiceBody = JSON.parse(String(doubaoArkBlankVoice?.init.body));
assert.equal(doubaoArkBlankVoiceBody.req_params.speaker, '');

assert.deepEqual(
  extractDoubaoStreamAudioChunks('{"code":0,"message":"","data":"AAAA"}\n{"code":0,"message":"","data":"BBBB"}\n{"code":20000000,"message":"OK","data":null}'),
  ['AAAA', 'BBBB'],
);
assert.throws(
  () => extractDoubaoStreamAudioChunks('{"code":55000000,"message":"bad request","data":null}'),
  /bad request/,
);

console.log('tts request builders ok');
