import assert from 'node:assert/strict';

import {
  NATIVE_IMAGE_RESPONSE_LIMIT_BYTES,
  NATIVE_IMAGE_TIMEOUT_MS,
  fetchImageResource,
  isNativeImageResponseWithinLimit,
} from './nativeImageBridge';

type PostedMessage = { type: string; id: string; [key: string]: unknown };

class FakeNativeWindow extends EventTarget {
  __SMALL_PHONE_NATIVE__ = true;
  messages: PostedMessage[] = [];
  ReactNativeWebView = {
    postMessage: (value: string) => {
      this.messages.push(JSON.parse(value) as PostedMessage);
    },
  };
  atob(value: string) {
    return Buffer.from(value, 'base64').toString('binary');
  }
  setTimeout = globalThis.setTimeout.bind(globalThis);
  clearTimeout = globalThis.clearTimeout.bind(globalThis);
}

const fakeWindow = new FakeNativeWindow();
Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });

function respond(id: string, detail: Record<string, unknown>) {
  const event = new Event('small-phone-native-image-response');
  Object.defineProperty(event, 'detail', { value: { id, ...detail } });
  fakeWindow.dispatchEvent(event);
}

const successPromise = fetchImageResource('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { Authorization: 'Bearer secret' },
  body: '{}',
});
const successRequest = fakeWindow.messages.at(-1)!;
assert.equal(successRequest.type, 'small-phone-image-fetch');
assert.equal(successRequest.timeoutMs, NATIVE_IMAGE_TIMEOUT_MS);
assert.equal(successRequest.maxBytes, NATIVE_IMAGE_RESPONSE_LIMIT_BYTES);
respond(successRequest.id, {
  status: 201,
  headers: { 'content-type': 'text/plain' },
  bodyBase64: Buffer.from('image-ok').toString('base64'),
});
const successResponse = await successPromise;
assert.equal(successResponse.status, 201);
assert.equal(await successResponse.text(), 'image-ok');

const httpErrorPromise = fetchImageResource('https://api.openai.com/v1/models');
const httpErrorRequest = fakeWindow.messages.at(-1)!;
respond(httpErrorRequest.id, { status: 401, bodyBase64: Buffer.from('unauthorized').toString('base64') });
assert.equal((await httpErrorPromise).status, 401);

const controller = new AbortController();
const cancelledPromise = fetchImageResource('https://api.openai.com/v1/models', { signal: controller.signal });
const cancelledRequest = fakeWindow.messages.at(-1)!;
controller.abort(new DOMException('cancelled', 'AbortError'));
await assert.rejects(cancelledPromise, /cancelled/);
assert(fakeWindow.messages.some((message) => message.type === 'small-phone-image-cancel' && message.id === cancelledRequest.id));

await assert.rejects(
  fetchImageResource('https://api.openai.com/v1/models', { method: 'DELETE' }),
  /不支持 DELETE/,
);
assert.equal(isNativeImageResponseWithinLimit({ length: Math.ceil(NATIVE_IMAGE_RESPONSE_LIMIT_BYTES * 4 / 3) + 4 }), true);
assert.equal(isNativeImageResponseWithinLimit({ length: Math.ceil(NATIVE_IMAGE_RESPONSE_LIMIT_BYTES * 4 / 3) + 5 }), false);

fakeWindow.__SMALL_PHONE_NATIVE__ = false;
const originalFetch = globalThis.fetch;
const webRequests: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  webRequests.push(String(input));
  return new Response('proxied-image', { status: 200 });
}) as typeof fetch;
const proxiedResponse = await fetchImageResource('https://api.openai.com/v1/images/generations', { method: 'POST', body: '{}' });
assert.equal(await proxiedResponse.text(), 'proxied-image');
assert.deepEqual(webRequests, ['/api/image/proxy']);

webRequests.length = 0;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  webRequests.push(String(input));
  return String(input) === '/api/image/proxy'
    ? new Response('', { status: 404 })
    : new Response('direct-image', { status: 200 });
}) as typeof fetch;
assert.equal(await (await fetchImageResource('https://api.openai.com/v1/images/generations')).text(), 'direct-image');
assert.deepEqual(webRequests, ['/api/image/proxy', 'https://api.openai.com/v1/images/generations']);

globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
await assert.rejects(fetchImageResource('https://community.example/generate'), /跨域限制/);
globalThis.fetch = originalFetch;

console.log('native image bridge tests passed');
