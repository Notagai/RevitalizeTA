import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheAge, percent, syncMessage } from '../src/core/presentation.ts';
import { initialState } from '../src/core/sync.ts';
import { fixtureSnapshot } from '../src/core/fixtures.ts';

test('zero and unavailable grades have distinct labels', () => {
  assert.equal(percent(0), '0.0%'); assert.equal(percent(null), 'Not available');
});
test('cache age identifies device clock rollback', () => {
  const time = '2026-10-23T12:00:00.000Z'; const now = Date.parse(time);
  assert.match(cacheAge(time, now - 1), /clock/);
  assert.match(cacheAge(time, now), /less than a minute/);
  assert.match(cacheAge(time, now + 120000), /2 minutes/);
  assert.match(cacheAge(time, now + 7200000), /2 hours/);
  assert.match(cacheAge(time, now + 172800000), /2 days/);
});
test('every sync state has explicit copy; restored cache never claims live success', () => {
  for (const status of ['never', 'checking', 'deleting', 'changed', 'unchanged', 'offline', 'auth', 'partial', 'rate-limited', 'unavailable', 'cancelled', 'storage']) {
    assert.ok(syncMessage({ ...initialState, status }).length > 15);
  }
  assert.match(syncMessage({ ...initialState, snapshot: fixtureSnapshot('2026-10-23T12:00:00.000Z') }), /saved demo/);
});
