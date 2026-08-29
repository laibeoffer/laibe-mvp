import test from 'node:test';
import assert from 'node:assert/strict';

async function requireExport(name) {
  const subject = await import('../src/logger.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('sanitized logger writes one JSON line with only allowlisted fields', async () => {
  const createSanitizedLogger = await requireExport('createSanitizedLogger');
  let output = '';
  const log = createSanitizedLogger({
    now: () => new Date('2026-08-29T00:00:00.000Z'),
    write: (line) => { output += line; },
  });

  log({
    requestId: 'request-1',
    eventId: 'event-1',
    eventType: 'message',
    sourceType: 'user',
    outcome: 'replied',
    httpStatus: 200,
    durationMs: 12,
    userId: 'sensitive-user-id',
    replyToken: 'sensitive-reply-token',
    message: 'DRS真人測試',
    secret: 'sensitive-secret',
    token: 'sensitive-token',
    authorization: 'sensitive-authorization',
    stack: 'sensitive-stack',
  });

  assert.equal(output.endsWith('\n'), true);
  assert.equal(output.trim().split('\n').length, 1);
  const parsed = JSON.parse(output);
  assert.deepEqual(Object.keys(parsed), [
    'at',
    'requestId',
    'eventId',
    'eventType',
    'sourceType',
    'outcome',
    'httpStatus',
    'durationMs',
  ]);
  assert.equal(output.includes('sensitive-'), false);
  assert.equal(output.includes('DRS真人測試'), false);
});
