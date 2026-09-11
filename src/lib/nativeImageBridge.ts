import { createId } from './utils';
import { shouldUseSameOriginImageProxy } from './imageProxyPolicy';

export const NATIVE_IMAGE_RESPONSE_LIMIT_BYTES = 32 * 1024 * 1024;
export const NATIVE_IMAGE_TIMEOUT_MS = 150000;

export function isNativeImageResponseWithinLimit(bodyBase64: Pick<string, 'length'>) {
  return bodyBase64.length <= Math.ceil(NATIVE_IMAGE_RESPONSE_LIMIT_BYTES * 4 / 3) + 4;
}

type NativeImageResponse = {
  id: string;
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  bodyBase64?: string;
  error?: string;
};

export function canUseNativeImageBridge() {
  return typeof window !== 'undefined'
    && Boolean(window.__SMALL_PHONE_NATIVE__ && window.ReactNativeWebView?.postMessage);
}

function decodeBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function fetchViaNativeImageBridge(input: RequestInfo | URL, init: RequestInit = {}) {
  const bridge = window.ReactNativeWebView;
  if (!bridge?.postMessage) throw new Error('APK 生图网络桥不可用。');
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = String(init.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') throw new Error(`APK 生图网络桥不支持 ${method}。`);
  const id = createId('image-fetch');

  return new Promise<Response>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('small-phone-native-image-response', onResponse as EventListener);
      init.signal?.removeEventListener('abort', onAbort);
    };
    const cancelNative = () => bridge.postMessage(JSON.stringify({ type: 'small-phone-image-cancel', id }));
    const onAbort = () => {
      cancelNative();
      cleanup();
      reject(init.signal?.reason || new DOMException('生图请求已取消。', 'AbortError'));
    };
    const onResponse = (event: CustomEvent<NativeImageResponse>) => {
      const detail = event.detail;
      if (!detail || detail.id !== id) return;
      cleanup();
      if (detail.error) {
        reject(new Error(detail.error));
        return;
      }
      const bodyBase64 = detail.bodyBase64 || '';
      if (!isNativeImageResponseWithinLimit(bodyBase64)) {
        reject(new Error('APK 生图响应超过 32 MiB 限制。'));
        return;
      }
      const bytes = decodeBase64(bodyBase64);
      resolve(new Response(bytes, {
        status: Math.max(200, Number(detail.status || 200)),
        statusText: detail.statusText || '',
        headers: detail.headers || {},
      }));
    };
    const timeout = window.setTimeout(() => {
      cancelNative();
      cleanup();
      reject(new Error('APK 生图网络桥等待超过 150 秒。'));
    }, NATIVE_IMAGE_TIMEOUT_MS + 10000);

    window.addEventListener('small-phone-native-image-response', onResponse as EventListener);
    if (init.signal?.aborted) {
      onAbort();
      return;
    }
    init.signal?.addEventListener('abort', onAbort, { once: true });
    bridge.postMessage(JSON.stringify({
      type: 'small-phone-image-fetch',
      id,
      url,
      init: {
        method,
        headers: init.headers || {},
        body: typeof init.body === 'string' ? init.body : undefined,
      },
      timeoutMs: NATIVE_IMAGE_TIMEOUT_MS,
      maxBytes: NATIVE_IMAGE_RESPONSE_LIMIT_BYTES,
    }));
  });
}

export function fetchImageResource(input: RequestInfo | URL, init: RequestInit = {}) {
  if (canUseNativeImageBridge()) return fetchViaNativeImageBridge(input, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const directFetch = () => fetch(input, init);
  const request = shouldUseSameOriginImageProxy(url)
    ? fetch('/api/image/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          init: {
            method: init.method || 'GET',
            headers: init.headers || {},
            body: typeof init.body === 'string' ? init.body : undefined,
          },
        }),
        signal: init.signal,
      }).then((response) => response.status === 404 ? directFetch() : response)
    : directFetch();
  return request.catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error(`生图网络连接失败或被网页跨域限制：${message}。可改用 APK，或让接口开放 CORS/配置网页图片代理。`);
    }
    throw error;
  });
}
