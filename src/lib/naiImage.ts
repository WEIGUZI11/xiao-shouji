import { buildHttpErrorMessage } from './httpErrors';

export type ImageGenerationConfig = {
  provider: 'novelai' | 'comfyui' | 'custom';
  customFormat?: 'auto' | 'nai' | 'openai-images' | 'mj-task' | 'generic-json';
  customPayloadTemplate?: string;
  customResultPath?: string;
  customTaskIdPath?: string;
  customPollUrlTemplate?: string;
  customPollResultPath?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  availableModels?: string[];
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  promptPreset: string;
  promptExtra: string;
  negativePrompt: string;
};

export type ImageTriggerType = 'manual' | 'proactive';

export type GeneratedImageStatus = 'success' | 'failure';

export interface GeneratedImageRecord {
  imageId: string;
  botId: string;
  characterId: string;
  guildId: string;
  channelId: string;
  userId: string;
  triggerType: ImageTriggerType;
  promptHash: string;
  promptText?: string;
  storagePath?: string;
  storageUrl?: string;
  galleryPhotoId?: string;
  createdAt: number;
  width: number;
  height: number;
  model: string;
  status: GeneratedImageStatus;
  error?: string;
}

export type ImageGenerationGateReason =
  | 'allowed'
  | 'character_cooldown'
  | 'channel_cooldown'
  | 'user_cooldown'
  | 'daily_quota'
  | 'retry_limit'
  | 'duplicate_prompt'
  | 'similar_prompt';

export interface ImageGenerationGatePolicy {
  characterCooldownMs: number;
  channelCooldownMs: number;
  userCooldownMs: number;
  dailyQuota: number;
  failedRetryLimit: number;
  failureWindowMs: number;
  duplicatePromptWindowMs: number;
  similarPromptWindowMs: number;
  similarPromptThreshold: number;
}

export interface ImageGenerationGateInput {
  now?: number;
  characterId: string;
  channelId: string;
  userId: string;
  prompt: string;
  triggerType: ImageTriggerType;
  records: GeneratedImageRecord[];
  policy?: Partial<ImageGenerationGatePolicy>;
}

export const defaultImageGenerationGatePolicy: ImageGenerationGatePolicy = {
  characterCooldownMs: 10 * 60 * 1000,
  channelCooldownMs: 3 * 60 * 1000,
  userCooldownMs: 60 * 1000,
  dailyQuota: 80,
  failedRetryLimit: 2,
  failureWindowMs: 15 * 60 * 1000,
  duplicatePromptWindowMs: 24 * 60 * 60 * 1000,
  similarPromptWindowMs: 10 * 60 * 1000,
  similarPromptThreshold: 0.82,
};

export function getDefaultNaiProxyUrl(value?: string) {
  return value?.trim() || '/api/nai/generate-image';
}

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const defaultImageGenerationConfig: ImageGenerationConfig = {
  provider: 'novelai',
  baseUrl: getDefaultNaiProxyUrl(viteEnv?.VITE_NAI_PROXY_URL),
  apiKey: '',
  model: 'nai-diffusion-4-5-full',
  width: 512,
  height: 512,
  steps: 18,
  scale: 5,
  sampler: 'k_euler_ancestral',
  promptPreset: 'high quality, clean composition, mobile friendly image, no watermark',
  promptExtra: '',
  negativePrompt: 'lowres, blurry, text, watermark, logo, worst quality',
};

export function getDefaultImageBaseUrlForProvider(provider: ImageGenerationConfig['provider']) {
  if (provider === 'comfyui') return 'http://127.0.0.1:8188';
  if (provider === 'custom') return '';
  return getDefaultNaiProxyUrl(viteEnv?.VITE_NAI_PROXY_URL);
}

function normalizePromptForHash(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function hashPrompt(prompt: string) {
  const normalized = normalizePromptForHash(prompt);
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function promptSimilarity(a: string, b: string) {
  const left = new Set(normalizePromptForHash(a).split('').filter((item) => item.trim()));
  const right = new Set(normalizePromptForHash(b).split('').filter((item) => item.trim()));
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  left.forEach((item) => {
    if (right.has(item)) overlap += 1;
  });
  return overlap / Math.max(left.size, right.size);
}

function sameLocalDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function evaluateImageGenerationGate(input: ImageGenerationGateInput): { allowed: boolean; reason: ImageGenerationGateReason; retryAfterMs?: number; promptHash: string } {
  const policy = { ...defaultImageGenerationGatePolicy, ...input.policy };
  const now = input.now || Date.now();
  const promptHash = hashPrompt(input.prompt);
  const records = input.records.filter((record) => record.createdAt <= now);
  const successes = records.filter((record) => record.status === 'success');
  const recentSuccesses = successes.filter((record) => now - record.createdAt <= policy.duplicatePromptWindowMs);
  const duplicatePrompt = recentSuccesses.find((record) =>
    record.promptHash === promptHash
    && record.characterId === input.characterId
    && record.channelId === input.channelId
  );
  if (duplicatePrompt) return { allowed: false, reason: 'duplicate_prompt', promptHash };

  const characterRecord = successes.find((record) => record.characterId === input.characterId && now - record.createdAt < policy.characterCooldownMs);
  if (characterRecord) return { allowed: false, reason: 'character_cooldown', retryAfterMs: policy.characterCooldownMs - (now - characterRecord.createdAt), promptHash };

  const channelRecord = successes.find((record) => record.channelId === input.channelId && now - record.createdAt < policy.channelCooldownMs);
  if (channelRecord) return { allowed: false, reason: 'channel_cooldown', retryAfterMs: policy.channelCooldownMs - (now - channelRecord.createdAt), promptHash };

  const userRecord = successes.find((record) => record.userId === input.userId && now - record.createdAt < policy.userCooldownMs);
  if (userRecord) return { allowed: false, reason: 'user_cooldown', retryAfterMs: policy.userCooldownMs - (now - userRecord.createdAt), promptHash };

  const dailyCount = successes.filter((record) => sameLocalDay(record.createdAt, now)).length;
  if (dailyCount >= policy.dailyQuota) return { allowed: false, reason: 'daily_quota', promptHash };

  const failures = records.filter((record) =>
    record.status === 'failure'
    && record.promptHash === promptHash
    && record.userId === input.userId
    && now - record.createdAt <= policy.failureWindowMs
  );
  if (failures.length >= policy.failedRetryLimit) return { allowed: false, reason: 'retry_limit', promptHash };

  const similarPrompt = successes.find((record) =>
    record.characterId === input.characterId
    && record.channelId === input.channelId
    && now - record.createdAt <= policy.similarPromptWindowMs
    && Boolean(record.promptText)
    && promptSimilarity(record.promptText || '', input.prompt) >= policy.similarPromptThreshold
  );
  if (similarPrompt) return { allowed: false, reason: 'similar_prompt', promptHash };

  return { allowed: true, reason: 'allowed', promptHash };
}

export function buildNaiRequestHeaders(token?: string) {
  return {
    ...(token?.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
    'User-Agent': 'Mozilla/5.0',
    Origin: 'https://novelai.net',
    Referer: 'https://novelai.net/',
    'Content-Type': 'application/json',
    Accept: 'application/x-zip-compressed, application/json',
  };
}

export type NaiGenerateImagePayload = {
  action: 'generate';
  input: string;
  model: string;
  parameters: {
    width: number;
    height: number;
    scale: number;
    sampler: string;
    steps: number;
    n_samples: number;
    seed: number;
    ucPreset: number;
    qualityToggle: boolean;
    sm: boolean;
    sm_dyn: boolean;
    dynamic_thresholding: boolean;
    controlnet_strength: number;
    legacy: boolean;
    add_original_image: boolean;
    cfg_rescale: number;
    noise_schedule: string;
    negative_prompt: string;
    params_version: number;
    prefer_brownian: boolean;
    deliberate_euler_ancestral_bug: boolean;
    autoSmea?: boolean;
    legacy_v3_extend?: boolean;
    skip_cfg_above_sigma?: number | null;
    use_coords?: boolean;
    legacy_uc?: boolean;
    normalize_reference_strength_multiple?: boolean;
    inpaintImg2ImgStrength?: number;
    characterPrompts?: Array<{
      prompt: string;
      uc: string;
      center: { x: number; y: number };
    }>;
    v4_prompt?: {
      caption: {
        base_caption: string;
        char_captions: Array<{
          char_caption: string;
          centers: Array<{ x: number; y: number }>;
        }>;
      };
      use_coords: boolean;
      use_order: boolean;
    };
    v4_negative_prompt?: {
      caption: {
        base_caption: string;
        char_captions: Array<{
          char_caption: string;
          centers: Array<{ x: number; y: number }>;
        }>;
      };
      legacy_uc: boolean;
    };
  };
};

export const supportedNaiImageModels = [
  { id: 'nai-diffusion-4-5-full', label: 'NovelAI Diffusion V4.5 Full' },
  { id: 'nai-diffusion-4-5-curated', label: 'NovelAI Diffusion V4.5 Curated' },
  { id: 'nai-diffusion-4-full', label: 'NovelAI Diffusion V4 Full' },
  { id: 'nai-diffusion-4-curated-preview', label: 'NovelAI Diffusion V4 Curated Preview' },
  { id: 'nai-diffusion-3', label: 'NovelAI Diffusion Anime V3' },
  { id: 'nai-diffusion-furry-3', label: 'NovelAI Diffusion Furry V3' },
] as const;

type FetchLike = typeof fetch;

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function normalizeCustomModelBaseUrl(baseUrl: string) {
  const trimmed = trimTrailingSlash(baseUrl);
  if (!trimmed) return '';
  if (trimmed.endsWith('/v1/images/generations')) return trimmed.slice(0, -'/images/generations'.length);
  if (trimmed.endsWith('/images/generations')) return trimmed.slice(0, -'/images/generations'.length);
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function parseComfyCheckpointModels(data: unknown) {
  const root = data && typeof data === 'object' && 'CheckpointLoaderSimple' in data
    ? (data as { CheckpointLoaderSimple?: unknown }).CheckpointLoaderSimple
    : data;
  const required = (root as { input?: { required?: Record<string, unknown> } } | undefined)?.input?.required;
  const ckptName = required?.ckpt_name;
  const candidates = Array.isArray(ckptName) ? ckptName[0] : undefined;
  return Array.isArray(candidates)
    ? candidates.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export async function fetchImageGenerationModels({
  config,
  fetchImpl = fetch,
}: {
  config: ImageGenerationConfig;
  fetchImpl?: FetchLike;
}) {
  if (config.provider === 'novelai') {
    return supportedNaiImageModels.map((item) => item.id);
  }

  if (config.provider === 'custom' && getCustomImageRequestFormat(config) === 'nai') {
    return supportedNaiImageModels.map((item) => item.id);
  }

  if (config.provider === 'comfyui') {
    const baseUrl = trimTrailingSlash(config.baseUrl || getDefaultImageBaseUrlForProvider('comfyui'));
    if (!baseUrl) throw new Error('请先填写 ComfyUI 地址。');
    const response = await fetchImpl(`${baseUrl}/object_info/CheckpointLoaderSimple`);
    if (!response.ok) {
      throw new Error(buildHttpErrorMessage('ComfyUI 模型拉取失败', {
        status: response.status,
        statusText: response.statusText,
        detail: await response.text(),
      }));
    }
    return parseComfyCheckpointModels(await response.json());
  }

  const modelBaseUrl = normalizeCustomModelBaseUrl(config.baseUrl);
  if (!modelBaseUrl) throw new Error('请先填写自定义生图接口地址。');
  const response = await fetchImpl(`${modelBaseUrl}/models`, {
    headers: config.apiKey.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage('生图模型拉取失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await response.text(),
    }));
  }
  const data = await response.json();
  return Array.isArray(data?.data)
    ? data.data.map((item: { id?: string }) => item.id).filter(Boolean) as string[]
    : [];
}

export function isNaiV4ImageModel(model: string) {
  return model.startsWith('nai-diffusion-4');
}

function getOfficialQualitySuffix(model: string) {
  if (model === 'nai-diffusion-4-5-full') return 'location, very aesthetic, masterpiece, no text';
  if (model === 'nai-diffusion-4-5-curated') return 'location, masterpiece, no text, -0.8::feet::, rating:general';
  if (model === 'nai-diffusion-4-full') return 'no text, best quality, very aesthetic, absurdres';
  if (model === 'nai-diffusion-4-curated-preview') return 'rating:general, amazing quality, very aesthetic, absurdres';
  if (model === 'nai-diffusion-3') return 'best quality, amazing quality, very aesthetic, absurdres';
  if (model === 'nai-diffusion-furry-3') return '{best quality}, {amazing quality}';
  return '';
}

function buildImagePositivePrompt(config: Pick<ImageGenerationConfig, 'promptPreset' | 'promptExtra'>, prompt: string) {
  return [config.promptPreset, config.promptExtra, prompt].map((item) => item.trim()).filter(Boolean).join(', ');
}

function buildNaiPositiveInput(model: string, config: Pick<ImageGenerationConfig, 'promptPreset' | 'promptExtra'>, prompt: string) {
  const suffix = getOfficialQualitySuffix(model);
  return [buildImagePositivePrompt(config, prompt), suffix].map((item) => item.trim()).filter(Boolean).join(', ');
}

export function buildNaiGenerateImagePayload({
  config,
  prompt,
  seed = Math.floor(Math.random() * 4294967295),
}: {
  config: ImageGenerationConfig;
  prompt: string;
  seed?: number;
}): NaiGenerateImagePayload {
  const model = config.model || defaultImageGenerationConfig.model;
  const input = buildNaiPositiveInput(model, config, prompt);
  const negativePrompt = config.negativePrompt || defaultImageGenerationConfig.negativePrompt;
  const isV4 = isNaiV4ImageModel(model);
  return {
    action: 'generate',
    input,
    model,
    parameters: {
      width: Math.max(256, Math.min(1024, Math.round(config.width || 512))),
      height: Math.max(256, Math.min(1024, Math.round(config.height || 512))),
      scale: config.scale || defaultImageGenerationConfig.scale,
      sampler: config.sampler || defaultImageGenerationConfig.sampler,
      steps: Math.max(4, Math.min(50, Math.round(config.steps || 18))),
      n_samples: 1,
      seed,
      ucPreset: 0,
      qualityToggle: true,
      sm: false,
      sm_dyn: false,
      dynamic_thresholding: false,
      controlnet_strength: 1,
      legacy: false,
      add_original_image: isV4,
      cfg_rescale: 0,
      noise_schedule: isV4 ? 'karras' : 'native',
      negative_prompt: negativePrompt,
      params_version: 3,
      prefer_brownian: true,
      deliberate_euler_ancestral_bug: false,
      ...(isV4
        ? {
            autoSmea: false,
            legacy_v3_extend: false,
            skip_cfg_above_sigma: null,
            use_coords: false,
            legacy_uc: false,
            normalize_reference_strength_multiple: true,
            inpaintImg2ImgStrength: 1,
            characterPrompts: [],
            v4_prompt: {
              caption: {
                base_caption: input,
                char_captions: [],
              },
              use_coords: false,
              use_order: true,
            },
            v4_negative_prompt: {
              caption: {
                base_caption: negativePrompt,
                char_captions: [],
              },
              legacy_uc: false,
            },
          }
        : {}),
    },
  };
}

type ComfyPromptNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

function normalizeComfySamplerName(sampler: string) {
  if (sampler === 'k_euler_ancestral') return 'euler_ancestral';
  if (sampler.startsWith('k_')) return sampler.slice(2);
  return sampler || 'euler_ancestral';
}

export function buildComfyTextToImagePrompt({
  config,
  prompt,
  seed = Math.floor(Math.random() * 4294967295),
}: {
  config: ImageGenerationConfig;
  prompt: string;
  seed?: number;
}): Record<string, ComfyPromptNode> {
  const positivePrompt = buildImagePositivePrompt(config, prompt);
  return {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: config.model,
      },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: positivePrompt,
        clip: ['1', 1],
      },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: config.negativePrompt || defaultImageGenerationConfig.negativePrompt,
        clip: ['1', 1],
      },
    },
    '4': {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: Math.max(256, Math.min(2048, Math.round(config.width || 512))),
        height: Math.max(256, Math.min(2048, Math.round(config.height || 512))),
        batch_size: 1,
      },
    },
    '5': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: Math.max(1, Math.min(80, Math.round(config.steps || 18))),
        cfg: config.scale || defaultImageGenerationConfig.scale,
        sampler_name: normalizeComfySamplerName(config.sampler),
        scheduler: 'normal',
        denoise: 1,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
    },
    '6': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['5', 0],
        vae: ['1', 2],
      },
    },
    '7': {
      class_type: 'SaveImage',
      inputs: {
        filename_prefix: 'small-phone',
        images: ['6', 0],
      },
    },
  };
}

export function isServerManagedNaiEndpoint(baseUrl: string) {
  const endpoint = baseUrl.trim();
  if (!endpoint) return false;
  if (endpoint.startsWith('/api/nai/generate-image')) return true;
  try {
    const origin = typeof window === 'undefined' ? 'https://small-phone.local' : window.location.origin;
    return new URL(endpoint, origin).pathname === '/api/nai/generate-image';
  } catch {
    return false;
  }
}

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压 NAI 返回的图片包，请使用 Chrome/Edge 或配置图片代理返回 PNG。');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractImageBytes(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isPng) return bytes;

  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (u32(bytes, index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('NAI 返回了数据，但没有找到图片包。');

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
      const compressed = bytes.slice(start, start + compressedSize);
      if (method === 0) return compressed;
      if (method === 8) return inflateRaw(compressed);
      throw new Error(`NAI 图片包使用了暂不支持的压缩方式：${method}`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error('NAI 图片包里没有 PNG 文件。');
}

async function bytesToDataUrl(bytes: Uint8Array, mimeType = 'image/png') {
  const blob = new Blob([bytes], { type: mimeType });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.readAsDataURL(blob);
  });
}

function buildImageError(scope: string, response: Response, detail: string) {
  return buildHttpErrorMessage(scope, {
    status: response.status,
    statusText: response.statusText,
    detail,
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCustomPositivePrompt(config: ImageGenerationConfig, prompt: string) {
  return buildImagePositivePrompt(config, prompt);
}

function buildCustomHeaders(config: ImageGenerationConfig, extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKey.trim() ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {}),
    ...extra,
  };
}

function readJsonPath(data: unknown, path: string) {
  if (!path.trim()) return undefined;
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((value, key) => {
      if (value == null) return undefined;
      if (Array.isArray(value)) return value[Number(key)];
      if (typeof value === 'object') return (value as Record<string, unknown>)[key];
      return undefined;
    }, data);
}

function firstStringAtPath(data: unknown, paths: string[]) {
  for (const path of paths) {
    const value = readJsonPath(data, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function normalizeImageResult(value: string, treatAsBase64 = false) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/')) return trimmed;
  if (treatAsBase64 || /^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 120) {
    return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`;
  }
  return '';
}

function findImageResult(data: unknown, explicitPath?: string) {
  if (explicitPath) {
    const value = firstStringAtPath(data, [explicitPath]);
    const normalized = normalizeImageResult(value);
    if (normalized) return normalized;
  }
  const base64Value = firstStringAtPath(data, ['data[0].b64_json', 'data.b64_json', 'b64_json', 'imageBase64', 'image_base64', 'base64']);
  const base64Result = normalizeImageResult(base64Value, true);
  if (base64Result) return base64Result;
  const urlValue = firstStringAtPath(data, [
    'data[0].url',
    'data.url',
    'url',
    'imageUrl',
    'image_url',
    'result.url',
    'result.imageUrl',
    'result.image_url',
    'output.url',
    'output.imageUrl',
  ]);
  return normalizeImageResult(urlValue);
}

function findTaskId(data: unknown, explicitPath?: string) {
  return firstStringAtPath(data, [
    ...(explicitPath ? [explicitPath] : []),
    'result',
    'taskId',
    'task_id',
    'id',
    'data.taskId',
    'data.task_id',
    'data.id',
  ]);
}

function interpolateCustomTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key];
    return value == null ? '' : String(value);
  });
}

function buildCustomTemplateValues(config: ImageGenerationConfig, prompt: string, seed?: number) {
  const fullPrompt = buildCustomPositivePrompt(config, prompt);
  return {
    prompt: fullPrompt,
    user_prompt: prompt,
    positive_prompt: fullPrompt,
    negative_prompt: config.negativePrompt || defaultImageGenerationConfig.negativePrompt,
    model: config.model,
    width: Math.round(config.width || 512),
    height: Math.round(config.height || 512),
    steps: Math.round(config.steps || 18),
    scale: config.scale || defaultImageGenerationConfig.scale,
    sampler: config.sampler || defaultImageGenerationConfig.sampler,
    seed: seed ?? Math.floor(Math.random() * 4294967295),
  };
}

function buildGenericJsonBody(config: ImageGenerationConfig, prompt: string, seed?: number) {
  const values = buildCustomTemplateValues(config, prompt, seed);
  if (config.customPayloadTemplate?.trim()) {
    return JSON.parse(interpolateCustomTemplate(config.customPayloadTemplate, values));
  }
  return {
    model: values.model,
    prompt: values.prompt,
    negative_prompt: values.negative_prompt,
    width: values.width,
    height: values.height,
    steps: values.steps,
    scale: values.scale,
    sampler: values.sampler,
    seed: values.seed,
  };
}

function buildMjPollUrl(config: ImageGenerationConfig, taskId: string) {
  if (config.customPollUrlTemplate?.trim()) {
    return interpolateCustomTemplate(config.customPollUrlTemplate, { task_id: taskId, taskId });
  }
  const endpoint = trimTrailingSlash(config.baseUrl);
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.includes('/submit/imagine')
      ? url.pathname.replace(/\/submit\/imagine.*$/, `/task/${encodeURIComponent(taskId)}/fetch`)
      : `${url.pathname.replace(/\/+$/, '')}/${encodeURIComponent(taskId)}`;
    url.search = '';
    return url.toString();
  } catch {
    return `${endpoint}/${encodeURIComponent(taskId)}`;
  }
}

async function requestComfyImage({
  config,
  prompt,
  timeoutMs,
}: {
  config: ImageGenerationConfig;
  prompt: string;
  timeoutMs: number;
}) {
  const baseUrl = trimTrailingSlash(config.baseUrl || getDefaultImageBaseUrlForProvider('comfyui'));
  if (!baseUrl) throw new Error('请先填写 ComfyUI 地址。');
  if (!config.model.trim()) throw new Error('请先拉取并选择 ComfyUI checkpoint 模型。');

  const clientId = `small-phone-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const promptResponse = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      prompt: buildComfyTextToImagePrompt({ config, prompt }),
    }),
  });
  const promptText = await promptResponse.text();
  if (!promptResponse.ok) {
    throw new Error(buildImageError('ComfyUI 生图提交失败', promptResponse, promptText));
  }

  let promptId = '';
  try {
    promptId = JSON.parse(promptText).prompt_id || '';
  } catch {
    promptId = '';
  }
  if (!promptId) throw new Error(`ComfyUI 没有返回 prompt_id：${promptText.slice(0, 300)}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1000);
    const historyResponse = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`);
    const historyText = await historyResponse.text();
    if (!historyResponse.ok) {
      throw new Error(buildImageError('ComfyUI 查询结果失败', historyResponse, historyText));
    }
    const history = JSON.parse(historyText || '{}');
    const outputs = history?.[promptId]?.outputs || {};
    for (const output of Object.values(outputs) as Array<{ images?: Array<{ filename: string; subfolder?: string; type?: string }> }>) {
      const image = output.images?.[0];
      if (!image?.filename) continue;
      const params = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder || '',
        type: image.type || 'output',
      });
      const imageResponse = await fetch(`${baseUrl}/view?${params.toString()}`);
      const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
      if (!imageResponse.ok) {
        throw new Error(buildImageError('ComfyUI 图片下载失败', imageResponse, new TextDecoder().decode(imageBytes.slice(0, 500))));
      }
      return bytesToDataUrl(imageBytes, imageResponse.headers.get('content-type') || 'image/png');
    }
  }

  throw new Error(`ComfyUI 生图超时：${Math.round(timeoutMs / 1000)} 秒内没有生成图片。`);
}

async function requestCustomImage({
  config,
  prompt,
  timeoutMs,
}: {
  config: ImageGenerationConfig;
  prompt: string;
  timeoutMs: number;
}) {
  const baseUrl = trimTrailingSlash(config.baseUrl);
  if (!baseUrl) throw new Error('请先填写自定义生图接口地址。');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const request = buildCustomImageRequest({ config, prompt });
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });
    const buffer = await response.arrayBuffer();
    if (!response.ok) {
      throw new Error(buildImageError('自定义生图接口请求失败', response, new TextDecoder().decode(buffer.slice(0, 500)).trim()));
    }
    if (request.responseKind === 'nai-binary') {
      const imageBytes = await extractImageBytes(buffer);
      return bytesToDataUrl(imageBytes, response.headers.get('content-type') || 'image/png');
    }
    const text = new TextDecoder().decode(buffer);
    const data = JSON.parse(text || '{}');
    const immediateImage = findImageResult(data, config.customResultPath);
    if (immediateImage) return immediateImage;

    if (request.responseKind === 'mj-task-json') {
      const taskId = findTaskId(data, config.customTaskIdPath);
      if (!taskId) throw new Error(`MJ 中转没有返回任务 ID：${text.slice(0, 300)}`);
      const pollUrl = buildMjPollUrl(config, taskId);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        await sleep(1500);
        const pollResponse = await fetch(pollUrl, {
          signal: controller.signal,
          headers: buildCustomHeaders(config),
        });
        const pollText = await pollResponse.text();
        if (!pollResponse.ok) {
          throw new Error(buildImageError('MJ 中转查询失败', pollResponse, pollText.slice(0, 500)));
        }
        const pollData = JSON.parse(pollText || '{}');
        const pollImage = findImageResult(pollData, config.customPollResultPath || config.customResultPath);
        if (pollImage) return pollImage;
        const status = firstStringAtPath(pollData, ['status', 'state', 'data.status', 'result.status']).toUpperCase();
        if (['FAILURE', 'FAILED', 'FAIL', 'ERROR'].includes(status)) {
          throw new Error(`MJ 中转生图失败：${pollText.slice(0, 500)}`);
        }
      }
      throw new Error(`MJ 中转生图超时：${Math.round(timeoutMs / 1000)} 秒内没有生成图片。`);
    }

    throw new Error(`自定义生图接口没有返回图片 URL、base64 或可轮询任务：${text.slice(0, 300)}`);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('自定义生图接口请求超时或被取消。');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

type CustomImageRequestFormat = 'nai' | 'openai-images' | 'mj-task' | 'generic-json';

export function getCustomImageRequestFormat(config: ImageGenerationConfig): CustomImageRequestFormat {
  if (config.customFormat && config.customFormat !== 'auto') return config.customFormat;
  const model = config.model.trim().toLowerCase();
  const endpoint = config.baseUrl.trim().toLowerCase();
  if (endpoint.includes('/mj/') || endpoint.includes('/submit/imagine') || endpoint.includes('midjourney') || model.includes('midjourney')) return 'mj-task';
  if (endpoint.includes('/images/generations')) return 'openai-images';
  if (model.startsWith('nai-')) return 'nai';
  if (endpoint.includes('novelai') || endpoint.includes('/nai') || endpoint.includes('generate-image')) return 'nai';
  if (config.customPayloadTemplate?.trim()) return 'generic-json';
  return 'generic-json';
}

export function buildCustomImageRequest({
  config,
  prompt,
  seed,
}: {
  config: ImageGenerationConfig;
  prompt: string;
  seed?: number;
}) {
  const format = getCustomImageRequestFormat(config);
  if (format === 'nai') {
    return {
      responseKind: 'nai-binary' as const,
      headers: buildNaiRequestHeaders(config.apiKey),
      body: buildNaiGenerateImagePayload({ config, prompt, seed }),
    };
  }

  if (format === 'mj-task') {
    return {
      responseKind: 'mj-task-json' as const,
      headers: buildCustomHeaders(config),
      body: {
        prompt: buildCustomPositivePrompt(config, prompt),
        base64Array: [],
      },
    };
  }

  if (format === 'generic-json') {
    return {
      responseKind: 'generic-json' as const,
      headers: buildCustomHeaders(config),
      body: buildGenericJsonBody(config, prompt, seed),
    };
  }

  return {
    responseKind: 'openai-json' as const,
    headers: buildCustomHeaders(config),
    body: {
      model: config.model,
      prompt: buildCustomPositivePrompt(config, prompt),
      n: 1,
      size: `${Math.round(config.width || 512)}x${Math.round(config.height || 512)}`,
      response_format: 'b64_json',
    },
  };
}

export function buildNovelAiPrompt(prompt: string, context: 'wechat' | 'xiaohongshu' | 'gallery' = 'gallery') {
  const base = prompt.trim();
  const style =
    context === 'xiaohongshu'
      ? 'mobile photo, natural lifestyle composition, clean cover image'
      : context === 'wechat'
        ? 'casual mobile chat image, expressive but clean, no text overlay'
        : 'clean mobile friendly image';
  return [base || 'soft ink wash still life', style, 'high quality, detailed, tasteful, no watermark'].join(', ');
}

function isClearlyHumanImagePrompt(prompt: string) {
  return /portrait|selfie|person|people|human|girl|boy|man|woman|character|face|full body|人物|人像|自拍|角色|女孩|男孩|男人|女人|人\b|脸|全身/i.test(prompt);
}

function isClearlyNonHumanImagePrompt(prompt: string) {
  if (isClearlyHumanImagePrompt(prompt)) return false;
  return /landscape|scenery|mountain|forest|ocean|sea|sky|sunset|sunrise|cityscape|street|room|interior|building|garden|flower|food|apple|tea|cup|object|still life|风景|景色|山|森林|海|天空|日落|日出|城市|街道|房间|室内|建筑|花|食物|苹果|茶|杯|物品|静物/i.test(prompt);
}

export function buildChatImagePrompt({
  prompt,
  speakerName,
  characterTags,
  context = 'wechat',
}: {
  prompt: string;
  speakerName?: string;
  characterTags?: string;
  context?: 'wechat' | 'xiaohongshu' | 'gallery';
}) {
  const cleanPrompt = prompt.trim();
  const nonHuman = isClearlyNonHumanImagePrompt(cleanPrompt);
  const tags = nonHuman ? '' : characterTags?.trim() || '';
  const subject = speakerName?.trim() && !nonHuman
    ? `${speakerName.trim()} wants to share this image, ${cleanPrompt}`
    : cleanPrompt;
  const taggedSubject = [tags, subject].filter(Boolean).join(', ');
  const guardedSubject = nonHuman
    ? `${subject}, scenery or object focused, no people, no person, no human, no character`
    : taggedSubject;
  return buildNovelAiPrompt(guardedSubject, context);
}

export async function requestNaiImage({
  config,
  prompt,
  signal,
  timeoutMs = 45000,
}: {
  config: ImageGenerationConfig;
  prompt: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}) {
  if (config.provider === 'comfyui') {
    return requestComfyImage({ config, prompt, timeoutMs });
  }
  if (config.provider === 'custom') {
    return requestCustomImage({ config, prompt, timeoutMs });
  }

  const apiKey = config.apiKey.trim();
  const baseUrl = config.baseUrl.trim();
  const serverManagedKey = isServerManagedNaiEndpoint(baseUrl);
  if (!apiKey && !serverManagedKey) throw new Error('请先在设置里填写 NAI API key。');
  if (!baseUrl) throw new Error('请先填写 NAI 生图接口地址。');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: buildNaiRequestHeaders(apiKey),
      body: JSON.stringify(buildNaiGenerateImagePayload({ config, prompt })),
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('NAI 请求超时或被取消，请检查网络/代理。');
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`NAI 网络连接失败：${message}。接口：${baseUrl}。请优先使用 /api/nai/generate-image 服务端代理；如果服务器也连不上 NAI，请设置 NAI_HTTPS_PROXY/HTTPS_PROXY 或把 NAI_API_URL 指向可访问 NAI 的中转。`);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  const buffer = await response.arrayBuffer();
  if (!response.ok) {
    const detail = new TextDecoder().decode(buffer.slice(0, 500)).trim();
    throw new Error(buildHttpErrorMessage('NAI 请求失败', {
      status: response.status,
      statusText: response.statusText,
      detail,
    }));
  }

  const imageBytes = await extractImageBytes(buffer);
  return bytesToDataUrl(imageBytes);
}
