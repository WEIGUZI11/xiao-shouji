const defaultTrustedHosts = ['api.openai.com', 'image.novelai.net'];
const maxResponseBytes = 32 * 1024 * 1024;

function isTrustedUrl(value) {
  try {
    const target = new URL(value);
    const extraHosts = String(process.env.IMAGE_PROXY_ALLOWED_HOSTS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
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
    if (!isTrustedUrl(payload.url || '')) {
      res.status(403).json({ error: 'Image proxy host is not trusted' });
      return;
    }
    const method = String(payload.init?.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) {
      res.status(405).json({ error: 'Unsupported upstream method' });
      return;
    }
    const upstream = await fetch(payload.url, {
      method,
      headers: payload.init?.headers || {},
      body: method === 'POST' ? payload.init?.body : undefined,
      signal: AbortSignal.timeout(150000),
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.byteLength > maxResponseBytes) {
      res.status(413).json({ error: 'Image response is too large' });
      return;
    }
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('cache-control', 'no-store');
    res.send(body);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Image proxy failed' });
  }
}
