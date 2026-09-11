const defaultTrustedHosts = [
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.minimax.io',
  'api.minimaxi.com',
  'openspeech.bytedance.com',
  'voice.ap-southeast-1.bytepluses.com',
];

function isTrustedUrl(value) {
  try {
    const target = new URL(value);
    const extraHosts = String(process.env.TTS_PROXY_ALLOWED_HOSTS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    const hostname = target.hostname.toLowerCase();
    return target.protocol === 'https:' && !target.username && !target.password
      && [...defaultTrustedHosts, ...extraHosts].some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const url = payload.url || '';
    if (!isTrustedUrl(url)) {
      res.status(403).json({ error: 'TTS proxy host is not trusted' });
      return;
    }
    const method = String(payload.init?.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) {
      res.status(405).json({ error: 'Unsupported upstream method' });
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
      res.status(413).json({ error: 'TTS response is too large' });
      return;
    }
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('cache-control', 'no-store');
    res.send(body);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'TTS proxy failed' });
  }
}
