import assert from 'node:assert/strict';
import {
  buildNaiRequestHeaders,
  buildNaiGenerateImagePayload,
  buildComfyTextToImagePrompt,
  buildCustomImageRequest,
  buildChatImagePrompt,
  buildNovelAiPrompt,
  defaultImageGenerationConfig,
  evaluateImageGenerationGate,
  fetchImageGenerationModels,
  getDefaultNaiProxyUrl,
  hashPrompt,
  isServerManagedNaiEndpoint,
} from './naiImage';

assert.equal(isServerManagedNaiEndpoint('/api/nai/generate-image'), true);
assert.equal(isServerManagedNaiEndpoint('https://example.com/api/nai/generate-image'), true);
assert.equal(isServerManagedNaiEndpoint('https://image.novelai.net/ai/generate-image'), false);
assert.equal(getDefaultNaiProxyUrl(''), '/api/nai/generate-image');
assert.equal(getDefaultNaiProxyUrl(' https://img.example.com/api/nai/generate-image '), 'https://img.example.com/api/nai/generate-image');
assert.match(defaultImageGenerationConfig.baseUrl, /generate-image/);
assert.match(buildNovelAiPrompt('窗边热茶', 'wechat'), /casual mobile chat image/);
assert.equal(hashPrompt('  窗边热茶  '), hashPrompt('窗边热茶'));

const sceneryChatPrompt = buildChatImagePrompt({
  prompt: 'draw a quiet mountain landscape at sunset',
  speakerName: 'Alice',
  context: 'wechat',
});
assert.doesNotMatch(sceneryChatPrompt, /Alice/);
assert.match(sceneryChatPrompt, /no people/);
const characterChatPrompt = buildChatImagePrompt({
  prompt: 'draw a portrait selfie in a cafe',
  speakerName: 'Alice',
  characterTags: 'silver hair, blue eyes, star earrings',
  context: 'wechat',
});
assert.match(characterChatPrompt, /Alice wants to share/);
assert.match(characterChatPrompt, /silver hair/);
const sceneryWithCharacterTagsPrompt = buildChatImagePrompt({
  prompt: 'draw a quiet mountain landscape at sunset',
  speakerName: 'Alice',
  characterTags: 'silver hair, blue eyes, star earrings',
  context: 'wechat',
});
assert.doesNotMatch(sceneryWithCharacterTagsPrompt, /silver hair/);

const headers = buildNaiRequestHeaders('token-1');
assert.equal(headers.Authorization, 'Bearer token-1');
assert.equal(headers['User-Agent'], 'Mozilla/5.0');
assert.equal(headers.Origin, 'https://novelai.net');
assert.equal(headers.Referer, 'https://novelai.net/');
assert.equal(headers.Accept, 'application/x-zip-compressed, application/json');

const payload = buildNaiGenerateImagePayload({
  config: {
    ...defaultImageGenerationConfig,
    model: 'nai-diffusion-3',
    width: 512,
    height: 512,
    steps: 6,
    scale: 5,
    sampler: 'k_euler_ancestral',
    promptPreset: 'best quality',
    promptExtra: 'soft watercolor lighting',
    negativePrompt: 'lowres',
  },
  prompt: 'red apple on white background',
  seed: 123,
});
assert.equal(payload.action, 'generate');
assert.equal(payload.model, 'nai-diffusion-3');
assert.match(payload.input, /^best quality, soft watercolor lighting, red apple on white background/);
assert.equal(payload.parameters.width, 512);
assert.equal(payload.parameters.height, 512);
assert.equal(payload.parameters.steps, 6);
assert.equal(payload.parameters.scale, 5);
assert.equal(payload.parameters.sampler, 'k_euler_ancestral');
assert.equal(payload.parameters.seed, 123);
assert.equal(payload.parameters.n_samples, 1);
assert.equal(payload.parameters.negative_prompt, 'lowres');
assert.equal(payload.parameters.params_version, 3);
assert.equal(payload.parameters.prefer_brownian, true);
assert.equal(payload.parameters.deliberate_euler_ancestral_bug, false);
assert.equal(payload.parameters.add_original_image, false);
assert.equal(payload.parameters.noise_schedule, 'native');
assert.equal(payload.parameters.v4_prompt, undefined);

const v45Payload = buildNaiGenerateImagePayload({
  config: {
    ...defaultImageGenerationConfig,
    model: 'nai-diffusion-4-5-full',
    promptPreset: 'cinematic light',
    negativePrompt: 'bad anatomy',
  },
  prompt: 'tea cup beside a window',
  seed: 456,
});
assert.equal(v45Payload.model, 'nai-diffusion-4-5-full');
assert.match(v45Payload.input, /very aesthetic/);
assert.equal(v45Payload.parameters.add_original_image, true);
assert.equal(v45Payload.parameters.noise_schedule, 'karras');
assert.equal(v45Payload.parameters.negative_prompt, 'bad anatomy');
assert.equal(v45Payload.parameters.v4_prompt?.caption.base_caption, v45Payload.input);
assert.equal(v45Payload.parameters.v4_negative_prompt?.caption.base_caption, 'bad anatomy');
assert.deepEqual(v45Payload.parameters.characterPrompts, []);
assert.equal(v45Payload.parameters.skip_cfg_above_sigma, null);

const naiModels = await fetchImageGenerationModels({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'novelai',
  },
});
assert.ok(naiModels.includes('nai-diffusion-4-5-full'));
assert.ok(naiModels.includes('nai-diffusion-furry-3'));

const comfyRequests: string[] = [];
const comfyModels = await fetchImageGenerationModels({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'comfyui',
    baseUrl: 'http://127.0.0.1:8188',
  },
  fetchImpl: async (url) => {
    comfyRequests.push(String(url));
    return new Response(JSON.stringify({
      CheckpointLoaderSimple: {
        input: {
          required: {
            ckpt_name: [['animeA.safetensors', 'realisticB.ckpt']],
          },
        },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.deepEqual(comfyModels, ['animeA.safetensors', 'realisticB.ckpt']);
assert.equal(comfyRequests[0], 'http://127.0.0.1:8188/object_info/CheckpointLoaderSimple');

const customModels = await fetchImageGenerationModels({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    baseUrl: 'https://image.example.com/v1/images/generations',
    apiKey: 'custom-key',
  },
  fetchImpl: async (url, init) => {
    assert.equal(String(url), 'https://image.example.com/v1/models');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer custom-key');
    return new Response(JSON.stringify({ data: [{ id: 'image-model-a' }, { id: 'image-model-b' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
assert.deepEqual(customModels, ['image-model-a', 'image-model-b']);

const customNaiModels = await fetchImageGenerationModels({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    customFormat: 'nai',
    baseUrl: 'https://relay.example.com/novelai/generate-image',
  },
  fetchImpl: async () => {
    throw new Error('NAI-compatible custom relay should use the built-in NAI model list.');
  },
});
assert.ok(customNaiModels.includes('nai-diffusion-4-5-full'));

const customNaiRequest = buildCustomImageRequest({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    customFormat: 'nai',
    apiKey: 'relay-token',
    model: 'nai-diffusion-4-5-full',
    promptPreset: 'artist: test painter, best quality',
    promptExtra: 'cinematic still life',
    negativePrompt: 'bad anatomy',
  },
  prompt: 'red apple on white background',
  seed: 222,
});
assert.equal(customNaiRequest.responseKind, 'nai-binary');
assert.equal(customNaiRequest.headers.Authorization, 'Bearer relay-token');
assert.equal(customNaiRequest.headers.Accept, 'application/x-zip-compressed, application/json');
assert.equal(customNaiRequest.body.model, 'nai-diffusion-4-5-full');
assert.match(customNaiRequest.body.input, /artist: test painter/);
assert.match(customNaiRequest.body.input, /cinematic still life/);
assert.match(customNaiRequest.body.input, /red apple on white background/);
assert.equal(customNaiRequest.body.parameters.v4_prompt?.caption.base_caption, customNaiRequest.body.input);

const customOpenAiRequest = buildCustomImageRequest({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    customFormat: 'openai-images',
    apiKey: 'image-key',
    model: 'image-model-a',
  },
  prompt: 'red apple on white background',
});
assert.equal(customOpenAiRequest.responseKind, 'openai-json');
assert.equal(customOpenAiRequest.headers.Authorization, 'Bearer image-key');
assert.deepEqual(customOpenAiRequest.body.size, '512x512');

const customMjRequest = buildCustomImageRequest({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    baseUrl: 'https://relay.example.com/mj/submit/imagine',
    apiKey: 'mj-key',
    model: 'midjourney',
    promptPreset: 'artist: test painter',
    promptExtra: 'flat lay composition',
  },
  prompt: 'red apple on white background',
});
assert.equal(customMjRequest.responseKind, 'mj-task-json');
assert.equal(customMjRequest.headers.Authorization, 'Bearer mj-key');
assert.deepEqual(customMjRequest.body, {
  prompt: 'artist: test painter, flat lay composition, red apple on white background',
  base64Array: [],
});

const customGenericRequest = buildCustomImageRequest({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'custom',
    customFormat: 'generic-json',
    apiKey: 'generic-key',
    model: 'anything-v1',
    width: 640,
    height: 768,
    promptPreset: 'artist: test painter',
    promptExtra: 'soft rim light',
    negativePrompt: 'bad anatomy',
    customPayloadTemplate: '{"model":"{{model}}","prompt":"{{prompt}}","negative":"{{negative_prompt}}","size":"{{width}}x{{height}}"}',
  },
  prompt: 'red apple on white background',
});
assert.equal(customGenericRequest.responseKind, 'generic-json');
assert.deepEqual(customGenericRequest.body, {
  model: 'anything-v1',
  prompt: 'artist: test painter, soft rim light, red apple on white background',
  negative: 'bad anatomy',
  size: '640x768',
});

const comfyPrompt = buildComfyTextToImagePrompt({
  config: {
    ...defaultImageGenerationConfig,
    provider: 'comfyui',
    model: 'animeA.safetensors',
    width: 640,
    height: 768,
    steps: 12,
    scale: 6,
    sampler: 'k_euler_ancestral',
    promptExtra: 'rainy evening atmosphere',
    negativePrompt: 'bad hands',
  },
  prompt: 'girl holding an umbrella',
  seed: 789,
});
assert.equal(comfyPrompt['1'].class_type, 'CheckpointLoaderSimple');
assert.equal(comfyPrompt['1'].inputs.ckpt_name, 'animeA.safetensors');
assert.equal(comfyPrompt['4'].inputs.width, 640);
assert.equal(comfyPrompt['4'].inputs.height, 768);
assert.equal(comfyPrompt['5'].inputs.sampler_name, 'euler_ancestral');
assert.equal(comfyPrompt['5'].inputs.seed, 789);
assert.match(String(comfyPrompt['2'].inputs.text), /girl holding an umbrella/);
assert.match(String(comfyPrompt['2'].inputs.text), /rainy evening atmosphere/);
assert.equal(comfyPrompt['3'].inputs.text, 'bad hands');

const now = 1710000000000;
const gate = evaluateImageGenerationGate({
  now,
  characterId: 'char-1',
  channelId: 'wechat:char-1',
  userId: 'user-1',
  prompt: '窗边热茶',
  triggerType: 'proactive',
  records: [
    {
      imageId: 'img-1',
      botId: 'wechat',
      characterId: 'char-1',
      guildId: 'local',
      channelId: 'wechat:char-1',
      userId: 'user-1',
      triggerType: 'proactive',
      promptHash: hashPrompt('窗边热茶'),
      storageUrl: 'data:image/png;base64,old',
      createdAt: now - 30_000,
      width: 512,
      height: 512,
      model: 'nai-diffusion-3',
      status: 'success',
    },
  ],
});
assert.equal(gate.allowed, false);
assert.equal(gate.reason, 'duplicate_prompt');

console.log('naiImage tests passed');
