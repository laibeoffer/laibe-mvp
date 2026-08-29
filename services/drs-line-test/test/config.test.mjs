import test from 'node:test';
import assert from 'node:assert/strict';

async function requireExport(name) {
  const subject = await import('../src/config.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('configuration fails closed when LINE_CHANNEL_SECRET is missing', async () => {
  const parseConfig = await requireExport('parseConfig');

  assert.throws(
    () => parseConfig({ LINE_CHANNEL_ACCESS_TOKEN: 'test-access-token' }),
    /LINE_CHANNEL_SECRET/,
  );
});

test('configuration fails closed when LINE_CHANNEL_ACCESS_TOKEN is missing', async () => {
  const parseConfig = await requireExport('parseConfig');

  assert.throws(
    () => parseConfig({ LINE_CHANNEL_SECRET: 'test-channel-secret' }),
    /LINE_CHANNEL_ACCESS_TOKEN/,
  );
});

test('configuration uses PORT and defaults to 8080', async () => {
  const parseConfig = await requireExport('parseConfig');
  const base = {
    LINE_CHANNEL_SECRET: 'test-channel-secret',
    LINE_CHANNEL_ACCESS_TOKEN: 'test-access-token',
  };

  assert.equal(parseConfig(base).port, 8080);
  assert.equal(parseConfig({ ...base, PORT: '4321' }).port, 4321);
});
