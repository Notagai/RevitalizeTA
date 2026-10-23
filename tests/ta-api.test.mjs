import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTAAdapter, normalizeTAResponse, RequestLimiter, validCredentials } from '../src/core/ta-api.ts';
import { TA_API_ENABLED, TA_API_URL } from '../src/core/integration.ts';
import { calculatedAverage } from '../src/core/model.ts';
import { SyncController } from '../src/core/sync.ts';
import { SessionStore } from '../src/core/session-store.ts';
import { taResponse } from './fixtures/ta-response.mjs';

const time = '2026-10-23T12:00:00.000Z';
const credentials = { username: 'synthetic.user', password: 'invented-test-password' };
const signal = () => new AbortController().signal;
const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });

test('TA normalization accepts the source envelope and documented array, splits category marks and preserves unknowns', () => {
  for (const raw of [taResponse(), taResponse().response]) {
    const snapshot = normalizeTAResponse(raw, time);
    assert.equal(snapshot.source, 'ta-api'); assert.equal(snapshot.version, 2);
    const [math, english] = snapshot.courses;
    assert.equal(math.teacher, 'Ms. Example'); assert.equal(math.room, '306');
    assert.equal(math.period, 1); assert.equal(math.semester, 1); assert.equal(english.semester, 2);
    assert.equal(math.assessments.length, 3); assert.equal(calculatedAverage(math), 85);
    assert.equal(math.assessments[0].assignmentId, math.assessments[1].assignmentId);
    assert.equal(math.assessments[2].status, 'ungraded'); assert.equal(math.assessments[2].earned, null);
    assert.equal(english.reportedAverage, null); assert.equal(english.teacher, undefined); assert.equal(english.room, undefined);
  }
  assert.deepEqual(normalizeTAResponse({ response: [] }, time).courses, []);
  const zero = taResponse(); zero.response[0].overall_mark = 0;
  assert.equal(normalizeTAResponse(zero, time).courses[0].reportedAverage, 0);
});

test('missing or malicious fields, impossible values, duplicate courses and invalid dates fail closed', () => {
  for (const mutate of [
    raw => { delete raw.response[0].assignments; }, raw => { delete raw.response[0].weight_table; },
    raw => { raw.response[0].name = '<script>alert(1)</script>'; },
    raw => { raw.response[0].teacher = '<img src=x onerror=alert(1)>'; },
    raw => { raw.response[0].weight_table.KU.CW = 99; },
    raw => { raw.response[0].assignments[0].KU[0].get = 999; },
    raw => { raw.response[0].assignments[0].KU[0].finished = 'true'; },
    raw => { raw.response[0].start_time = '2026-02-30'; },
    raw => { raw.response[0].assignments[0].date = 'yesterday'; },
    raw => { raw.response.push(raw.response[0]); },
  ]) { const raw = taResponse(); mutate(raw); assert.throws(() => normalizeTAResponse(raw, time)); }
  for (const raw of [null, {}, { response: { error: 'private exception' } }]) assert.throws(() => normalizeTAResponse(raw, time));
});

test('unofficial API transport stays disabled even if a caller attempts to override approval', async () => {
  assert.equal(TA_API_ENABLED, false);
  let calls = 0;
  for (const approved of [false, true]) {
    const adapter = createTAAdapter(credentials, new RequestLimiter(), { approved, fetchImpl: async () => { calls++; return response(taResponse()); } });
    await assert.rejects(adapter.fetch(signal()), { code: 'auth' });
  }
  assert.equal(calls, 0);
});
