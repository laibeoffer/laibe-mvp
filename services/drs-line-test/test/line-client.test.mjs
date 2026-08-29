import test from 'node:test';
import assert from 'node:assert/strict';

async function requireExport(name) {
  const subject = await import('../src/line-client.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('LINE client calls only the Reply API with one locked text message', async () => {
  const createLineClient = await requireExport('createLineClient');
  let captured;
  const client = createLineClient({
    accessToken: 'test-access-token',
    async fetchImpl(url, options) {
      captured = { url, options };
      return {
        ok: true,
        status: 200,
        async text() { throw new Error('response body must not be read'); },
      };
    },
  });

  await client.reply({ replyToken: 'test-reply-token', text: 'locked reply' });

  assert.equal(captured.url, 'https://api.line.me/v2/bot/message/reply');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.authorization, 'Bearer test-access-token');
  assert.deepEqual(JSON.parse(captured.options.body), {
    replyToken: 'test-reply-token',
    messages: [{ type: 'text', text: 'locked reply' }],
  });
});

test('LINE client maps non-2xx to a retryable gateway status without reading response body', async () => {
  const createLineClient = await requireExport('createLineClient');
  let bodyRead = false;
  const client = createLineClient({
    accessToken: 'test-access-token',
    async fetchImpl() {
      return {
        ok: false,
        status: 500,
        async text() { bodyRead = true; return 'sensitive-upstream-body'; },
      };
    },
  });

  await assert.rejects(
    client.reply({ replyToken: 'test-reply-token', text: 'locked reply' }),
    (error) => error?.httpStatus === 503 && error?.upstreamStatus === 500,
  );
  assert.equal(bodyRead, false);
});

test('LINE client aborts an outbound request after five seconds', async () => {
  const createLineClient = await requireExport('createLineClient');
  let aborted = false;
  const client = createLineClient({
    accessToken: 'test-access-token',
    setTimeoutFn(callback) {
      queueMicrotask(callback);
      return 1;
    },
    clearTimeoutFn() {},
    fetchImpl(_url, { signal }) {
      return new Promise((_resolve, reject) => {
        const rejectAborted = () => {
          aborted = true;
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        };
        if (signal.aborted) rejectAborted();
        else signal.addEventListener('abort', rejectAborted, { once: true });
      });
    },
  });

  await assert.rejects(
    client.reply({ replyToken: 'test-reply-token', text: 'locked reply' }),
    (error) => error?.httpStatus === 503,
  );
  assert.equal(aborted, true);
});
