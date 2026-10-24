import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { abortable, boundedText } from '../src/core/http.ts';
import { createSchoolAdapter, validSchoolCredentials } from '../src/core/school-auth.ts';
import { RequestLimiter } from '../src/core/ta-api.ts';
import { parseSchoolCourses, parseSchoolReport, schoolCourseURL, schoolSnapshot, schoolLoginForm } from '../src/core/school-parser.ts';
import { fetchSchoolGrades } from '../src/core/direct-school.ts';
import { SyncController } from '../src/core/sync.ts';
import { credentials, loginHTML, courseHTML, compactCourseHTML, reportHTML, mockSchool } from './fixtures/school-html.mjs';

const require = createRequire(import.meta.url);
const signal = () => new AbortController().signal;

test('direct school parsing preserves zero and groups marks without executing HTML', () => {
  const courses = parseSchoolCourses(courseHTML(0));
  assert.equal(courses[0].overall_mark, 0);
  assert.equal(courses[0].room, '306');
  const report = parseSchoolReport(reportHTML + '<script>globalThis.schoolScriptRan=true</script>');
  const snapshot = schoolSnapshot([{ ...courses[0], ...report }], new Date().toISOString());
  assert.equal(snapshot.source, 'teachassist');
  assert.equal(snapshot.courses[0].assessments.length, 3);
  assert.equal(snapshot.courses[0].assessments[2].status, 'ungraded');
  assert.equal(globalThis.schoolScriptRan, undefined);
  assert.throws(() => parseSchoolCourses(loginHTML), { code: 'auth' });
  assert.throws(() => parseSchoolCourses('<html>Unexpected</html>'), { code: 'partial' });
  assert.throws(() => parseSchoolReport('<html>Unexpected</html>'), { code: 'partial' });
});

test('only the official HTTPS course endpoints may be fetched', () => {
  assert.equal(schoolCourseURL('viewReport.php?subject_id=123').origin, 'https://ta.yrdsb.ca');
  for (const href of ['https://evil.example/viewReport.php?subject_id=1', '//evil.example/x', 'javascript:alert(1)',
    'https://evil@ta.yrdsb.ca/live/students/viewReport.php?subject_id=1', 'delete.php?subject_id=1',
    'viewReport.php?subject_id=1&password=secret', 'viewReport.php?subject_id=1&subject_id=2',
    'viewReport.php?subject_id=1#fragment', 'viewReport.php?subject_id=1\r\nInjected: true'])
    assert.throws(() => schoolCourseURL(href));
});

test('official login uses on-device HTTPS form POST without a proxy or credential URL', async () => {
  const mock = mockSchool();
  const snapshot = await fetchSchoolGrades(credentials, signal(), mock.fetchImpl);
  assert.equal(snapshot.source, 'teachassist');
  assert.equal(mock.requests.length, 3);
  const post = mock.requests[1];
  assert.equal(post.url, 'https://ta.yrdsb.ca/live/index.php');
  assert.equal(post.options.method, 'POST');
  assert.equal(new URLSearchParams(post.options.body).get('username'), credentials.username);
  assert.equal(new URLSearchParams(post.options.body).get('password'), credentials.password);
  assert.equal(post.options.headers.Cookie, 'PHPSESSID=synthetic-session');
  for (const call of mock.requests) {
    assert.equal(new URL(call.url).origin, 'https://ta.yrdsb.ca');
    assert.equal(call.options.redirect, 'manual');
    assert.equal(call.url.includes('password='), false);
  }
});

test('unexpected redirects and final URLs are rejected, never silently followed', async () => {
  const starts = [];
  const fake = target => async (_url, options) => {
    if (options.method === 'GET') {
      starts.push(options.headers.Cookie);
      return new Response(loginHTML, { headers: { 'content-type': 'text/html', 'set-cookie': 'PHPSESSID=private; Secure' } });
    }
    if (target.followed) {
      const response = new Response(courseHTML(), { headers: { 'content-type': 'text/html' } });
      Object.defineProperty(response, 'url', { value: target.url });
      return response;
    }
    return new Response(null, { status: target.status, headers: { location: target.url } });
  };
  for (const target of [
    { status: 302, url: 'https://evil.example/' },
    { status: 307, url: '/live/index.php' },
    { status: 302, url: '/live/students/delete.php?subject_id=1' },
    { followed: true, url: 'https://evil.example/' },
  ]) await assert.rejects(fetchSchoolGrades(credentials, signal(), fake(target)), { code: 'partial' });
  assert.deepEqual(starts, [undefined, undefined, undefined, undefined]);
});

test('invalid identifiers are rejected and complex passwords are preserved', () => {
  assert.equal(validSchoolCredentials(credentials), true);
  assert.equal(validSchoolCredentials({ username: '123456789', password: 'longer-password-with-symbols!%' }), true);
  for (const value of [null, {}, { ...credentials, password: 123 },
    { ...credentials, username: 'synthetic.user' }, { ...credentials, username: '12345678' },
    { ...credentials, password: 'x\u0000y' }])
    assert.equal(validSchoolCredentials(value), false);
});

test('adapter calls local school scraper directly, refuses missing consent and respects cancellation', async () => {
  const school = mockSchool();
  const adapter = createSchoolAdapter(credentials, new RequestLimiter(), {
    consent: true, fetchGrades: (value, abort) => fetchSchoolGrades(value, abort, school.fetchImpl),
  });
  const result = await adapter.fetch(signal());
  assert.equal(result.source, 'teachassist');
  assert.equal(result.courses[0].reportedAverage, 85);
  assert.equal(school.requests.length, 3);
  await assert.rejects(createSchoolAdapter(credentials, new RequestLimiter(), {
    consent: false, fetchGrades: async () => { throw new Error('must not run'); },
  }).fetch(signal()), { code: 'auth' });
  const controller = new AbortController();
  const stalled = createSchoolAdapter(credentials, new RequestLimiter(), {
    consent: true, fetchGrades: async () => new Promise(() => {}),
  }).fetch(controller.signal);
  controller.abort();
  await assert.rejects(stalled, { code: 'cancelled' });
});

test('bounded HTML readers and aborted requests are rejected', async () => {
  await assert.rejects(boundedText(new Response('x'.repeat(50), { headers: { 'content-length': '1' } }), 10, signal()), { code: 'partial' });
  const abort = new AbortController();
  const pending = abortable(new Promise(() => {}), abort.signal);
  abort.abort();
  await assert.rejects(pending, { code: 'cancelled' });
});

test('cancelled grade persistence cannot publish success', async () => {
  let release;
  const snapshot = { version: 3, source: 'teachassist', checkedAt: new Date().toISOString(), courses: [] };
  const store = { load: async () => null, clear: async () => {}, save: () => new Promise(resolve => { release = resolve; }) };
  const controller = new SyncController(store, () => {});
  const pending = controller.refresh({ fetch: async () => snapshot });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  controller.cancel(); release(); await pending;
  assert.equal(controller.state.status, 'cancelled');
  assert.equal(controller.state.snapshot, null);
});

test('node-forge backport rejects nested DigestAlgorithm garbage', () => {
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

test('patched Zod rejects oversized arrays before visiting elements', () => {
  const { z } = require('zod'); let visited = 0;
  z.array(z.string().refine(() => { visited++; return true; })).max(1).safeParse(['a', 'b']);
  assert.equal(visited, 0);
});

test('three-column TeachAssist layout parses dates, block, grade link, and hidden marks', () => {
  const courses = parseSchoolCourses(compactCourseHTML());
  assert.equal(courses.length, 2);
  assert.equal(courses[0].code, 'MHF4U-01');
  assert.equal(courses[0].name, 'Advanced Functions');
  assert.equal(courses[0].block, '1');
  assert.equal(courses[0].room, '306');
  assert.equal(courses[0].start_time, '2026-09-08');
  assert.equal(courses[0].end_time, '2027-01-29');
  assert.equal(courses[0].overall_mark, 94.5);
  assert.equal(courses[0].url.searchParams.get('school_id'), '12');
  assert.equal(courses[1].overall_mark, 'N/A');
  assert.equal(courses[1].url, null);
  assert.throws(() => schoolCourseURL('viewReport.php?subject_id=123456&school_id=12&school_id=13'), { code: 'partial' });
  assert.throws(() => schoolCourseURL('viewReport.php?subject_id=123456&school_id=evil'), { code: 'partial' });
});

test('full direct login can parse the current compact TeachAssist timetable', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    return new Response(options.method === 'POST' ? compactCourseHTML() :
      String(url).includes('viewReport.php') ? reportHTML : loginHTML,
      { headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'session_token=invented-session; Secure; HttpOnly' } });
  };
  const snapshot = await fetchSchoolGrades(credentials, signal(), fakeFetch);
  assert.equal(snapshot.source, 'teachassist');
  assert.equal(snapshot.courses.length, 2);
  assert.equal(snapshot.courses[0].reportedAverage, 94.5);
  assert.equal(snapshot.courses[1].reportedAverage, null);
  assert.equal(calls.filter(x => x.method === 'GET' && x.url.includes('viewReport.php')).length, 1);
  for (const call of calls) assert.equal(new URL(call.url).origin, 'https://ta.yrdsb.ca');
});

test('failed stages expose only fixed diagnostic labels', async () => {
  const html = new Response('unrecognized page', { headers: { 'content-type': 'text/html' } });
  const bad = async (_url, options) => options.method === 'POST' ? html.clone() :
    new Response(loginHTML, { headers: { 'content-type': 'text/html' } });
  await assert.rejects(fetchSchoolGrades(credentials, signal(), bad), error =>
    error.code === 'partial' && error.stage === 'course-table' && error.message === 'partial');
});

test('native response without a readable body reports the failing stage safely', async () => {
  const response = new Response(loginHTML, { headers: { 'content-type': 'text/html' } });
  Object.defineProperty(response, 'body', { value: null });
  await assert.rejects(
    fetchSchoolGrades(credentials, signal(), async () => response),
    error => error.code === 'partial' && error.stage === 'initial-page'
      && error.reason === 'body-stream' && error.message === 'partial',
  );
});

test('native transport exceptions never expose raw error messages or account details', async () => {
  const detail = 'school-password-is-private';
  await assert.rejects(
    fetchSchoolGrades(credentials, signal(), async () => { throw new TypeError(detail); }),
    error => error.code === 'partial' && error.stage === 'initial-page'
      && error.reason === 'native-exception' && !error.message.includes(detail),
  );
});

test('native redirects identify a safe reason without logging the target URL', async () => {
  const response = new Response(loginHTML, { headers: { 'content-type': 'text/html' } });
  Object.defineProperty(response, 'redirected', { value: true });
  await assert.rejects(
    fetchSchoolGrades(credentials, signal(), async () => response),
    error => error.code === 'partial' && error.stage === 'initial-page' && error.reason === 'redirect',
  );
});

test('Expo Android manual 302 login redirect is followed only by an allowed GET', async () => {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const path = new URL(url).pathname;
    let response;
    if (options.method === 'POST') {
      response = new Response(null, { status: 302, headers: {
        location: '/live/index.php?subject_id=0',
        'set-cookie': 'PHPSESSID=post-session; Secure; HttpOnly; Path=/live/',
      } });
      // On Android Expo SDK 58, redirected is true on the raw 302 response.
      Object.defineProperty(response, 'redirected', { value: true });
      Object.defineProperty(response, 'url', { value: String(url) });
    } else {
      response = new Response(path.endsWith('viewReport.php') ? reportHTML :
        String(url).includes('subject_id=0') ? courseHTML() : loginHTML,
        { headers: { 'content-type': 'text/html', 'set-cookie': 'PHPSESSID=mock-session; Secure' } });
      Object.defineProperty(response, 'url', { value: String(url) });
    }
    return response;
  };
  const snapshot = await fetchSchoolGrades(credentials, signal(), mockFetch);
  assert.equal(snapshot.source, 'teachassist');
  assert.equal(snapshot.courses[0].reportedAverage, 85);
  assert.deepEqual(calls.map(c => c.options.method), ['GET', 'POST', 'GET', 'GET']);
  assert.equal(calls[2].url, 'https://ta.yrdsb.ca/live/index.php?subject_id=0');
  assert.equal(calls[2].options.headers.Cookie, 'PHPSESSID=post-session');
  for (const call of calls) {
    assert.equal(new URL(call.url).origin, 'https://ta.yrdsb.ca');
    assert.equal(call.options.redirect, 'manual');
  }
});

test('Expo Android 307 and any auto-followed response still fail closed', async () => {
  for (const status of [307, 308]) {
    let requestCount = 0;
    await assert.rejects(fetchSchoolGrades(credentials, signal(), async (url, options) => {
      requestCount++;
      if (options.method === 'GET') return new Response(loginHTML, { headers: { 'content-type': 'text/html' } });
      const response = new Response(null, { status, headers: { location: 'https://evil.example/' } });
      Object.defineProperty(response, 'redirected', { value: true });
      Object.defineProperty(response, 'url', { value: String(url) });
      return response;
    }), error => error.code === 'partial' && error.stage === 'login-submission'
        && error.reason === 'redirect');
    assert.equal(requestCount, 2);
  }
  const response = new Response(courseHTML(), { headers: { 'content-type': 'text/html' } });
  Object.defineProperty(response, 'redirected', { value: true });
  await assert.rejects(fetchSchoolGrades(credentials, signal(), async () => response),
    error => error.code === 'partial' && error.reason === 'redirect');
});

test('official login form action is resolved on-device but constrained to allowlisted HTTPS POST targets', () => {
  const form = '<html><form action="/yrdsb/index.php" method="post">' +
    '<input type="hidden" name="subject_id" value="0">' +
    '<input name="password" type="password"></form></html>';
  assert.equal(schoolLoginForm(form).action.href, 'https://ta.yrdsb.ca/yrdsb/index.php');
  assert.equal(schoolLoginForm(form).subjectId, '0');
  for (const action of ['https://evil.example/login', '//evil.example/login',
    'https://ta.yrdsb.ca/live/students/delete.php', '/live/index.php?password=anything']) {
    assert.throws(() => schoolLoginForm(form.replace('/yrdsb/index.php', action)), { code: 'partial' });
  }
  assert.throws(() => schoolLoginForm(form.replace('method="post"', 'method="get"')),
    error => error.code === 'partial' && error.reason === 'login-method');
});

test('official login form can post to /yrdsb/index.php and load grades via safe redirect', async () => {
  const calls = [];
  const loginForm = '<form action="/yrdsb/index.php" method="post">' +
    '<input name="password" type="password"></form>';
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), method: options.method });
    if (options.method === 'POST') {
      const redirected = new Response(null, { status: 302, headers: {
        location: '/live/students/listReports.php?student_id=123456789',
        'set-cookie': 'session_token=synthetic-session; Secure; HttpOnly',
      } });
      Object.defineProperty(redirected, 'redirected', { value: true });
      Object.defineProperty(redirected, 'url', { value: String(url) });
      return redirected;
    }
    const html = calls.length === 1 ? loginForm :
      String(url).includes('viewReport.php') ? reportHTML : compactCourseHTML();
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchSchoolGrades(credentials, signal(), fetchImpl);
  assert.equal(result.courses.length, 2);
  assert.equal(calls[1].url, 'https://ta.yrdsb.ca/yrdsb/index.php');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[2].url, 'https://ta.yrdsb.ca/live/students/listReports.php?student_id=123456789');
});

test('course parser handles an unmarked timetable table surrounded by navigation and headers', () => {
  const html = '<html><table><tr><td>Navigation</td><td>Teachers</td><td>Courses</td></tr></table>' +
    '<div><table><tr><th>My reports</th></tr>' +
    '<tr><td>ENG2D-01 : English Block: 3 - rm. 216</td><td>2026-09-08 ~ 2027-01-29</td>' +
    '<td><a href="viewReport.php?subject_id=123456&amp;student_id=987654321&amp;school_id=12">current mark = 82%</a></td></tr>' +
    '</table></div></html>';
  const courses = parseSchoolCourses(html);
  assert.equal(courses.length, 1);
  assert.equal(courses[0].code, 'ENG2D-01');
  assert.equal(courses[0].room, '216');
  assert.equal(courses[0].block, '3');
  assert.equal(courses[0].overall_mark, 82);
});
