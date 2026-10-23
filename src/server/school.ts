import { abortable, boundedText } from '../core/http.ts';
import { validSchoolCredentials, type Credentials } from '../core/school-auth.ts';
import { SyncError } from '../core/sync.ts';
import { parseSchoolCourses, parseSchoolReport, schoolCourseURL, schoolSnapshot } from './school-parser.ts';

const LOGIN = 'https://ta.yrdsb.ca/live/index.php';

/** No shared cookie jar, credentials in URLs, browser execution, or arbitrary hosts. */
export async function fetchSchoolGrades(credentials: Credentials, signal: AbortSignal, fetchImpl: typeof fetch = fetch) {
  if (!validSchoolCredentials(credentials)) throw new SyncError('auth');
  const cookies = new Map<string, string>();
  let totalBytes = 0;
  async function request(url: URL, body?: URLSearchParams, redirects = 0): Promise<string> {
    if (signal.aborted) throw new SyncError('cancelled');
    const response = await abortable(fetchImpl(url, {
      method: body ? 'POST' : 'GET', headers: { Accept: 'text/html', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(cookies.size ? { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}) },
      ...(body ? { body: body.toString() } : {}), signal, redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    }), signal);
    const setCookies = response.headers.getSetCookie?.() ?? response.headers.get('set-cookie')?.split(/,\s*(?=[A-Za-z0-9_-]+=)/) ?? [];
    for (const cookie of setCookies) {
      if (cookie.length > 4096) throw new SyncError('partial');
      const domain = cookie.match(/;\s*domain=([^;]+)/i)?.[1].replace(/^\./, '').toLowerCase();
      if (domain && domain !== 'ta.yrdsb.ca') continue;
      const pair = cookie.match(/^([A-Za-z0-9_-]{1,100})=([^;\r\n]*)/);
      if (!pair || pair[2].length > 2048) throw new SyncError('partial');
      if (/;\s*max-age=0(?:;|$)/i.test(cookie)) cookies.delete(pair[1]); else cookies.set(pair[1], pair[2]);
      if (cookies.size > 20 || [...cookies.values()].join('').length > 8192) throw new SyncError('partial');
    }
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      // Never replay a password on a 307/308 or forward a session to another host.
      if (![301, 302, 303].includes(response.status) || redirects >= 3) throw new SyncError('partial');
      const location = response.headers.get('location');
      if (!location) throw new SyncError('partial');
      const target = new URL(location, url);
      if (target.origin !== 'https://ta.yrdsb.ca' || target.username || target.password || target.hash
        || !['/live/index.php', '/live/students/listReports.php', '/live/students/viewReport.php'].includes(target.pathname)) throw new SyncError('partial');
      if (target.pathname === '/live/students/viewReport.php') schoolCourseURL(target.href);
      else for (const [name, value] of target.searchParams) {
        if (!['student_id', 'subject_id', 'semester_id'].includes(name) || !/^\d{1,15}$/.test(value)) throw new SyncError('partial');
      }
      return request(target, undefined, redirects + 1);
    }
    if (response.status === 401 || response.status === 403) throw new SyncError('auth');
    if (response.status === 429) throw new SyncError('rate-limited');
    if (!response.ok) throw new SyncError('unavailable');
    if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new SyncError('partial');
    const html = await boundedText(response, 2 * 1024 * 1024, signal);
    totalBytes += new TextEncoder().encode(html).byteLength;
    if (totalBytes > 8 * 1024 * 1024) throw new SyncError('partial');
    return html;
  }
  try {
    // Seed any PHP session, then submit precisely the fields in the public form.
    await request(new URL(LOGIN));
    const html = await request(new URL(LOGIN), new URLSearchParams({ username: credentials.username, password: credentials.password, subject_id: '0', submit: 'Login' }));
    const courses = parseSchoolCourses(html);
    const reports = [];
    for (const course of courses) {
      const report = course.url ? parseSchoolReport(await request(course.url)) : { assignments: [], weight_table: {} };
      reports.push({ ...course, ...report });
    }
    return schoolSnapshot(reports, new Date().toISOString());
  } finally { cookies.clear(); }
}
