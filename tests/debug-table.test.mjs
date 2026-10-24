import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearTableDebugCapture, currentTableDebugCapture, rememberTableDebugPage,
  sanitizeSchoolTableHtml } from '../src/core/debug-table.ts';

test('debug HTML keeps timetable structure but no student data', () => {
  const privateHtml = '<html><script>sendSecret("private-username")</script><h1>Student Reports</h1>' +
    '<table width="85%" class="student-secret-name">' +
    '<tr><th>Course</th><th>Date</th><th>Grade</th></tr>' +
    '<tr bgcolor="#f0f0f0"><td>Secret Student - MHF4U-01 : Super Secret Course Block: P1 - rm. 310</td>' +
    '<td>2026-09-08 ~ 2027-01-29</td>' +
    '<td><a href="viewReport.php?subject_id=999999&amp;student_id=123456789&amp;school_id=54321">' +
    'current mark = 99.8%</a></td></tr></table><input name="student_id" value="123456789"></html>';
  const html = sanitizeSchoolTableHtml(privateHtml, 'course-list');
  assert.match(html, /<table width="85%"/);
  assert.match(html, /<tr bgcolor="#f0f0f0">/);
  assert.match(html, /data-shape=/);
  assert.match(html, /viewReport\.php\?subject_id=111111/);
  assert.match(html, /2000-01-01/);
  for (const secret of [
    'private-username', 'Secret Student', 'Super Secret', 'MHF4U-01',
    '2026-09-08', '2027-01-29', '99.8%', '123456789', '54321', '999999',
    'student-secret-name', 'sendSecret', '<script>', '310',
  ]) assert.equal(html.includes(secret), false, secret + ' was not redacted');
});

test('debug captures are memory-only and always replace previous capture', () => {
  clearTableDebugCapture();
  assert.equal(currentTableDebugCapture(), null);
  rememberTableDebugPage('<table><tr><td>Confidential class</td></tr></table>', 'course-list');
  assert.equal(currentTableDebugCapture()?.stage, 'course-list');
  assert.equal(currentTableDebugCapture()?.html.includes('Confidential class'), false);
  rememberTableDebugPage('<table><tr><td>Private assessment</td></tr></table>', 'course-report');
  assert.equal(currentTableDebugCapture()?.stage, 'course-report');
  assert.equal(currentTableDebugCapture()?.html.includes('Confidential class'), false);
  assert.equal(currentTableDebugCapture()?.html.includes('Private assessment'), false);
  clearTableDebugCapture();
  assert.equal(currentTableDebugCapture(), null);
});

test('nested tables and withheld grade cells remain structural only', () => {
  const original = '<h2>Student Reports</h2><table><tr><td>' +
    '<table><tr><td><a href="/live/students/listReports.php?student_id=123456789">Some name</a></td></tr></table>' +
    '</td><td>Please see teacher for current status</td></tr></table>';
  const html = sanitizeSchoolTableHtml(original, 'course-list');
  assert.equal((html.match(/<table/g) ?? []).length, 2);
  assert.match(html, /data-shape="no-mark"/);
  assert.match(html, /listReports\.php\?student_id=222222222/);
  assert.equal(html.includes('123456789'), false);
});

test('a page without a table yields explicit HTML rather than raw contents', () => {
  const html = sanitizeSchoolTableHtml('<html><div>My password is school-secret-key</div></html>', 'course-list');
  assert.match(html, /NO TABLE ELEMENTS/);
  assert.equal(html.includes('school-secret-key'), false);
});
