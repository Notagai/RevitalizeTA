import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoAdapter } from '../src/core/demo.ts';
import { SyncController } from '../src/core/sync.ts';
import { FixtureCache } from '../src/core/cache.ts';

test('demo flow: check, no change, change, offline, restart, empty response', async () => {
  const data = new Map();
  const slots = { read: async k => data.get(k) ?? null, write: async (k, v) => { data.set(k, v); }, remove: async k => { data.delete(k); } };
  const controller = new SyncController(new FixtureCache(slots), () => {});
  for (const [scenario, expected] of [['normal', 'changed'], ['normal', 'unchanged'], ['changed', 'changed'], ['offline', 'offline']]) {
    await controller.refresh(demoAdapter(scenario));
    assert.equal(controller.state.status, expected);
  }
  assert.equal(controller.state.snapshot.courses[0].reportedAverage, 87);
  const restored = new SyncController(new FixtureCache(slots), () => {}); await restored.hydrate();
  assert.equal(restored.state.status, 'never'); assert.equal(restored.state.snapshot.courses[0].reportedAverage, 87);
  await restored.refresh(demoAdapter('malformed')); assert.equal(restored.state.status, 'partial');
  assert.equal(restored.state.snapshot.courses.length, 2);
  await restored.refresh(demoAdapter('empty')); assert.equal(restored.state.status, 'changed');
  assert.deepEqual(restored.state.snapshot.courses, []);
});
test('fixture adapter cancellation terminates without data', async () => {
  const abort = new AbortController(); const pending = demoAdapter('normal').fetch(abort.signal);
  abort.abort(); await assert.rejects(pending, /cancelled/);
});
