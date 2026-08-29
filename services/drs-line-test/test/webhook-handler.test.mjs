import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const CHANNEL_SECRET = 'test-channel-secret';
const EXPECTED_REPLY = '萊比已收到這次 DRS 連線測試。本次僅確認訊息傳輸，不代表案件已建立、身分已授權或決策已生效。';

async function requireExports(...names) {
  const [handlerModule, storeModule] = await Promise.all([
    import('../src/webhook-handler.mjs').catch(() => ({})),
    import('../src/dedupe-store.mjs').catch(() => ({})),
  ]);
  for (const name of names) {
    const value = handlerModule[name] ?? storeModule[name];
    assert.equal(typeof value, 'function', `${name} must be implemented`);
  }
  return { ...storeModule, ...handlerModule };
}

function sign(rawBody) {
  return createHmac('sha256', CHANNEL_SECRET).update(rawBody).digest('base64');
}

function payload(events) {
  return Buffer.from(JSON.stringify({ events }), 'utf8');
}

function messageEvent(overrides = {}) {
  return {
    type: 'message',
    webhookEventId: 'event-1',
    replyToken: 'test-reply-token',
    source: { type: 'user', userId: 'sensitive-user-id' },
    message: { type: 'text', text: 'DRS真人測試' },
    ...overrides,
  };
}

async function makeHandler({ parser = JSON.parse, reply } = {}) {
  const { createWebhookHandler, createDedupeStore } = await requireExports(
    'createWebhookHandler',
    'createDedupeStore',
  );
  const calls = [];
  const logs = [];
  const lineClient = {
    async reply(input) {
      calls.push(input);
      if (reply) return reply(input);
    },
  };
  const handle = createWebhookHandler({
    channelSecret: CHANNEL_SECRET,
    lineClient,
    dedupeStore: createDedupeStore(),
    logger: (entry) => logs.push(entry),
    parser,
    now: () => 1_000,
  });
  return { handle, calls, logs };
}

test('invalid signature returns 401 before the JSON parser is called', async () => {
  let parseCount = 0;
  const { handle } = await makeHandler({ parser() { parseCount += 1; return {}; } });

  const result = await handle({
    rawBody: Buffer.from('{invalid-json', 'utf8'),
    signature: 'invalid-signature',
    requestId: 'request-1',
  });

  assert.equal(result.status, 401);
  assert.equal(parseCount, 0);
});

test('missing signature returns 401', async () => {
  const { handle } = await makeHandler();

  const result = await handle({ rawBody: payload([]), requestId: 'request-1' });

  assert.equal(result.status, 401);
});

test('valid signature with invalid JSON returns 400', async () => {
  const { handle } = await makeHandler();
  const rawBody = Buffer.from('{invalid-json', 'utf8');

  const result = await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  assert.equal(result.status, 400);
});

test('signed empty events verification request returns 200', async () => {
  const { handle, calls } = await makeHandler();
  const rawBody = payload([]);

  const result = await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('one-to-one DRS真人測試 replies once with the exact locked copy', async () => {
  const { handle, calls } = await makeHandler();
  const rawBody = payload([messageEvent()]);

  const result = await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  assert.equal(result.status, 200);
  assert.deepEqual(calls, [{ replyToken: 'test-reply-token', text: EXPECTED_REPLY }]);
});

test('other text, event types, media, group, and room sources never reply', async () => {
  const { handle, calls } = await makeHandler();
  const rawBody = payload([
    messageEvent({ webhookEventId: 'other-text', message: { type: 'text', text: 'DRS 真人測試' } }),
    messageEvent({ webhookEventId: 'follow', type: 'follow' }),
    messageEvent({ webhookEventId: 'postback', type: 'postback', postback: { data: 'test' } }),
    messageEvent({ webhookEventId: 'image', message: { type: 'image', id: 'image-1' } }),
    messageEvent({ webhookEventId: 'group', source: { type: 'group', groupId: 'sensitive-group-id' } }),
    messageEvent({ webhookEventId: 'room', source: { type: 'room', roomId: 'sensitive-room-id' } }),
  ]);

  const result = await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('same webhookEventId replies only once in one process lifetime', async () => {
  const { handle, calls } = await makeHandler();
  const rawBody = payload([messageEvent()]);
  const input = { rawBody, signature: sign(rawBody), requestId: 'request-1' };

  assert.equal((await handle(input)).status, 200);
  assert.equal((await handle({ ...input, requestId: 'request-2' })).status, 200);
  assert.equal(calls.length, 1);
});

test('outbound failure releases the processing marker and returns retryable status', async () => {
  let fail = true;
  const { handle, calls } = await makeHandler({
    reply() {
      if (fail) {
        const error = new Error('upstream failed');
        error.httpStatus = 503;
        throw error;
      }
    },
  });
  const rawBody = payload([messageEvent()]);
  const input = { rawBody, signature: sign(rawBody), requestId: 'request-1' };

  assert.equal((await handle(input)).status, 503);
  fail = false;
  assert.equal((await handle({ ...input, requestId: 'request-2' })).status, 200);
  assert.equal(calls.length, 2);
});

test('multi-event payload processes only authorized one-to-one test messages', async () => {
  const { handle, calls } = await makeHandler();
  const rawBody = payload([
    messageEvent({ webhookEventId: 'event-user', replyToken: 'reply-user' }),
    messageEvent({
      webhookEventId: 'event-group',
      replyToken: 'reply-group',
      source: { type: 'group', groupId: 'sensitive-group-id' },
    }),
    messageEvent({
      webhookEventId: 'event-other',
      replyToken: 'reply-other',
      message: { type: 'text', text: '其他訊息' },
    }),
  ]);

  const result = await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  assert.equal(result.status, 200);
  assert.deepEqual(calls, [{ replyToken: 'reply-user', text: EXPECTED_REPLY }]);
});

test('handler log entries never include identifiers, message text, or credentials', async () => {
  const { handle, logs } = await makeHandler();
  const rawBody = payload([messageEvent()]);

  await handle({ rawBody, signature: sign(rawBody), requestId: 'request-1' });

  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('sensitive-user-id'), false);
  assert.equal(serialized.includes('test-reply-token'), false);
  assert.equal(serialized.includes('DRS真人測試'), false);
  assert.equal(serialized.includes(CHANNEL_SECRET), false);
});
