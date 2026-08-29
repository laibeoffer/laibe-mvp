import test from 'node:test';
import assert from 'node:assert/strict';

async function requireExport(name) {
  const subject = await import('../src/dedupe-store.mjs').catch(() => ({}));
  assert.equal(typeof subject[name], 'function', `${name} must be implemented`);
  return subject[name];
}

test('dedupe store permits one processing claim per event ID', async () => {
  const createDedupeStore = await requireExport('createDedupeStore');
  const store = createDedupeStore();

  assert.equal(store.begin('event-1'), true);
  assert.equal(store.begin('event-1'), false);
  store.complete('event-1');
  assert.equal(store.begin('event-1'), false);
});

test('dedupe store releases a failed processing marker for retry', async () => {
  const createDedupeStore = await requireExport('createDedupeStore');
  const store = createDedupeStore();

  assert.equal(store.begin('event-1'), true);
  store.release('event-1');
  assert.equal(store.begin('event-1'), true);
});

test('dedupe store expires entries after TTL and remains bounded', async () => {
  const createDedupeStore = await requireExport('createDedupeStore');
  let now = 0;
  const store = createDedupeStore({ ttlMs: 100, maxEntries: 2, now: () => now });

  assert.equal(store.begin('event-1'), true);
  store.complete('event-1');
  now = 1;
  assert.equal(store.begin('event-2'), true);
  store.complete('event-2');
  now = 2;
  assert.equal(store.begin('event-3'), true);
  store.complete('event-3');
  assert.equal(store.begin('event-1'), true, 'oldest entry is evicted at capacity');

  now = 200;
  assert.equal(store.begin('event-2'), true, 'expired entries may be retried');
});

test('dedupe capacity never evicts an in-flight processing marker', async () => {
  const createDedupeStore = await requireExport('createDedupeStore');
  const store = createDedupeStore({ maxEntries: 2 });

  assert.equal(store.begin('processing-1'), true);
  assert.equal(store.begin('processing-2'), true);
  assert.equal(store.begin('new-event'), false, 'new claim is refused while capacity is fully in flight');
  assert.equal(store.begin('processing-1'), false, 'the first processing marker remains protected');

  store.release('processing-2');
  assert.equal(store.begin('new-event'), true, 'released capacity accepts the new event');
});
