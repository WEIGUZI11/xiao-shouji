import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import handler from '../api/nai/generate-image.js';
import { buildNaiGenerateImagePayload, defaultImageGenerationConfig } from '../src/lib/naiImage';

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
    handler({
      method: 'POST',
      headers: {},
      body,
    }, createResponseRecorder(resolve));
  });
}

const outputDir = process.env.NAI_TEST_OUTPUT_DIR || path.resolve(process.cwd(), 'qa-screenshots', 'nai-smoke-test');
const outputPath = path.join(outputDir, `nai-smoke-${Date.now()}.png`);
const payload = buildNaiGenerateImagePayload({
  config: {
    ...defaultImageGenerationConfig,
    model: process.env.NAI_TEST_MODEL || defaultImageGenerationConfig.model,
    width: Number(process.env.NAI_TEST_WIDTH || 512),
    height: Number(process.env.NAI_TEST_HEIGHT || 512),
    steps: Number(process.env.NAI_TEST_STEPS || 6),
    scale: Number(process.env.NAI_TEST_SCALE || 5),
    promptPreset: 'best quality, simple composition, no text',
    negativePrompt: 'lowres, blurry, text, watermark, logo, worst quality',
  },
  prompt: process.env.NAI_TEST_PROMPT || 'a small red apple on a clean white background',
  seed: Number(process.env.NAI_TEST_SEED || 123456789),
});

const result = await callHandler(payload);
if (result.statusCode < 200 || result.statusCode >= 300 || !Buffer.isBuffer(result.body)) {
  console.error(JSON.stringify({
    ok: false,
    statusCode: result.statusCode,
    contentType: result.headers['content-type'],
    body: result.body,
  }, null, 2));
  process.exit(1);
}

const imageBytes = extractImageBytes(result.body);
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, imageBytes);
console.log(JSON.stringify({
  ok: true,
  statusCode: result.statusCode,
  contentType: result.headers['content-type'],
  outputPath,
  bytes: imageBytes.length,
  model: payload.model,
  width: payload.parameters.width,
  height: payload.parameters.height,
  steps: payload.parameters.steps,
}, null, 2));
