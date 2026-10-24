import { abortable, boundedText } from './http.ts';
import { clearTableDebugCapture, rememberTableDebugPage } from './debug-table.ts';
import { validSchoolCredentials, type Credentials } from './school-auth.ts';
import { SyncError, type SchoolStage } from './sync.ts';
import { parseSchoolCourses, parseSchoolReport, schoolCourseURL, schoolSnapshot, schoolLoginForm, schoolReportsURL, schoolCoursePageKind, schoolTimetableFailure, type SchoolCourse } from './school-parser.ts';

const LOGIN = 'https://ta.yrdsb.ca/live/index.php';

/** No shared cookie jar, credentials in URLs, browser execution, or arbitrary hosts. */
export async function fetchSchoolGrades(credentials: Credentials, signal: AbortSignal, fetchImpl: typeof fetch = fetch) {
  if (!validSchoolCredentials(credentials)) throw new SyncError('auth');
  clearTableDebugCapture();
  const cookies = new Map<string, string>();
  let totalBytes = 0;
  async function request(url: URL, body?: URLSearchParams, redirects = 0): Promise<string> {
    if (signal.aborted) throw new SyncError('cancelled');
    const response = await abortable(fetchImpl(url, {
      method: body ? 'POST' : 'GET', headers: { Accept: 'text/html', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(cookies.size ? { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}) },
      ...(body ? { body: body.toString() } : {}), signal, redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    }), signal);
    // Expo SDK 58 Android sets response.redirected=true for a *raw 3xx response*
    // even with redirect:'manual'. That flag alone does not mean it auto-followed.
    // Reject any changed request URL, or an actually auto-followed successful response.
    const isRedirectStatus = response.status >= 300 && response.status < 400;
    if ((response.url && response.url !== url.href) || (response.redirected && !isRedirectStatus)) {
      throw new SyncError('partial', undefined, 'redirect');
    }
    const setCookies = response.headers.getSetCookie?.() ?? response.headers.get('set-cookie')?.split(/,\s*(?=[A-Za-z0-9_-]+=)/) ?? [];
    for (const cookie of setCookies) {
      if (cookie.length > 4096) throw new SyncError('partial', undefined, 'cookie');
      const domain = cookie.match(/;\s*domain=([^;]+)/i)?.[1].replace(/^\./, '').toLowerCase();
      if (domain && domain !== 'ta.yrdsb.ca') continue;
      const pair = cookie.match(/^([A-Za-z0-9_-]{1,100})=([^;\r\n]*)/);
      if (!pair || pair[2].length > 2048) throw new SyncError('partial', undefined, 'cookie');
      if (/;\s*max-age=0(?:;|$)/i.test(cookie)) cookies.delete(pair[1]); else cookies.set(pair[1], pair[2]);
      if (cookies.size > 20 || [...cookies.values()].join('').length > 8192) throw new SyncError('partial', undefined, 'cookie');
    }
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      // Never replay a password on a 307/308 or forward a session to another host.
      if (![301, 302, 303].includes(response.status) || redirects >= 3) throw new SyncError('partial', undefined, 'redirect');
      const location = response.headers.get('location');
      if (!location) throw new SyncError('partial', undefined, 'redirect');
      const target = new URL(location, url);
      if (target.origin !== 'https://ta.yrdsb.ca' || target.username || target.password || target.hash
        || !['/live/index.php', '/yrdsb/index.php', '/live/students/listReports.php', '/live/students/viewReport.php'].includes(target.pathname)) throw new SyncError('partial', undefined, 'redirect');
      if (target.pathname === '/live/students/viewReport.php') schoolCourseURL(target.href);
      else for (const [name, value] of target.searchParams) {
        if (!['student_id', 'subject_id', 'semester_id', 'school_id'].includes(name) || !/^\d{1,15}$/.test(value)) throw new SyncError('partial', undefined, 'redirect');
      }
      // Some TeachAssist sessions require student_id alongside session_token.
      // Only the official server's validated redirect may supply this cookie.
      const studentId = target.searchParams.get('student_id');
      if (studentId && cookies.has('session_token')) cookies.set('student_id', studentId);
      return request(target, undefined, redirects + 1);
    }
    if (response.status === 401 || response.status === 403) throw new SyncError('auth');
    if (response.status === 429) throw new SyncError('rate-limited');
    if (!response.ok) throw new SyncError(response.status === 0 ? 'partial' : 'unavailable', undefined, response.status === 0 ? 'redirect' : 'status');
    if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new SyncError('partial', undefined, 'content-type');
    if (!response.body || typeof response.body.getReader !== 'function') throw new SyncError('partial', undefined, 'body-stream');
    const html = await boundedText(response, 2 * 1024 * 1024, signal);
    totalBytes += new TextEncoder().encode(html).byteLength;
    if (totalBytes > 8 * 1024 * 1024) throw new SyncError('partial');
    return html;
  }
  async function atStage<T>(stage: SchoolStage, action: () => Promise<T> | T): Promise<T> {
    try { return await action(); }
    catch (error) {
      if (error instanceof SyncError) {
        throw new SyncError(error.code, stage,
          error.reason ?? (stage === 'course-table' || stage === 'course-report' ? 'parser' : undefined));
      }
      // Do not expose native exception messages, which can include URLs or headers.
      throw new SyncError('partial', stage,
        stage === 'course-table' || stage === 'course-report' ? 'parser' : 'native-exception');
    }
  }
  try {
    // Fetch a session page and submit the official form using HTTPS POST.
    // Never retry login using credential-bearing GET URLs.
    const loginPage = await atStage('initial-page', () => request(new URL(LOGIN)));
    const form = await atStage('initial-page', () => schoolLoginForm(loginPage));
    const html = await atStage('login-submission', () => request(form.action,
      new URLSearchParams({ username: credentials.username, password: credentials.password,
        subject_id: form.subjectId, submit: 'Login' })));
    const parseTimetable = (page: string): SchoolCourse[] => {
      // Only the synthetic, redacted structure is held in memory. Never save
      // or expose the school's original HTML, cookies, or credentials.
      rememberTableDebugPage(page, 'course-list');
      try { return parseSchoolCourses(page); }
      catch (error) {
        if (error instanceof SyncError && error.code === 'partial') {
          const kind = schoolCoursePageKind(page);
          const reason = kind === 'report-page' ? schoolTimetableFailure(page) : 'portal-page';
          throw new SyncError('partial', undefined, reason);
        }
        throw error;
      }
    };
    let courses: SchoolCourse[];
    try {
      courses = await atStage('course-table', () => parseTimetable(html));
    } catch (error) {
      if (!(error instanceof SyncError) || error.code !== 'partial') throw error;
      // A school landing page sometimes links to the student report page rather
      // than embedding the timetable. Follow one explicitly linked, validated GET.
      // No credentials are added to the URL and the same session stays in memory.
      const linked = schoolReportsURL(html);
      // TeachAssist also sets an authenticated student_id cookie on some
      // installations. Use it only with a server-issued session token.
      // Never guess identifiers from the supplied login credentials.
      const cookieId = cookies.get('student_id');
      const reportList = linked ?? (cookies.has('session_token') && cookieId && /^\d{1,15}$/.test(cookieId)
        ? new URL(`/live/students/listReports.php?student_id=${cookieId}`, LOGIN) : null);
      if (!reportList) throw error;
      const studentId = reportList.searchParams.get('student_id');
      if (studentId && cookies.has('session_token')) cookies.set('student_id', studentId);
      const listing = await atStage('course-table', () => request(reportList));
      courses = await atStage('course-table', () => parseTimetable(listing));
    }
    const reports: (SchoolCourse & ReturnType<typeof parseSchoolReport>)[] = [];
    for (const course of courses) {
      const report = course.url
        ? await atStage('course-report', async () => {
          const raw = await request(course.url!);
          rememberTableDebugPage(raw, 'course-report');
          return parseSchoolReport(raw);
        })
        : { assignments: [], weight_table: {} };
      reports.push({ ...course, ...report });
    }
    return await atStage('course-report', () => schoolSnapshot(reports, new Date().toISOString()));
  } finally { cookies.clear(); }
}
