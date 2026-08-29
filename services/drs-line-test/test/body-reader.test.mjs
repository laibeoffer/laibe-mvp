import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';

async function requireExport(name) {
  const subject = await import('../src/body-reader.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('raw body reader preserves the original bytes', async () => {
  const readRawBody = await requireExport('readRawBody');
  const first = Buffer.from('{"text":"');
  const second = Buffer.from('DRS真人測試"}', 'utf8');

  const result = await readRawBody(Readable.from([first, second]));

  assert.deepEqual(result, Buffer.concat([first, second]));
});

test('raw body reader rejects a body larger than the configured limit with 413', async () => {
  const readRawBody = await requireExport('readRawBody');

  await assert.rejects(
    readRawBody(Readable.from([Buffer.alloc(6)]), { maxBytes: 5 }),
    (error) => error?.httpStatus === 413 && error?.closeConnection === true,
  );
});

test('raw body reader rejects a stalled body with 408', async () => {
  const readRawBody = await requireExport('readRawBody');
  const request = new PassThrough();

  await assert.rejects(
    readRawBody(request, {
      timeoutMs: 5_000,
      setTimeoutFn(callback) {
        queueMicrotask(callback);
        return 1;
      },
      clearTimeoutFn() {},
    }),
    (error) => error?.httpStatus === 408 && error?.closeConnection === true,
  );
});
