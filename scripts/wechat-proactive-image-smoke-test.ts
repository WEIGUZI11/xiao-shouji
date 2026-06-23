import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

import handler from '../api/nai/generate-image.js';
import { buildActiveEventWrites, buildTodayLifeRefreshSuggestions } from '../src/apps/active-events/activeEventsLogic';
import { buildChatImagePrompt, buildNaiGenerateImagePayload, defaultImageGenerationConfig, evaluateImageGenerationGate, hashPrompt } from '../src/lib/naiImage';
import { createId } from '../src/lib/utils';

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function extractImageBytes(buffer: Buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return buffer;
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (u32(bytes, index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('NAI returned data, but no image zip entry was found.');
  const entries = u16(bytes, eocd + 10);
  let cursor = u32(bytes, eocd + 16);
  for (let index = 0; index < entries; index += 1) {
    if (u32(bytes, cursor) !== 0x02014b50) break;
    const method = u16(bytes, cursor + 10);
    const compressedSize = u32(bytes, cursor + 20);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const localOffset = u32(bytes, cursor + 42);
    const fileName = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)).toLowerCase();
    if (fileName.endsWith('.png') || index === 0) {
      const localNameLength = u16(bytes, localOffset + 26);
      const localExtraLength = u16(bytes, localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = Buffer.from(bytes.slice(start, start + compressedSize));
      if (method === 0) return compressed;
      if (method === 8) return zlib.inflateRawSync(compressed);
      throw new Error(`Unsupported NAI zip compression method: ${method}`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error('NAI zip did not contain a PNG image.');
}

function createResponseRecorder(resolve: (value: { statusCode: number; headers: Record<string, string>; body: Buffer | unknown }) => void) {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      resolve({ statusCode: this.statusCode, headers: this.headers, body: payload });
    },
    send(buffer: Buffer) {
      resolve({ statusCode: this.statusCode, headers: this.headers, body: buffer });
    },
  };
}

async function callHandler(body: unknown) {
  return new Promise<{ statusCode: number; headers: Record<string, string>; body: Buffer | unknown }>((resolve) => {
    handler({ method: 'POST', headers: {}, body }, createResponseRecorder(resolve));
  });
}

const now = Date.now();
const characterId = 'char-proactive-nai-test';
const userMessageId = 'msg-proactive-user-test';
const context = {
  characters: [{
    id: characterId,
    name: '测试角色',
    avatar: '',
    description: '用于验证微信主动生图',
    personality: '',
    firstMessage: '',
    systemPrompt: '',
    imagePromptTags: '',
  }],
  chatSessions: {
    [`wechat:${characterId}`]: {
      id: `wechat:${characterId}`,
      characterId,
      channel: 'wechat' as const,
      lastUpdated: now,
      messages: [{
        id: userMessageId,
        role: 'user' as const,
        content: '今天想看一张窗边红苹果的小图。',
        timestamp: now - 30_000,
        kind: 'text' as const,
      }],
    },
  },
  diaries: [],
  calendarEvents: [],
  galleryPhotos: [],
  memos: [],
  wechatMoments: [],
  musicTracks: [],
  musicListenRecords: [],
  xiaohongshuNotes: [],
  lifeEvents: [],
};

const refresh = buildTodayLifeRefreshSuggestions(context, {
  now,
  lastRefreshAt: 0,
  cooldownMs: 0,
  maxSuggestions: 3,
});
assert.equal(refresh.canRefresh, true);
const suggestion = refresh.suggestions.find((item) => item.action === 'send_image');
assert.ok(suggestion, 'expected active event to include a send_image suggestion');

const writes = buildActiveEventWrites(suggestion, { now });
assert.ok(writes.chatTarget, 'expected proactive image to target a chat');
assert.ok(writes.imagePrompt, 'expected proactive image prompt');

const fullPrompt = buildChatImagePrompt({
  prompt: writes.imagePrompt,
  speakerName: context.characters[0]?.name,
  characterTags: context.characters[0]?.imagePromptTags,
  context: 'wechat',
});
const gate = evaluateImageGenerationGate({
  now,
  characterId: writes.chatTarget.characterId,
  channelId: `${writes.chatTarget.channel}:${writes.chatTarget.characterId}`,
  userId: 'local-user',
  prompt: fullPrompt,
  triggerType: 'proactive',
  records: [],
});
assert.equal(gate.allowed, true);

const payload = buildNaiGenerateImagePayload({
  config: {
    ...defaultImageGenerationConfig,
    width: 512,
    height: 512,
    steps: 6,
    scale: 5,
    promptPreset: 'best quality, simple composition, no text',
    negativePrompt: 'lowres, blurry, text, watermark, logo, worst quality',
  },
  prompt: fullPrompt,
  seed: Number(process.env.NAI_TEST_SEED || 22334455),
});

const result = await callHandler(payload);
if (result.statusCode < 200 || result.statusCode >= 300 || !Buffer.isBuffer(result.body)) {
  console.error(JSON.stringify({ ok: false, statusCode: result.statusCode, body: result.body }, null, 2));
  process.exit(1);
}

const outputDir = process.env.NAI_TEST_OUTPUT_DIR || path.resolve(process.cwd(), 'qa-screenshots', 'wechat-proactive-image');
const imageBytes = extractImageBytes(result.body);
const outputPath = path.join(outputDir, `wechat-proactive-${Date.now()}.png`);
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, imageBytes);

const imageMessage = {
  id: createId('msg'),
  role: 'model' as const,
  content: `data:image/png;base64,${imageBytes.toString('base64')}`,
  timestamp: Date.now(),
  kind: 'image' as const,
  stickerLabel: suggestion.title,
};

const generatedRecord = {
  imageId: createId('image'),
  botId: writes.chatTarget.channel,
  characterId: writes.chatTarget.characterId,
  guildId: 'local-small-phone',
  channelId: `${writes.chatTarget.channel}:${writes.chatTarget.characterId}`,
  userId: 'local-user',
  triggerType: 'proactive' as const,
  promptHash: gate.promptHash || hashPrompt(fullPrompt),
  storagePath: outputPath,
  createdAt: now,
  width: payload.parameters.width,
  height: payload.parameters.height,
  model: payload.model,
  status: 'success' as const,
};

console.log(JSON.stringify({
  ok: true,
  suggestion: {
    id: suggestion.id,
    action: suggestion.action,
    title: suggestion.title,
  },
  chatTarget: writes.chatTarget,
  messageKind: imageMessage.kind,
  imageBytes: imageBytes.length,
  outputPath,
  generatedRecord,
}, null, 2));
