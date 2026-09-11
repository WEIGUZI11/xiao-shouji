const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp, getRotatingCode } = require('./community-backdoor.cjs');

async function startServer(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

(async () => {
  const server = await startServer(createApp({
    COMMUNITY_BACKDOOR_ALLOWED_ORIGIN: 'https://phone.example.com',
    COMMUNITY_BACKDOOR_ADMIN_TOKEN: 'admin-token',
    COMMUNITY_BACKDOOR_SECRET: 'secret',
    COMMUNITY_BACKDOOR_STATIC_CODE: '246810',
  }));

  try {
    const unauthorizedCurrent = await fetch(`${server.url}/api/community/backdoor/current`);
    assert.equal(unauthorizedCurrent.status, 401);
    assert.equal(unauthorizedCurrent.headers.get('access-control-allow-origin'), 'https://phone.example.com');
    assert.deepEqual(await unauthorizedCurrent.json(), { ok: false, message: 'unauthorized' });

    const current = await fetch(`${server.url}/api/community/backdoor/current`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    const currentJson = await current.json();
    assert.equal(current.status, 200);
    assert.equal(currentJson.ok, true);
    assert.equal(currentJson.code, getRotatingCode('secret'));

    const invalidJson = await fetch(`${server.url}/api/community/backdoor/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.headers.get('access-control-allow-origin'), 'https://phone.example.com');
    assert.deepEqual(await invalidJson.json(), { ok: false, message: 'invalid json' });

    const wrongCode = await fetch(`${server.url}/api/community/backdoor/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'wrong' }),
    });
    assert.equal(wrongCode.status, 401);
    assert.deepEqual(await wrongCode.json(), { ok: false, message: '后门通行码不对。' });

    const staticCode = await fetch(`${server.url}/api/community/backdoor/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '246810' }),
    });
    const staticJson = await staticCode.json();
    assert.equal(staticCode.status, 200);
    assert.equal(staticJson.ok, true);
    assert.equal(staticJson.mode, 'static');
  } finally {
    await server.close();
  }

  console.log('community backdoor backend ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
