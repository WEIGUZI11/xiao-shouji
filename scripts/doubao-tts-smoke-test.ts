import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

import { buildExternalTtsRequest, extractDoubaoStreamAudioChunks, type TtsConfig } from '../src/tts';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.doubao.local'), quiet: true, override: true });

const apiKey = (process.env.DOUBAO_TTS_API_KEY || process.env.DOUBAO_TTS_TOKEN || '').trim();
const appId = (process.env.DOUBAO_TTS_APP_ID || '').trim();
const resourceId = (process.env.DOUBAO_TTS_TEST_RESOURCE_ID || process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0').trim();
const voiceId = (process.env.DOUBAO_TTS_TEST_VOICE_ID || process.env.DOUBAO_TTS_VOICE_ID || '').trim();
const doubaoModel = (process.env.DOUBAO_TTS_TEST_MODEL || process.env.DOUBAO_TTS_MODEL || 'seed-tts-2.0-standard').trim() as TtsConfig['doubaoModel'];
const text = (process.env.DOUBAO_TTS_TEST_TEXT || '你好。').trim();

if (!apiKey) throw new Error('DOUBAO_TTS_API_KEY / DOUBAO_TTS_TOKEN 未配置。');
if (!voiceId) throw new Error('DOUBAO_TTS_VOICE_ID 未配置。');

const config: TtsConfig = {
  provider: 'doubao',
  baseUrl: process.env.DOUBAO_TTS_BASE_URL || 'https://openspeech.bytedance.com/api/v3/tts/unidirectional',
  apiKey,
  appId,
  model: resourceId,
  doubaoModel,
  voiceId,
  speechRate: 0,
  loudnessRate: 0,
};
const request = buildExternalTtsRequest(config, text);
if (!request) throw new Error('豆包 TTS 请求没有生成。');
const requestBody = JSON.parse(String(request.init.body || '{}')) as { req_params?: { model?: string } };

const response = await fetch(request.url, request.init);
const responseText = await response.text();
if (!response.ok) {
  let detail = responseText.slice(0, 400);
  try {
    const parsed = JSON.parse(responseText) as { message?: string; error?: { message?: string } };
    detail = parsed.error?.message || parsed.message || detail;
  } catch {
    // Keep the shortened text response.
  }
  throw new Error(`豆包 TTS HTTP ${response.status}: ${detail}`);
}

const chunks = extractDoubaoStreamAudioChunks(responseText);
if (!chunks.length) throw new Error('豆包接口已连接，但没有返回音频分片。');
const audio = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk, 'base64')));
if (!audio.length) throw new Error('豆包接口返回的音频为空。');

const outputDir = path.resolve(process.cwd(), 'qa-screenshots', 'doubao-tts-smoke-test');
const outputPath = path.join(outputDir, `doubao-tts-${Date.now()}.mp3`);
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, audio);

console.log(JSON.stringify({
  ok: true,
  statusCode: response.status,
  endpoint: new URL(request.url).origin,
  authMode: appId ? 'old-console-app-access' : 'new-console-api-key',
  resourceId,
  model: requestBody.req_params?.model || null,
  voiceId,
  textLength: text.length,
  bytes: audio.length,
  outputPath,
}, null, 2));
