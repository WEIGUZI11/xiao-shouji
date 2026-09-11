/**
 * Vite config for the small phone prototype.
 * Functions: defineConfig callback loading env, React plugin, Tailwind plugin, path alias, dev server HMR flag.
 * Dependencies: @vitejs/plugin-react, @tailwindcss/vite, vite loadEnv, Node path.
 * Maintenance note: keep port choices in package scripts/dev commands; this file only defines shared server behavior.
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { isTrustedTtsProxyUrl } from './src/ttsProxyPolicy';
import { isTrustedImageProxyUrl } from './src/lib/imageProxyPolicy';

async function readRequestBody(request: import('node:http').IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || '';
  const trustedTtsProxyHosts = (env.TTS_PROXY_ALLOWED_HOSTS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const trustedImageProxyHosts = (env.IMAGE_PROXY_ALLOWED_HOSTS || '').split(',').map((item) => item.trim()).filter(Boolean);
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'small-phone-tts-proxy',
        configureServer(server) {
          server.middlewares.use('/api/tts/proxy', async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
              response.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            try {
              const payload = JSON.parse(await readRequestBody(request)) as {
                url?: string;
                init?: { method?: string; headers?: Record<string, string>; body?: string };
              };
              const url = payload.url || '';
              if (!isTrustedTtsProxyUrl(url, trustedTtsProxyHosts)) {
                response.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'TTS proxy host is not trusted' }));
                return;
              }
              const method = (payload.init?.method || 'GET').toUpperCase();
              if (!['GET', 'POST'].includes(method)) {
                response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'Unsupported upstream method' }));
                return;
              }
              const upstream = await fetch(url, {
                method,
                headers: payload.init?.headers || {},
                body: payload.init?.body,
                signal: AbortSignal.timeout(45_000),
              });
              const body = Buffer.from(await upstream.arrayBuffer());
              if (body.byteLength > 20 * 1024 * 1024) {
                response.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'TTS response is too large' }));
                return;
              }
              response.writeHead(upstream.status, {
                'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
                'cache-control': 'no-store',
              });
              response.end(body);
            } catch (error) {
              response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'TTS proxy failed' }));
            }
          });
        },
      },
      {
        name: 'small-phone-image-proxy',
        configureServer(server) {
          server.middlewares.use('/api/image/proxy', async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
              response.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            try {
              const payload = JSON.parse(await readRequestBody(request)) as {
                url?: string;
                init?: { method?: string; headers?: Record<string, string>; body?: string };
              };
              const url = payload.url || '';
              if (!isTrustedImageProxyUrl(url, trustedImageProxyHosts)) {
                response.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'Image proxy host is not trusted' }));
                return;
              }
              const method = (payload.init?.method || 'GET').toUpperCase();
              if (!['GET', 'POST'].includes(method)) {
                response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'Unsupported upstream method' }));
                return;
              }
              const upstream = await fetch(url, {
                method,
                headers: payload.init?.headers || {},
                body: method === 'POST' ? payload.init?.body : undefined,
                signal: AbortSignal.timeout(150_000),
              });
              const body = Buffer.from(await upstream.arrayBuffer());
              if (body.byteLength > 32 * 1024 * 1024) {
                response.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'Image response is too large' }));
                return;
              }
              response.writeHead(upstream.status, {
                'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
                'cache-control': 'no-store',
              });
              response.end(body);
            } catch (error) {
              response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Image proxy failed' }));
            }
          });
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      ...(apiProxyTarget ? { proxy: { '/api': { target: apiProxyTarget, changeOrigin: true } } } : {}),
    },
  };
});
