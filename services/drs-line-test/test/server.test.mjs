import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { readRawBody } from '../src/body-reader.mjs';

async function requireExports(...names) {
  const subject = await import('../src/server.mjs').catch(() => ({}));
  for (const name of names) {
    assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  }
  return subject;
}

async function withServer(server, callback) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`, { port });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function collectRawResponseUntilServerClose(port, requestBytes, { timeoutMs = 1_000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const chunks = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error('server connection lingered instead of closing'));
    }, timeoutMs);

    socket.on('connect', () => socket.write(requestBytes));
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    socket.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('latin1'));
    });
  });
}

function createFakeResponse() {
  const headers = new Map();
  return {
    statusCode: undefined,
    endCount: 0,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end() { this.endCount += 1; },
  };
}

test('GET /health returns the transport-only health contract without configuration leakage', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  const server = createDrsLineServer({
    webhookHandler: async () => ({ status: 200 }),
  });

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true, service: 'drs-line-test', mode: 'transport_only' });
    assert.equal(JSON.stringify(body).includes('secret'), false);
    assert.equal(JSON.stringify(body).includes('token'), false);
  });
});

test('unknown route returns 404 and disallowed methods return 405 with Allow', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  const server = createDrsLineServer({ webhookHandler: async () => ({ status: 200 }) });

  await withServer(server, async (baseUrl) => {
    const unknown = await fetch(`${baseUrl}/unknown`);
    const healthMethod = await fetch(`${baseUrl}/health`, { method: 'POST' });
    const webhookMethod = await fetch(`${baseUrl}/line/webhook`);

    assert.equal(unknown.status, 404);
    assert.equal(healthMethod.status, 405);
    assert.equal(healthMethod.headers.get('allow'), 'GET');
    assert.equal(webhookMethod.status, 405);
    assert.equal(webhookMethod.headers.get('allow'), 'POST');
  });
});

test('webhook rejects non-JSON content before reading its body', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  let bodyRead = false;
  const server = createDrsLineServer({
    webhookHandler: async () => ({ status: 200 }),
    readBody: async () => { bodyRead = true; return Buffer.alloc(0); },
  });

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/line/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'test',
    });

    assert.equal(response.status, 415);
    assert.equal(bodyRead, false);
  });
});

test('webhook passes raw bytes and signature to the handler', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  let captured;
  const rawBody = Buffer.from('{"events":[]}', 'utf8');
  const server = createDrsLineServer({
    readBody: async () => rawBody,
    webhookHandler: async (input) => {
      captured = input;
      return { status: 200 };
    },
    requestIdFactory: () => 'request-1',
  });

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/line/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-line-signature': 'test-signature',
      },
      body: rawBody,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(captured.rawBody, rawBody);
    assert.equal(captured.signature, 'test-signature');
    assert.equal(captured.requestId, 'request-1');
  });
});

test('server maps body limit and timeout errors to their HTTP status', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  let status = 413;
  const server = createDrsLineServer({
    readBody: async () => { const error = new Error('body rejected'); error.httpStatus = status; throw error; },
    webhookHandler: async () => ({ status: 200 }),
  });

  await withServer(server, async (baseUrl) => {
    const request = () => fetch(`${baseUrl}/line/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    assert.equal((await request()).status, 413);
    status = 408;
    assert.equal((await request()).status, 408);
  });
});

test('malformed request-target returns controlled 400 and the request listener fulfills', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  let requestListener;
  createDrsLineServer({
    webhookHandler: async () => ({ status: 200 }),
    createServerImpl(listener) {
      requestListener = listener;
      return {};
    },
  });
  const response = createFakeResponse();

  await assert.doesNotReject(() => requestListener({
    url: 'http://[',
    method: 'GET',
    headers: {},
  }, response));

  assert.equal(response.statusCode, 400);
  assert.equal(response.endCount, 1);
});

test('real oversized request receives 413 and the server closes the socket', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  const server = createDrsLineServer({
    readBody: (request) => readRawBody(request, { maxBytes: 16, timeoutMs: 500 }),
    webhookHandler: async () => ({ status: 200 }),
  });

  await withServer(server, async (_baseUrl, { port }) => {
    const request = Buffer.from([
      'POST /line/webhook HTTP/1.1',
      'Host: 127.0.0.1',
      'Content-Type: application/json',
      'Content-Length: 17',
      'Connection: keep-alive',
      '',
      '12345678901234567',
    ].join('\r\n'), 'latin1');
    const response = await collectRawResponseUntilServerClose(port, request);

    assert.match(response, /^HTTP\/1\.1 413 /);
    assert.match(response, /\r\nConnection: close\r\n/i);
    assert.equal((response.match(/^HTTP\/1\.1 /gm) ?? []).length, 1);
  });
});

test('real incomplete request receives 408 and the server closes the socket', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  const server = createDrsLineServer({
    readBody: (request) => readRawBody(request, { maxBytes: 16, timeoutMs: 30 }),
    webhookHandler: async () => ({ status: 200 }),
  });

  await withServer(server, async (_baseUrl, { port }) => {
    const request = Buffer.from([
      'POST /line/webhook HTTP/1.1',
      'Host: 127.0.0.1',
      'Content-Type: application/json',
      'Content-Length: 1',
      'Connection: keep-alive',
      '',
      '',
    ].join('\r\n'), 'latin1');
    const response = await collectRawResponseUntilServerClose(port, request);

    assert.match(response, /^HTTP\/1\.1 408 /);
    assert.match(response, /\r\nConnection: close\r\n/i);
    assert.equal((response.match(/^HTTP\/1\.1 /gm) ?? []).length, 1);
  });
});

test('dedupe capacity exhaustion is returned as retryable 503', async () => {
  const { createDrsLineServer } = await requireExports('createDrsLineServer');
  const server = createDrsLineServer({
    readBody: async () => Buffer.from('{"events":[]}', 'utf8'),
    webhookHandler: async () => {
      const error = new Error('dedupe capacity exhausted');
      error.httpStatus = 503;
      throw error;
    },
  });

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/line/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });

    assert.equal(response.status, 503);
  });
});

test('README lists the exact eight sanitized log fields', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const fieldBlock = readme.match(/SANITIZED_LOG_FIELDS:\s*\r?\n```text\r?\n([\s\S]*?)\r?\n```/);

  assert.ok(fieldBlock, 'README must contain the SANITIZED_LOG_FIELDS block');
  assert.deepEqual(fieldBlock[1].split(/\r?\n/), [
    'at',
    'requestId',
    'eventId',
    'eventType',
    'sourceType',
    'outcome',
    'httpStatus',
    'durationMs',
  ]);
});

test('startServer listens on 0.0.0.0 using the configured PORT', async () => {
  const { startServer } = await requireExports('startServer');
  let listenOptions;
  let createCount = 0;
  const fakeServer = {
    once() { return this; },
    listen(options, callback) { listenOptions = options; callback(); return this; },
  };

  const result = await startServer({
    env: {
      PORT: '4321',
      LINE_CHANNEL_SECRET: 'test-channel-secret',
      LINE_CHANNEL_ACCESS_TOKEN: 'test-access-token',
      NODE_ENV: 'test',
    },
    createServerImpl() { createCount += 1; return fakeServer; },
    fetchImpl: async () => ({ ok: true, status: 200 }),
  });

  assert.equal(result, fakeServer);
  assert.equal(createCount, 1);
  assert.deepEqual(listenOptions, { host: '0.0.0.0', port: 4321 });
});
