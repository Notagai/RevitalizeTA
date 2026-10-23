import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageDelta, gradeDelta, sortedAssignments, weightedAverage } from '../src/core/grades.ts';
import { calculatedAverage, parseSnapshot } from '../src/core/model.ts';
import { deltaLabel } from '../src/core/presentation.ts';
import { fixtureSnapshot } from '../src/core/fixtures.ts';
import { SyncController, SyncError } from '../src/core/sync.ts';
import { SessionStore } from '../src/core/session-store.ts';
import { FixtureCache } from '../src/core/cache.ts';
import { normalizeTAResponse } from '../src/core/ta-api.ts';
import { taResponse } from './fixtures/ta-response.mjs';

const time = '2026-10-23T12:00:00.000Z';
test('course and overall deltas preserve zero, compare the same courses, and report percentage points', () => {
  const snapshot = fixtureSnapshot(time);
  const baseline = { checkedAt: time, courses: snapshot.courses.map(({ id, reportedAverage }) => ({ id, reportedAverage })) };
  assert.equal(gradeDelta(0, 10), -10);
  assert.equal(gradeDelta(null, 10), null);
  assert.equal(gradeDelta(10, undefined), null);
  assert.equal(averageDelta(snapshot.courses, baseline), 0);
  snapshot.courses[0].reportedAverage = 87;
  assert.equal(averageDelta(snapshot.courses, baseline), 2);
  assert.equal(averageDelta(snapshot.courses.slice(0, 1), baseline), null);
  snapshot.courses[1].reportedAverage = 90;
  assert.equal(averageDelta(snapshot.courses, baseline), null);
  assert.equal(deltaLabel(-0.01), 'No change');
  assert.equal(deltaLabel(2), '+2.0 pp');
});

test('weighted estimates combine category math and course credits, excluding unavailable and zero-weight courses', () => {
  const [course, empty] = fixtureSnapshot(time).courses;
  const zero = { ...course, id: 'zero', assessments: course.assessments.map(a => a.status === 'graded' ? { ...a, earned: 0 } : a), credit: 0.5 };
  const first = calculatedAverage(course);
  assert.equal(weightedAverage([course, empty]), first);
  assert.equal(weightedAverage([course, zero]), first / 1.5);
  assert.equal(weightedAverage([course, zero], { [course.id]: 0 }), 0);
  assert.equal(weightedAverage([empty]), null);
  assert.equal(weightedAverage([course], { [course.id]: 0 }), null);
});

test('assignment sorting keeps ungraded marks last in both grade directions and unknown dates last', () => {
  const parts = [
    { id: 'a', name: 'Alpha', category: 'K', earned: 0, possible: 10, weight: 1, status: 'graded', date: '2026-10-01' },
    { id: 'b', name: 'Beta', category: 'K', earned: 9, possible: 10, weight: 1, status: 'graded', date: '2026-10-20' },
    { id: 'c', name: 'Charlie', category: 'K', earned: null, possible: 10, weight: 1, status: 'ungraded' },
  ];
  for (const [sort, expected] of [
    ['Newest', ['b', 'a', 'c']], ['Oldest', ['a', 'b', 'c']],
    ['Highest grade', ['b', 'a', 'c']], ['Lowest grade', ['a', 'b', 'c']], ['Name', ['a', 'b', 'c']],
  ]) assert.deepEqual(sortedAssignments(parts, sort).map(a => a.id), expected);
  assert.deepEqual(parts.map(a => a.id), ['a', 'b', 'c']);
  const grouped = sortedAssignments([{ ...parts[0], assignmentId: 'one' }, { ...parts[1], assignmentId: 'one', weight: 3 }], 'Weight');
  assert.equal(grouped.length, 1); assert.equal(grouped[0].parts.length, 2); assert.equal(grouped[0].grade, 67.5);
  assert.equal(sortedAssignments([{ ...parts[1], weight: 0 }], 'Highest grade')[0].grade, 90);
});

test('successful refresh establishes a comparison; failure preserves it; unchanged refresh records zero delta', async () => {
  const store = new SessionStore();
  const controller = new SyncController(store, () => {}, () => time);
  await controller.refresh({ fetch: async () => fixtureSnapshot(time) });
  assert.equal(controller.state.snapshot.comparison, undefined);
  await controller.refresh({ fetch: async () => fixtureSnapshot(time, true) });
  assert.equal(averageDelta(controller.state.snapshot.courses, controller.state.snapshot.comparison), 2);
  const snapshot = controller.state.snapshot;
  await controller.refresh({ fetch: async () => { throw new SyncError('offline'); } });
  assert.equal(controller.state.snapshot, snapshot);
  assert.deepEqual(parseSnapshot(await store.load()), snapshot);
  await controller.refresh({ fetch: async () => fixtureSnapshot(time, true) });
  assert.equal(averageDelta(controller.state.snapshot.courses, controller.state.snapshot.comparison), 0);
  await controller.clear(); assert.equal(await store.load(), null);
});

test('the unencrypted fixture cache rejects live snapshots', async () => {
  let writes = 0;
  const storage = { read: async () => null, write: async () => { writes++; }, remove: async () => {} };
  await assert.rejects(new FixtureCache(storage).save(normalizeTAResponse(taResponse(), time)), /CACHE_SOURCE/);
  assert.equal(writes, 0);
});
