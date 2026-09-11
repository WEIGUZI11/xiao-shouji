const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

async function startRelay() {
  let seenRequest = null;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      seenRequest = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      };
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/relay/nai`,
    getSeenRequest: () => seenRequest,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function startProxy(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

(async () => {
  const originalEnv = { ...process.env };
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'small-phone-reminders-'));
  const tempStorePath = path.join(tempDir, 'proactive-reminders.json');
  const relay = await startRelay();
  const sentPushes = [];
  const fixedNow = new Date('2026-06-21T20:31:00+08:00').getTime();
  let proxy;
  try {
    process.env.NAI_TOKEN = 'server-token';
    process.env.NAI_RELAY_URL = relay.url;
    process.env.NAI_ALLOWED_ORIGIN = 'https://phone.example.com';
    process.env.PROACTIVE_REMINDER_STORE_PATH = tempStorePath;
    delete process.env.NAI_API_URL;
    delete process.env.NAI_HTTPS_PROXY;

    const { createNaiProxyApp, isTrustedImageProxyUrl } = require('./nai-proxy.cjs');
    assert.equal(isTrustedImageProxyUrl('https://api.openai.com/v1/images/generations'), true);
    assert.equal(isTrustedImageProxyUrl('https://api.openai.com.evil.example/v1/images/generations'), false);
    assert.equal(isTrustedImageProxyUrl('http://api.openai.com/v1/images/generations'), false);
    proxy = await startProxy(createNaiProxyApp({
      nowProvider: () => fixedNow,
      pushSender: async (messages) => {
        sentPushes.push(messages);
        return messages.map(() => ({ status: 'ok' }));
      },
    }));

    const response = await fetch(`${proxy.url}/api/nai/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'domestic proxy test', model: 'nai-diffusion-3' }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://phone.example.com');
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual([...bytes], [0x89, 0x50, 0x4e, 0x47]);

    const seenRequest = relay.getSeenRequest();
    assert.equal(seenRequest.headers.authorization, 'Bearer server-token');
    assert.equal(JSON.parse(seenRequest.body).input, 'domestic proxy test');

    const ttsProxyResponse = await fetch(`${proxy.url}/api/tts/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: relay.url,
        init: {
          method: 'POST',
          headers: { Authorization: 'Bearer tts-token', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'doubao proxy smoke' }),
        },
      }),
    });
    const ttsProxyBytes = new Uint8Array(await ttsProxyResponse.arrayBuffer());
    assert.equal(ttsProxyResponse.status, 200);
    assert.equal(ttsProxyResponse.headers.get('content-type'), 'image/png');
    assert.deepEqual([...ttsProxyBytes], [0x89, 0x50, 0x4e, 0x47]);
    const seenTtsRequest = relay.getSeenRequest();
    assert.equal(seenTtsRequest.headers.authorization, 'Bearer tts-token');
    assert.equal(JSON.parse(seenTtsRequest.body).text, 'doubao proxy smoke');

    const invalidTtsProxyResponse = await fetch(`${proxy.url}/api/tts/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '/relative/tts' }),
    });
    assert.equal(invalidTtsProxyResponse.status, 400);
    assert.deepEqual(await invalidTtsProxyResponse.json(), { error: 'Invalid TTS proxy URL' });

    const untrustedImageProxyResponse = await fetch(`${proxy.url}/api/image/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: relay.url, init: { method: 'POST', body: '{}' } }),
    });
    assert.equal(untrustedImageProxyResponse.status, 403);
    assert.deepEqual(await untrustedImageProxyResponse.json(), { error: 'Image proxy host is not trusted' });

    const deviceResponse = await fetch(`${proxy.url}/api/proactive-reminders/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'client-api-1',
        pushToken: 'ExponentPushToken[test-device]',
        platform: 'android',
      }),
    });
    const deviceJson = await deviceResponse.json();
    assert.equal(deviceJson.ok, true);
    assert.equal(deviceJson.device.clientId, 'client-api-1');

    const reminderResponse = await fetch(`${proxy.url}/api/proactive-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'client-api-1',
        calendarEventId: 'calendar-api-1',
        characterId: 'char-api-1',
        characterName: 'Lin',
        channel: 'wechat',
        title: 'Daily 20:31 reminder: drink water',
        task: 'drink water',
        hour: 20,
        minute: 31,
        timeZone: 'Asia/Shanghai',
      }),
    });
    const reminderJson = await reminderResponse.json();
    assert.equal(reminderJson.ok, true);

    const outboxResponse = await fetch(`${proxy.url}/api/proactive-reminders/outbox?clientId=client-api-1`);
    const outboxJson = await outboxResponse.json();
    assert.equal(outboxJson.ok, true);
    assert.equal(outboxJson.items.length, 1);
    assert.equal(outboxJson.items[0].clientId, 'client-api-1');
    assert.equal(sentPushes.length, 1);
    assert.equal(sentPushes[0][0].to, 'ExponentPushToken[test-device]');
    assert.equal(sentPushes[0][0].title, 'Small Phone reminder');
    assert.match(sentPushes[0][0].body, /drink water/);

    const healthResponse = await fetch(`${proxy.url}/api/proactive-reminders/health`);
    const healthJson = await healthResponse.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.reminders, 1);
    assert.equal(healthJson.devices, 1);

    const invalidJsonResponse = await fetch(`${proxy.url}/api/proactive-reminders/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(invalidJsonResponse.status, 400);
    assert.equal(invalidJsonResponse.headers.get('access-control-allow-origin'), 'https://phone.example.com');
    assert.deepEqual(await invalidJsonResponse.json(), { ok: false, message: 'invalid json' });
  } finally {
    if (proxy) await proxy.close();
    await relay.close();
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log('nai proxy server tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
