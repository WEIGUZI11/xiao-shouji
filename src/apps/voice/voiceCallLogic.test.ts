import assert from 'node:assert/strict';
import {
  buildVoiceCallHistoryMessages,
  buildVoiceCallOpeningLine,
  buildVoiceCallSystemPrompt,
  cleanVoiceCallReply,
  getVoiceCallDefaultScene,
  getVoiceCallDurationLabel,
  getVoiceCallPhaseText,
  isVoiceCallAudioAvailable,
  isVoiceCallSpeechRecognitionAvailable,
} from './voiceCallLogic';

assert.equal(getVoiceCallPhaseText('ready', '艾尔'), '等待呼唤 艾尔');
assert.equal(getVoiceCallPhaseText('calling', '艾尔'), '正在呼唤 艾尔');
assert.equal(getVoiceCallPhaseText('connected', '艾尔'), '已接通 艾尔');
assert.equal(getVoiceCallPhaseText('ended', '艾尔'), '已结束和 艾尔 的语音通话');

assert.match(getVoiceCallDefaultScene({ name: '艾尔', description: '金发勇者', personality: '' }), /艾尔接起语音/);
assert.equal(getVoiceCallDurationLabel(null, 1000), '00:00');
assert.equal(getVoiceCallDurationLabel(1000, 126_000), '02:05');

assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: false, provider: 'browser', hasBrowserSpeechSynthesis: true }), false);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'browser', hasBrowserSpeechSynthesis: false }), false);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'browser', hasBrowserSpeechSynthesis: true }), true);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'local', baseUrl: '' }), false);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'local', baseUrl: 'http://127.0.0.1:9880/tts' }), true);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'openai', apiKey: '' }), false);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'openai', apiKey: 'sk-test' }), true);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'doubao', apiKey: '' }), false);
assert.equal(isVoiceCallAudioAvailable({ ttsEnabled: true, provider: 'doubao', apiKey: 'doubao-test' }), true);

assert.equal(isVoiceCallSpeechRecognitionAvailable({ hasBrowserSpeechRecognition: true, muted: false }), true);
assert.equal(isVoiceCallSpeechRecognitionAvailable({ hasBrowserSpeechRecognition: false, muted: false }), false);
assert.equal(isVoiceCallSpeechRecognitionAvailable({ hasBrowserSpeechRecognition: true, muted: true }), false);

assert.equal(
  buildVoiceCallOpeningLine({ name: '艾尔', firstMessage: '终于接到你的电话了。' }),
  '喂？我是艾尔，听得到吗？',
);
assert.match(buildVoiceCallOpeningLine({ name: '艾尔', firstMessage: '' }), /艾尔|喂/);

assert.equal(cleanVoiceCallReply('艾尔：喂，我在。\n[image prompt="夜色"]', '艾尔'), '喂，我在。');
assert.equal(cleanVoiceCallReply('[sticker mood=ok]', '艾尔'), '我在听。');

const systemPrompt = buildVoiceCallSystemPrompt({
  characterName: '艾尔',
  characterPrompt: '你是艾尔。',
  phonePresetPrompt: '电话里要自然。',
  userProfilePrompt: '用户叫小凡。',
});
assert.match(systemPrompt, /QQ语音通话/);
assert.match(systemPrompt, /像真的在电话里/);
assert.doesNotMatch(systemPrompt, /\[image prompt=/);

assert.deepEqual(
  buildVoiceCallHistoryMessages([
    { speaker: 'char', text: '喂？', timestamp: 1 },
    { speaker: 'user', text: '听得到。', timestamp: 2 },
  ]),
  [
    { role: 'assistant', content: '喂？' },
    { role: 'user', content: '听得到。' },
  ],
);

console.log('voice call logic tests passed');
