const crypto = require('crypto');

const windowMs = 48 * 60 * 60 * 1000;
const defaultPort = Number(process.env.COMMUNITY_BACKDOOR_PORT || process.env.PORT || 8787);

function getWindow(now = Date.now()) {
  const index = Math.floor(now / windowMs);
  const startsAt = index * windowMs;
  return { index, startsAt, endsAt: startsAt + windowMs };
}

function getRotatingCode(secret, now = Date.now()) {
  if (!secret) return '';
  const { index } = getWindow(now);
  const digest = crypto.createHmac('sha256', secret).update(`small-phone:${index}`).digest();
  const value = digest.readUInt32BE(0) % 1000000;
  return String(value).padStart(6, '0');
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createApp(options = {}) {
  const express = require('express');
  const app = express();
  const getEnv = (name) => options[name] ?? process.env[name] ?? '';
  const allowedOrigin = getEnv('COMMUNITY_BACKDOOR_ALLOWED_ORIGIN') || '*';

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed' || error instanceof SyntaxError) {
      res.status(400).json({ ok: false, message: 'invalid json' });
      return;
    }
    next(error);
  });

  app.get('/api/community/backdoor/current', (req, res) => {
    const adminToken = getEnv('COMMUNITY_BACKDOOR_ADMIN_TOKEN');
    const authHeader = req.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!adminToken || !timingSafeEqualText(token, adminToken)) {
      res.status(401).json({ ok: false, message: 'unauthorized' });
      return;
    }
    const secret = getEnv('COMMUNITY_BACKDOOR_SECRET');
    const windowInfo = getWindow();
    res.json({
      ok: true,
      code: getRotatingCode(secret),
      startsAt: windowInfo.startsAt,
      expiresAt: windowInfo.endsAt,
    });
  });

  app.post('/api/community/backdoor/verify', (req, res) => {
    const code = String(req.body?.code || '').trim();
    const secret = getEnv('COMMUNITY_BACKDOOR_SECRET');
    const staticCode = getEnv('COMMUNITY_BACKDOOR_STATIC_CODE');
    const windowInfo = getWindow();
    const rotatingCode = getRotatingCode(secret);
    const staticOk = Boolean(staticCode) && timingSafeEqualText(code, staticCode);
    const rotatingOk = Boolean(rotatingCode) && timingSafeEqualText(code, rotatingCode);
    if (!staticOk && !rotatingOk) {
      res.status(401).json({ ok: false, message: '后门通行码不对。' });
      return;
    }
    res.json({
      ok: true,
      mode: staticOk ? 'static' : 'rotating',
      expiresAt: staticOk ? Date.now() + 100 * 365 * 24 * 60 * 60 * 1000 : windowInfo.endsAt,
    });
  });

  return app;
}

if (require.main === module) {
  createApp().listen(defaultPort, () => {
    console.log(`Small phone community backdoor API listening on ${defaultPort}`);
  });
}

module.exports = {
  createApp,
  getRotatingCode,
  getWindow,
  timingSafeEqualText,
};
