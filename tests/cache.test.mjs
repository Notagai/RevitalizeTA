import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixtureCache } from '../src/core/cache.ts';
import { fixtureSnapshot } from '../src/core/fixtures.ts';
const time = '2026-10-23T12:00:00.000Z';
function harness() {
  const data = new Map();
  const slots = { read: async k => data.get(k) ?? null, write: async (k, v) => { data.set(k, v); }, remove: async k => { data.delete(k); } };
  return { data, slots, cache: new FixtureCache(slots) };
}
test('cache persists validated snapshots across store instances', async () => {
  const { slots, cache } = harness(); assert.equal(await cache.load(), null);
  await cache.save(fixtureSnapshot(time));
  assert.deepEqual(await new FixtureCache(slots).load(), fixtureSnapshot(time));
});
test('interrupted writes recover the previous complete snapshot', async () => {
  const { data, slots, cache } = harness(); const before = fixtureSnapshot(time);
  await cache.save(before);
  slots.write = async (key) => { data.set(key, '{partial'); throw new Error('disk full'); };
  await assert.rejects(cache.save(fixtureSnapshot(time, true)));
  assert.deepEqual(await cache.load(), before);
});
test('corrupted newest slot falls back; all corrupt fails closed', async () => {
  const { data, cache } = harness(); await cache.save(fixtureSnapshot(time));
  await cache.save(fixtureSnapshot(time, true)); data.set('snapshot-b.json', '{');
  assert.deepEqual(await cache.load(), fixtureSnapshot(time));
  data.set('snapshot-a.json', '{}'); await assert.rejects(cache.load(), /CACHE_INVALID/);
});
test('writes rotate bounded slots, ignoring device clock rollback', async () => {
  const { data, cache } = harness();
  for (let i = 0; i < 10; i++) await cache.save(fixtureSnapshot(i % 2 ? '2025-01-01T00:00:00.000Z' : time, i % 2 === 1));
  assert.equal(data.size, 2); assert.equal((await cache.load()).checkedAt, '2025-01-01T00:00:00.000Z');
  await cache.clear(); assert.equal(await cache.load(), null);
});
test('invalid snapshots never write; silent write failures are detected', async () => {
  const { data, slots, cache } = harness();
  await assert.rejects(cache.save({})); assert.equal(data.size, 0);
  slots.write = async () => {}; await assert.rejects(cache.save(fixtureSnapshot(time)), /CACHE_WRITE/);
});
