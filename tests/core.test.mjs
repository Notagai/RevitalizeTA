import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureSnapshot } from '../src/core/fixtures.ts';
import { calculatedAverage, parseSnapshot } from '../src/core/model.ts';
import { diffSnapshots, SyncController, SyncError } from '../src/core/sync.ts';

const time = '2026-10-23T12:00:00.000Z';
const fixture = () => fixtureSnapshot(time);
function harness() {
  let saved = null;
  const store = { load: async () => saved, save: async s => { saved = s; }, clear: async () => { saved = null; } };
  const controller = new SyncController(store, () => {}, () => time);
  return { controller, store };
}
test('validation accepts intentional empty courses and no marks', () => {
  assert.equal(parseSnapshot(fixture()).courses[1].reportedAverage, null);
  assert.equal(parseSnapshot({ ...fixture(), courses: [] }).courses.length, 0);
});
test('validation rejects incomplete, ambiguous, duplicate and invalid values', () => {
  for (const mutate of [
    (s) => { delete s.courses; },
    (s) => { s.source = 'live'; },
    (s) => { s.checkedAt = 'yesterday'; },
    (s) => { s.courses.push(s.courses[0]); },
    (s) => { delete s.courses[0].assessments; },
    (s) => { s.courses[0].reportedAverage = NaN; },
    (s) => { s.courses[0].categories[0].weight = 99; },
    (s) => { s.courses[0].assessments[0].earned = null; },
    (s) => { s.courses[0].assessments[0].possible = 0; },
    (s) => { s.courses[0].assessments[0].category = 'unknown'; },
    (s) => { s.courses[0].assessments[0].earned = 100; },
  ]) { const data = fixture(); mutate(data); assert.throws(() => parseSnapshot(data), /INVALID_SNAPSHOT/); }
});
test('category math renormalizes available categories and preserves zero', () => {
  const c = fixture().courses[0];
  assert.ok(Math.abs(calculatedAverage(c) - (25 / 30 * 100 * 30 + 90 * 25) / 55) < 0.00001);
  assert.equal(calculatedAverage(fixture().courses[1]), null);
  c.assessments[0].earned = 0;
  c.assessments[1].status = 'exempt'; c.assessments[1].earned = null;
  assert.equal(calculatedAverage(c), 0);
});
test('diff uses identities for renamed, removed and added assessments', () => {
  const a = fixture(); const b = fixture();
  b.courses[0].assessments.reverse();
  b.courses[0].categories.reverse();
  assert.deepEqual(diffSnapshots(a, b), []);
  b.courses[0].assessments[0].name = 'Renamed';
  assert.equal(diffSnapshots(a, b)[0].description, 'Assessment changed');
  b.courses[0].assessments.pop();
  assert.ok(diffSnapshots(a, b).some(c => c.description === 'Assessment removed'));
});
test('success, unchanged, changed and hydration preserve explicit provenance', async () => {
  const { controller: c, store } = harness();
  await c.refresh({ fetch: async () => fixture() }); assert.equal(c.state.status, 'changed');
  await c.refresh({ fetch: async () => fixture() }); assert.equal(c.state.status, 'unchanged');
  await c.refresh({ fetch: async () => fixtureSnapshot(time, true) }); assert.equal(c.state.status, 'changed');
  const restored = new SyncController(store, () => {}); await restored.hydrate();
  assert.equal(restored.state.status, 'never'); assert.equal(restored.state.snapshot?.source, 'synthetic');
  await c.clear(); assert.equal(c.state.snapshot, null); assert.equal(await store.load(), null);
});
test('all adapter failures retain known-good cache and checked time', async () => {
  for (const code of ['offline', 'auth', 'partial', 'rate-limited', 'unavailable', 'cancelled']) {
    const { controller: c } = harness(); await c.refresh({ fetch: async () => fixture() });
    const previous = c.state.snapshot;
    await c.refresh({ fetch: async () => { throw new SyncError(code); } });
    assert.equal(c.state.status, code); assert.equal(c.state.snapshot, previous);
  }
});
test('malformed responses and storage failure cannot publish success', async () => {
  const { controller: c, store } = harness(); await c.refresh({ fetch: async () => fixture() });
  const previous = c.state.snapshot;
  await c.refresh({ fetch: async () => ({}) }); assert.equal(c.state.status, 'partial');
  store.save = async () => { throw new Error('private details'); };
  await c.refresh({ fetch: async () => fixture() });
  assert.equal(c.state.status, 'storage'); assert.equal(c.state.snapshot, previous);
});
test('refresh is single-flight and cancellation terminates uncooperative adapter', async () => {
  const { controller: c } = harness(); let calls = 0;
  const adapter = { fetch: async () => { calls++; return new Promise(() => {}); } };
  const pending = c.refresh(adapter); assert.equal(c.refresh(adapter), pending);
  assert.equal(c.state.status, 'checking'); c.cancel(); await pending;
  assert.equal(calls, 1); assert.equal(c.state.status, 'cancelled');
});
test('corrupt or unsupported saved snapshots fail closed', async () => {
  const { controller: c, store } = harness(); store.load = async () => ({ version: 2 });
  await c.hydrate(); assert.equal(c.state.status, 'storage'); assert.equal(c.state.snapshot, null);
});

test('deletion failure is explicit and does not report data removed', async () => {
  const { controller: c, store } = harness(); await c.refresh({ fetch: async () => fixture() });
  store.clear = async () => { throw new Error('storage unavailable'); };
  assert.equal(await c.clear(), false);
  assert.equal(c.state.status, 'storage'); assert.ok(c.state.snapshot);
});

test('deleting during a check cancels it before clearing storage', async () => {
  const { controller: c, store } = harness(); await c.refresh({ fetch: async () => fixture() });
  const pending = c.refresh({ fetch: async () => new Promise(() => {}) });
  assert.equal(await c.clear(), true); await pending;
  assert.equal(c.state.status, 'never'); assert.equal(await store.load(), null);
});

test('an adapter that never responds terminates at the bounded deadline', async () => {
  const { controller: c } = harness();
  await c.refresh({ fetch: async () => new Promise(() => {}) });
  assert.equal(c.state.status, 'unavailable'); assert.equal(c.state.snapshot, null);
});

test('refresh cannot repopulate data while deletion is in progress', async () => {
  const { controller: c, store } = harness(); await c.refresh({ fetch: async () => fixture() });
  let finish;
  store.clear = () => new Promise(resolve => { finish = resolve; });
  const deletion = c.clear(); assert.equal(c.clear(), deletion);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(c.state.status, 'deleting');
  let calls = 0;
  const check = c.refresh({ fetch: async () => { calls++; return fixture(); } });
  finish(); await deletion; await check;
  assert.equal(calls, 0); assert.equal(c.state.snapshot, null);
});


