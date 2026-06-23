import assert from 'node:assert/strict';
import http from 'node:http';

import handler from './generate-image.js';

function createResponseRecorder(resolve) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      resolve({
        statusCode: this.statusCode,
        headers: this.headers,
        json: payload,
      });
    },
    send(buffer) {
      resolve({
        statusCode: this.statusCode,
        headers: this.headers,
        buffer,
      });
    },
  };
}

async function callHandler(body, headers = {}) {
  return new Promise((resolve) => {
    handler({
      method: 'POST',
      headers,
      body,
    }, createResponseRecorder(resolve));
  });
}

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

const originalEnv = { ...process.env };
try {
  const relay = await startRelay();
  try {
    process.env.NAI_TOKEN = 'server-token';
    process.env.NAI_RELAY_URL = relay.url;
    delete process.env.NAI_API_URL;
    delete process.env.NAI_HTTPS_PROXY;

    const payload = { input: 'domestic relay smoke', model: 'nai-diffusion-3' };
    const result = await callHandler(payload);
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers['content-type'], 'image/png');
    assert.deepEqual([...result.buffer], [0x89, 0x50, 0x4e, 0x47]);

    const seenRequest = relay.getSeenRequest();
    assert.equal(seenRequest.method, 'POST');
    assert.equal(seenRequest.url, '/relay/nai');
    assert.equal(seenRequest.headers.authorization, 'Bearer server-token');
    assert.equal(seenRequest.headers.origin, 'https://novelai.net');
    assert.equal(seenRequest.headers.referer, 'https://novelai.net/');
    assert.match(seenRequest.headers.accept, /application\/x-zip-compressed/);
    assert.deepEqual(JSON.parse(seenRequest.body), payload);
  } finally {
    await relay.close();
  }
} finally {
  process.env = originalEnv;
}

console.log('generate-image relay tests passed');
