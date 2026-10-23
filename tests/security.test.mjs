import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { abortable, boundedText } from '../src/core/http.ts';
import { createSchoolAdapter, schoolEndpoint, validSchoolCredentials } from '../src/core/school-auth.ts';
import { RequestLimiter } from '../src/core/ta-api.ts';
import { parseSchoolCourses, parseSchoolReport, schoolCourseURL, schoolSnapshot } from '../src/server/school-parser.ts';
import { fetchSchoolGrades } from '../src/server/school.ts';
import { createSchoolHandler } from '../src/server/school-handler.ts';
import { SyncController } from '../src/core/sync.ts';
import { configuredRateLimit } from '../src/server/rate-limit.ts';
import { credentials, loginHTML, courseHTML, reportHTML, mockSchool } from './fixtures/school-html.mjs';

const require = createRequire(import.meta.url);
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const signal = () => new AbortController().signal;
const request = (body = { ...credentials, consent: true }, headers = {}, url = 'https://app.example/api/school/grades') => new Request(url, {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-revitalize-request': 'school-login', ...headers },
});

test('direct school parsing preserves zero and groups component marks without executing school HTML', () => {
  const courses = parseSchoolCourses(courseHTML(0));
  assert.equal(courses[0].overall_mark, 0); assert.equal(courses[0].room, '306');
  const report = parseSchoolReport(reportHTML + '<script>globalThis.schoolScriptRan=true</script>');
  const snapshot = schoolSnapshot([{ ...courses[0], ...report }], new Date().toISOString());
  assert.equal(snapshot.source, 'teachassist'); assert.equal(snapshot.courses[0].assessments.length, 3);
  assert.equal(snapshot.courses[0].assessments[2].status, 'ungraded'); assert.equal(globalThis.schoolScriptRan, undefined);
  assert.throws(() => parseSchoolCourses(loginHTML), { code: 'auth' });
  assert.throws(() => parseSchoolCourses('<html>Unexpected</html>'), { code: 'partial' });
  assert.throws(() => parseSchoolReport('<html>Unexpected</html>'), { code: 'partial' });
});

test('school links cannot target other hosts, actions, credentials, duplicate IDs, or unexpected query data', () => {
  assert.equal(schoolCourseURL('viewReport.php?subject_id=123').origin, 'https://ta.yrdsb.ca');
  for (const href of ['https://evil.example/viewReport.php?subject_id=1', '//evil.example/x', 'javascript:alert(1)',
    'https://evil@ta.yrdsb.ca/live/students/viewReport.php?subject_id=1', 'delete.php?subject_id=1',
    'viewReport.php?subject_id=1&password=secret', 'viewReport.php?subject_id=1&subject_id=2',
    'viewReport.php?subject_id=1#fragment', 'viewReport.php?subject_id=1\r\nInjected: true']) assert.throws(() => schoolCourseURL(href));
});

test('school credentials are form encoded in a POST body, never a URL or third-party request', async () => {
  const mock = mockSchool();
  const snapshot = await fetchSchoolGrades(credentials, signal(), mock.fetchImpl);
  assert.equal(snapshot.source, 'teachassist'); assert.equal(mock.requests.length, 3);
  assert.equal(mock.requests[0].options.method, 'GET');
  const posted = mock.requests[1];
  assert.equal(posted.url, 'https://ta.yrdsb.ca/live/index.php'); assert.equal(posted.options.method, 'POST');
  assert.equal(new URLSearchParams(posted.options.body).get('password'), credentials.password);
  assert.equal(new URLSearchParams(posted.options.body).get('subject_id'), '0');
  assert.equal(posted.options.headers.Cookie, 'PHPSESSID=synthetic-session');
  for (const call of mock.requests) { assert.equal(new URL(call.url).origin, 'https://ta.yrdsb.ca'); assert.equal(call.options.redirect, 'manual'); assert.equal(call.url.includes('password='), false); }
});

test('each school request has isolated cookies and redirects cannot replay credentials or exfiltrate sessions', async () => {
  const starts = [];
  const make = target => async (_url, options) => {
    if (options.method === 'GET') { starts.push(options.headers.Cookie); return new Response(loginHTML, { headers: { 'content-type': 'text/html', 'set-cookie': 'PHPSESSID=private; Secure' } }); }
    return new Response(null, { status: target.status, headers: { location: target.url } });
  };
  for (const target of [{ status: 302, url: 'https://evil.example/' }, { status: 307, url: '/live/index.php' }, { status: 302, url: '/live/students/delete.php?subject_id=1' }]) {
    await assert.rejects(fetchSchoolGrades(credentials, signal(), make(target)), { code: 'partial' });
  }
  assert.deepEqual(starts, [undefined, undefined, undefined]);
});

test('credentials validation accepts password punctuation unchanged and rejects type confusion/control characters', () => {
  assert.equal(validSchoolCredentials(credentials), true);
  assert.equal(validSchoolCredentials({ username: '123456789', password: 'longer-password-with-symbols!%' }), true);
  assert.equal(validSchoolCredentials({ username: 'synthetic.user', password: 'invented' }), false);
  assert.equal(validSchoolCredentials({ username: '12345678', password: 'invented' }), false);
  for (const value of [null, {}, { ...credentials, password: 123 }, { ...credentials, username: {} }, { ...credentials, password: 'x\u0000y' }]) assert.equal(validSchoolCredentials(value), false);
});

test('bounded readers reject forged length/oversized streams and cancellation terminates stalled work', async () => {
  await assert.rejects(boundedText(new Response('x'.repeat(50), { headers: { 'content-length': '1' } }), 10, signal()), { code: 'partial' });
  const abort = new AbortController();
  const pending = abortable(new Promise(() => {}), abort.signal); abort.abort();
  await assert.rejects(pending, { code: 'cancelled' });
  const bodyAbort = new AbortController();
  const body = new Response(new ReadableStream({ start() {} }));
  const reading = boundedText(body, 10, bodyAbort.signal); bodyAbort.abort();
  await assert.rejects(reading, { code: 'cancelled' });
});

test('server enforces method, TLS, same-origin JSON/custom header, consent, and bounded request bodies', async () => {
  let calls = 0;
  const handler = createSchoolHandler({ fetchGrades: async () => { calls++; throw new Error('must not run'); }, development: false });
  for (const [input, status] of [
    [new Request('https://app.example/api/school/grades'), 405],
    [request(undefined, {}, 'http://app.example/api/school/grades'), 403],
    [request(undefined, { origin: 'https://evil.example' }), 403],
    [request(undefined, { 'x-revitalize-request': '' }), 403],
    [request(undefined, { 'content-type': 'text/plain' }), 415],
    [request({ ...credentials, consent: false }), 400],
    [request({ ...credentials, consent: true, url: 'https://evil.example' }), 400],
    [request({ ...credentials, consent: true, padding: 'x'.repeat(3000) }), 400],
  ]) {
    const response = await handler(input); assert.equal(response.status, status);
    assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal(calls, 0);
});

test('server rate limits a shared account despite forged IPs, bounds global concurrency, and sanitizes errors', async () => {
  let time = 0, calls = 0;
  const handler = createSchoolHandler({ now: () => time, fetchGrades: async () => { calls++; throw new Error('password=PRIVATE school HTML'); } });
  const first = await handler(request()); assert.equal(first.status, 502); assert.equal((await first.text()).includes('PRIVATE'), false);
  const second = await handler(request(undefined, { 'x-forwarded-for': '1.2.3.4' })); assert.equal(second.status, 429); assert.equal(calls, 1);
  time = 30000; await handler(request()); assert.equal(calls, 2);
  const releases = [];
  const busy = createSchoolHandler({ fetchGrades: () => new Promise(resolve => releases.push(resolve)) });
  const checks = [1, 2, 3].map(id => busy(request({ ...credentials, username: `12345670${id}`, consent: true })));
  while (releases.length < 3) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await busy(request({ ...credentials, username: '123456710', consent: true }))).status, 429);
  releases.forEach(resolve => resolve({ version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] }));
  await Promise.all(checks);
});

test('end-to-end mocked login uses the actual server, scraper, parser and client validation', async () => {
  const mock = mockSchool();
  const handler = createSchoolHandler({ fetchGrades: (value, signal) => fetchSchoolGrades(value, signal, mock.fetchImpl) });
  const adapter = createSchoolAdapter(credentials, new RequestLimiter(), { consent: true, origin: 'https://app.example', fetchImpl: async (url, init) => {
    assert.equal(url, 'https://app.example/api/school/grades');
    return handler(new Request(url, init));
  } });
  const snapshot = await adapter.fetch(signal()); assert.equal(snapshot.courses[0].reportedAverage, 85); assert.equal(snapshot.source, 'teachassist');
  const noConsent = createSchoolAdapter(credentials, new RequestLimiter(), { consent: false, fetchImpl: () => { throw new Error('must not run'); } });
  await assert.rejects(noConsent.fetch(signal()), { code: 'auth' });
  for (const [status, code] of [[401, 'auth'], [429, 'rate-limited'], [502, 'unavailable']]) {
    await assert.rejects(createSchoolAdapter(credentials, new RequestLimiter(), { consent: true, origin: 'https://app.example', fetchImpl: async () => new Response(null, { status }) }).fetch(signal()), { code });
  }
  await assert.rejects(createSchoolAdapter(credentials, new RequestLimiter(), { consent: true, origin: 'https://app.example', fetchImpl: async () => json({ source: 'synthetic' }) }).fetch(signal()), { code: 'partial' });
});

test('client rejects insecure or missing origins before sending credentials', async () => {
  let calls = 0;
  for (const origin of ['http://app.example', 'http://127.0.0.1', 'https://user:pass@app.example', 'https://app.example/path', 'javascript:alert(1)']) {
    const adapter = createSchoolAdapter(credentials, new RequestLimiter(), { consent: true, origin, fetchImpl: async () => { calls++; return json({}); } });
    await assert.rejects(adapter.fetch(signal()), { code: 'unavailable' });
  }
  assert.equal(calls, 0); assert.throws(() => schoolEndpoint(undefined));
  assert.equal(schoolEndpoint('http://localhost:8083', true), 'http://localhost:8083/api/school/grades');
});

test('forge backport rejects nested DigestAlgorithm garbage while preserving valid RSA verification', () => {
  const forge = require('node-forge');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' }, privateKeyEncoding: { type: 'pkcs1', format: 'pem' } });
  const key = forge.pki.privateKeyFromPem(privateKey), pub = forge.pki.publicKeyFromPem(publicKey);
  const digest = forge.md.sha256.create().update('invented test message');
  assert.equal(pub.verify(digest.digest().getBytes(), key.sign(digest)), true);
  const a = forge.asn1, u = a.Class.UNIVERSAL;
  const malformed = a.create(u, a.Type.SEQUENCE, true, [a.create(u, a.Type.SEQUENCE, true, [
    a.create(u, a.Type.OID, false, a.oidToDer(forge.pki.oids.sha256).getBytes()),
    a.create(u, a.Type.NULL, false, ''), a.create(u, a.Type.OCTETSTRING, false, 'garbage'),
  ]), a.create(u, a.Type.OCTETSTRING, false, digest.digest().getBytes())]);
  const signature = key.sign(a.toDer(malformed).getBytes(), 'NONE');
  assert.throws(() => pub.verify(digest.digest().getBytes(), signature), /DigestInfo/);
});

test('production login fails closed without shared rate limits, and shared denial prevents school requests', async () => {
  let calls = 0;
  const fetchGrades = async () => { calls++; throw new Error('must not reach school'); };
  const missing = createSchoolHandler({ development: false, distributedClaim: null, fetchGrades });
  assert.equal((await missing(request())).status, 503);
  const denied = createSchoolHandler({ development: false, distributedClaim: async () => 120, fetchGrades });
  const result = await denied(request()); assert.equal(result.status, 429); assert.equal(result.headers.get('retry-after'), '120');
  const down = createSchoolHandler({ development: false, distributedClaim: async () => { throw new Error('private token'); }, fetchGrades });
  const failed = await down(request()); assert.equal(failed.status, 502); assert.equal((await failed.text()).includes('private token'), false);
  assert.equal(calls, 0);
});

test('cancellation during a pending commit cannot publish signed-in grade success', async () => {
  let release;
  const snapshot = { version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] };
  const store = { load: async () => null, clear: async () => {}, save: () => new Promise(resolve => { release = resolve; }) };
  const controller = new SyncController(store, () => {});
  const pending = controller.refresh({ fetch: async () => snapshot });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  controller.cancel(); release(); await pending;
  assert.equal(controller.state.status, 'cancelled'); assert.equal(controller.state.snapshot, null);
  await controller.clear('auth');
  assert.equal(controller.state.status, 'auth'); assert.equal(controller.state.snapshot, null);
});

test('server cancellation terminates a school transport that ignores its signal', async () => {
  let started = false;
  const controller = new AbortController();
  const handler = createSchoolHandler({ fetchGrades: () => { started = true; return new Promise(() => {}); } });
  const req = new Request(request(), { signal: controller.signal });
  const pending = handler(req);
  while (!started) await new Promise(resolve => setImmediate(resolve));
  controller.abort(); assert.equal((await pending).status, 408);
});

test('shared rate limiter sends only account HMACs and bounded commands, not school credentials', async () => {
  let payload;
  const environment = { AUTH_REDIS_REST_URL: 'https://synthetic.upstash.io', AUTH_REDIS_REST_TOKEN: 'invented-token', AUTH_RATE_LIMIT_SECRET: 's'.repeat(32) };
  const limiter = configuredRateLimit(environment, async (_url, options) => { payload = options; return json({ result: 0 }); });
  assert.equal(await limiter(credentials.username, signal()), 0);
  assert.equal(payload.body.includes(credentials.username), false); assert.equal(payload.body.includes(credentials.password), false);
  assert.equal(JSON.parse(payload.body)[0], 'EVAL'); assert.equal(payload.redirect, 'error');
  assert.equal(configuredRateLimit({}), null);
  assert.equal(configuredRateLimit({ ...environment, AUTH_REDIS_REST_URL: 'http://127.0.0.1' }), null);
  const invalid = configuredRateLimit(environment, async () => json({ result: '0', error: 'private' }));
  await assert.rejects(invalid(credentials.username, signal()), { code: 'unavailable' });
});

test('patched Zod rejects oversized constrained arrays before visiting their elements and Expo schemas still work', () => {
  const { z } = require('zod'); let visited = 0;
  z.array(z.string().refine(() => { visited++; return true; })).max(1).safeParse(['a', 'b']);
  assert.equal(visited, 0);
  const plugin = { packageName: 'synthetic', cliExtensions: { commands: [{ name: 'inspect', title: 'Inspect', parameters: [{ name: 'count', type: 'number' }] }] } };
  const { createMCPDevToolsExtensionSchema } = require('../node_modules/expo/node_modules/@expo/cli/build/src/start/server/createMCPDevToolsExtensionSchema.js');
  assert.deepEqual(createMCPDevToolsExtensionSchema(plugin).parse({ command: 'inspect', count: 1 }), { command: 'inspect', count: 1 });
});

test('invalid usernames do not exhaust legitimate student school-request capacity', async () => {
  let calls = 0;
  const snapshot = { version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] };
  const handler = createSchoolHandler({ fetchGrades: async () => { calls++; return snapshot; } });
  for (let i = 0; i < 30; i++) {
    const result = await handler(request({ username: 'wrong.account', password: 'bogus', consent: true }));
    assert.equal(result.status, 400);
  }
  assert.equal((await handler(request())).status, 200);
  assert.equal(calls, 1);
});

test('slow unauthenticated bodies cannot reserve the three outbound school slots', async () => {
  const open = [];
  let calls = 0;
  const snapshot = { version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] };
  const handler = createSchoolHandler({ fetchGrades: async () => { calls++; return snapshot; } });
  for (let i = 0; i < 3; i++) {
    const abort = new AbortController();
    const stream = new ReadableStream({ start() {} });
    const hanging = new Request('https://app.example/api/school/grades', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-revitalize-request': 'school-login' },
      body: stream, duplex: 'half', signal: abort.signal,
    });
    open.push({ abort, pending: handler(hanging) });
  }
  assert.equal((await handler(request())).status, 200);
  assert.equal(calls, 1);
  for (const item of open) item.abort.abort();
  await Promise.all(open.map(item => item.pending));
});

test('unexpected final response URLs cannot publish a successful session', async () => {
  const adapter = createSchoolAdapter(credentials, new RequestLimiter(), {
    consent: true, origin: 'https://app.example',
    fetchImpl: async () => {
      const response = json({ version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] });
      Object.defineProperty(response, 'url', { value: 'https://unexpected.example/api/school/grades' });
      return response;
    },
  });
  await assert.rejects(adapter.fetch(signal()), { code: 'partial' });
});
