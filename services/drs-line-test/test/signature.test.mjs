import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

async function requireExport(name) {
  const subject = await import('../src/signature.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('LINE HMAC-SHA256 signature accepts the exact raw body', async () => {
  const verifyLineSignature = await requireExport('verifyLineSignature');
  const rawBody = Buffer.from('{"events":[]}', 'utf8');
  const secret = 'test-channel-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('base64');

  assert.equal(verifyLineSignature(rawBody, signature, secret), true);
});

test('LINE signature safely rejects incorrect and different-length values', async () => {
  const verifyLineSignature = await requireExport('verifyLineSignature');
  const rawBody = Buffer.from('{"events":[]}', 'utf8');
  const secret = 'test-channel-secret';

  assert.equal(verifyLineSignature(rawBody, 'incorrect-signature', secret), false);
  assert.equal(verifyLineSignature(rawBody, 'A', secret), false);
  assert.equal(verifyLineSignature(rawBody, '', secret), false);
});
