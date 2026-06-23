import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { execFileSync } from 'node:child_process';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function getProxyUrl() {
  return (
    process.env.NAI_HTTPS_PROXY
    || process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.ALL_PROXY
    || process.env.all_proxy
    || getWindowsUserProxyUrl()
    || ''
  ).trim();
}

function getWindowsUserProxyUrl() {
  if (process.platform !== 'win32') return '';
  try {
    const output = execFileSync('reg', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      '/v',
      'ProxyEnable',
    ], { encoding: 'utf8', windowsHide: true });
    if (!/\b0x1\b/i.test(output)) return '';
    const serverOutput = execFileSync('reg', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      '/v',
      'ProxyServer',
    ], { encoding: 'utf8', windowsHide: true });
    const match = serverOutput.match(/ProxyServer\s+REG_SZ\s+(.+)\s*$/im);
    const raw = match?.[1]?.trim() || '';
    if (!raw) return '';
    const httpsMatch = raw.match(/(?:^|;)https=([^;]+)/i);
    const httpMatch = raw.match(/(?:^|;)http=([^;]+)/i);
    const proxy = (httpsMatch?.[1] || httpMatch?.[1] || raw.split(';')[0]).trim();
    if (!proxy) return '';
    return /^https?:\/\//i.test(proxy) ? proxy : `http://${proxy}`;
  } catch {
    return '';
  }
}

function createHttpsProxyAgent(proxyUrl) {
  const proxy = new URL(proxyUrl);
  const proxyIsHttps = proxy.protocol === 'https:';
  const proxyRequest = proxyIsHttps ? https.request : http.request;
  return new class HttpsConnectProxyAgent extends https.Agent {
    createConnection(options, callback) {
      const targetHost = String(options.host || options.hostname || '');
      const targetPort = Number(options.port || 443);
      const auth = proxy.username || proxy.password
        ? `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`
        : '';
      const connectRequest = proxyRequest({
        host: proxy.hostname,
        port: Number(proxy.port || (proxyIsHttps ? 443 : 80)),
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        headers: {
          Host: `${targetHost}:${targetPort}`,
          ...(auth ? { 'Proxy-Authorization': `Basic ${Buffer.from(auth).toString('base64')}` } : {}),
        },
      });
      connectRequest.once('connect', (response, socket) => {
        if (response.statusCode !== 200) {
          socket.destroy();
          callback(new Error(`proxy CONNECT failed with HTTP ${response.statusCode || 0}`));
          return;
        }
        const tlsSocket = tls.connect({
          socket,
          servername: String(options.servername || targetHost),
        });
        tlsSocket.once('secureConnect', () => callback(null, tlsSocket));
        tlsSocket.once('error', callback);
      });
      connectRequest.once('error', callback);
      connectRequest.end();
    }
  }();
}

async function postUpstream(upstreamUrl, headers, body, timeoutMs) {
  const proxyUrl = getProxyUrl();
  const upstream = new URL(upstreamUrl);
  if (proxyUrl && upstream.protocol === 'https:') {
    return postUpstreamWithHttps(upstream, headers, body, timeoutMs, createHttpsProxyAgent(proxyUrl));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body,
    });
    return {
      status: response.status,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      disposition: response.headers.get('content-disposition') || '',
      buffer: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timer);
  }
}

function postUpstreamWithHttps(upstream, headers, body, timeoutMs, agent) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || 443,
      path: `${upstream.pathname}${upstream.search}`,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
      agent,
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.once('end', () => {
        resolve({
          status: response.statusCode || 502,
          contentType: response.headers['content-type'] || 'application/octet-stream',
          disposition: response.headers['content-disposition'] || '',
          buffer: Buffer.concat(chunks),
        });
      });
    });
    request.once('timeout', () => request.destroy(new Error('NAI upstream request timeout')));
    request.once('error', reject);
    request.end(body);
  });
}

function getNetworkErrorPayload(error, upstreamUrl) {
  let upstreamHost = '';
  try {
    upstreamHost = new URL(upstreamUrl).host;
  } catch {
    upstreamHost = upstreamUrl;
  }
  const code = error?.cause?.code || error?.code || '';
  const detail = error?.cause?.message || error?.message || String(error);
  return {
    ok: false,
    message: code ? `NAI upstream network error: ${code}` : 'NAI upstream network error',
    detail,
    upstreamHost,
    proxy: getProxyUrl() ? 'enabled' : 'disabled',
    hint: 'Current server cannot reach NovelAI. Set NAI_HTTPS_PROXY/HTTPS_PROXY, or point NAI_API_URL to a relay that can access NovelAI.',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NAI_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'method not allowed' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    res.status(400).json({ ok: false, message: 'invalid json' });
    return;
  }

  const clientAuth = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  const serverKey = (process.env.NAI_TOKEN || process.env.NAI_API_KEY || process.env.NOVELAI_API_KEY || '').trim();
  const authorization = clientAuth || (serverKey ? `Bearer ${serverKey}` : '');
  if (!authorization) {
    res.status(500).json({ ok: false, message: 'NAI_TOKEN is not configured' });
    return;
  }

  const upstreamUrl = process.env.NAI_RELAY_URL || process.env.NAI_API_URL || 'https://image.novelai.net/ai/generate-image';
  const timeoutMs = Math.max(5_000, Number(process.env.NAI_TIMEOUT_MS || 45_000));
  let upstream;
  try {
    upstream = await postUpstream(upstreamUrl, {
      Authorization: authorization,
      'User-Agent': 'Mozilla/5.0',
      Origin: 'https://novelai.net',
      Referer: 'https://novelai.net/',
      'Content-Type': 'application/json',
      Accept: 'application/x-zip-compressed, application/json',
    }, JSON.stringify(body), timeoutMs);
  } catch (error) {
    res.status(502).json(getNetworkErrorPayload(error, upstreamUrl));
    return;
  }

  res.status(upstream.status);
  res.setHeader('Content-Type', upstream.contentType);
  if (upstream.disposition) res.setHeader('Content-Disposition', upstream.disposition);
  res.send(upstream.buffer);
}
