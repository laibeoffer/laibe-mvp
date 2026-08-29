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

test('LINE signature rejects whitespace, junk, missing padding, and noncanonical Base64', async () => {
  const verifyLineSignature = await requireExport('verifyLineSignature');
  const rawBody = Buffer.from('{"events":[]}', 'utf8');
  const secret = 'test-channel-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('base64');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const canonicalTailIndex = alphabet.indexOf(signature.at(-2));
  const noncanonicalTail = alphabet[canonicalTailIndex | 1];
  const noncanonical = `${signature.slice(0, -2)}${noncanonicalTail}=`;

  assert.deepEqual(Buffer.from(noncanonical, 'base64'), Buffer.from(signature, 'base64'));
  for (const candidate of [
    ` ${signature}`,
    `${signature}\n`,
    `${signature}!`,
    signature.slice(0, -1),
    noncanonical,
  ]) {
    assert.equal(verifyLineSignature(rawBody, candidate, secret), false, candidate);
  }
});
