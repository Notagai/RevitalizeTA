import { load } from 'cheerio/slim';
import { normalizeTAResponse } from './ta-api.ts';
import { SyncError } from './sync.ts';

const SCHOOL_ORIGIN = 'https://ta.yrdsb.ca';
const colors: Record<string, string> = { ffffaa: 'KU', c0fea4: 'T', afafff: 'C', ffd490: 'A', eeeeee: 'O', cccccc: 'F', dedede: 'O' };
const invalid = (): never => { throw new SyncError('partial'); };
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
function document(html: string) {
  if (html.length > 2 * 1024 * 1024) return invalid();
  const $ = load(html);
  $('script,style,iframe,object,embed,template').remove();
  if (/Invalid Login|Access Denied|Session Expired/i.test($.root().text()))
    throw new SyncError('auth', undefined, 'auth-rejected');
  if ($('form#loginForm,input[name="password"],input[type="password"]').length)
    throw new SyncError('auth', undefined, 'login-page');
  return $;
}

/** Only exact school course endpoints; never trust hrefs as fetch destinations. */
export function schoolCourseURL(href: string): URL {
  if (href.length > 1000 || /[\\\u0000-\u001F]/.test(href)) return invalid();
  const url = new URL(href, SCHOOL_ORIGIN + '/live/students/');
  const permitted = new Set(['subject_id', 'student_id', 'semester_id', 'school_id']);
  if (url.origin !== SCHOOL_ORIGIN || url.username || url.password || url.hash || url.pathname !== '/live/students/viewReport.php'
    || !/^\d{1,15}$/.test(url.searchParams.get('subject_id') ?? '')) return invalid();
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (!permitted.has(key) || seen.has(key) || !/^\d{1,15}$/.test(value)) return invalid();
    seen.add(key);
  }
  return url;
}

/**
 * Resolve the login form's declared POST destination. Never infer external hosts,
 * allow credential-bearing GET requests, or trust arbitrary hidden input names.
 */
export function schoolLoginForm(html: string): { action: URL; subjectId: string } {
  const $ = load(html);
  const form = $('form').filter((_index, el) => $(el).find('input[type="password"], input[name="password"]').length > 0).first();
  if (!form.length) return { action: new URL(SCHOOL_ORIGIN + '/live/index.php'), subjectId: '0' };
  const method = (form.attr('method') ?? 'post').trim().toLowerCase();
  if (method !== 'post') throw new SyncError('partial', undefined, 'login-method');
  const declared = (form.attr('action') ?? '').trim();
  if (declared.length > 1000 || /[\\\u0000-\u001F]/.test(declared)) return invalid();
  const action = new URL(declared || '/live/index.php', SCHOOL_ORIGIN + '/live/index.php');
  if (action.origin !== SCHOOL_ORIGIN || action.username || action.password || action.hash
    || !['/live/index.php', '/yrdsb/index.php'].includes(action.pathname)
    || action.search) return invalid();
  const rawId = form.find('input[name="subject_id"]').first().attr('value') ?? '0';
  if (!/^\d{1,15}$/.test(rawId)) return invalid();
  return { action, subjectId: rawId };
}

/** Only follow a school-provided student-reports link on the official host. */
export function schoolReportsURL(html: string): URL | null {
  const $ = load(html);
  const targets = new Map<string, URL>();
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href');
    if (!href || href.length > 1000 || /[\\\u0000-\u001F]/.test(href)) return;
    let url: URL;
    try { url = new URL(href, SCHOOL_ORIGIN + '/live/index.php'); } catch { return; }
    if (url.origin !== SCHOOL_ORIGIN || url.username || url.password || url.hash
      || url.pathname !== '/live/students/listReports.php') return;
    const seen = new Set<string>();
    let valid = true;
    for (const [key, value] of url.searchParams) {
      if (!['student_id', 'school_id'].includes(key) || seen.has(key) || !/^\d{1,15}$/.test(value)) {
        valid = false;
        break;
      }
      seen.add(key);
    }
    if (valid && seen.has('student_id')) targets.set(url.href, url);
  });
  return targets.size === 1 ? [...targets.values()][0] : null;
}

/** This classifies only page structure, never returns school content or identifiers. */
export function schoolCoursePageKind(html: string): 'report-page' | 'login-page' | 'other-page' {
  const $ = load(html);
  const reportHeader = /student\s+reports/i.test($.root().text());
  // A login form after submitting credentials means authentication did not
  // produce a session, even if the portal returns HTTP 200.
  if ($('input[type="password"], input[name="password"]').length
    && !reportHeader) return 'login-page';
  return reportHeader ? 'report-page' : 'other-page';
}

export type SchoolCourse = {
  code: string; name: string; block: string; room: string; start_time: string; end_time: string;
  overall_mark: number | 'N/A'; isFinal: boolean; isMidterm: boolean; url: URL | null;
};
const isoDate = /\b\d{4}-\d{2}-\d{2}\b/g;
const courseTitle = /^(.{2,130}?)\s*:\s*(.+?)(?=\s+Block\s*:|$)/i;
const codePrefix = /^((?:[A-Za-z]{2,5}\d[A-Za-z0-9-]{1,14}))\s+(.+?)(?=\s+Block\s*:|$)/i;
type CourseCell = { first: string; values: string[] };
function possibleCourseTitle(value: string) {
  if (value.length > 500) return null;
  const match = value.match(courseTitle) ?? value.match(codePrefix);
  if (!match) return null;
  let code = match[1].trim();
  if (code.includes(' - ')) code = code.slice(code.lastIndexOf(' - ') + 3).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,100}$/.test(code)) return null;
  const name = match[2].trim();
  if (!name || name.length > 300) return null;
  return { code, name };
}
function getCourseRows(html: string) {
  const $ = document(html);
  const tables = $('table').toArray();
  const data: { cells: CourseCell; row: unknown }[] = [];
  // Collect only direct cells from rows, regardless of whether the school used
  // td/th, nested layout tables, a width attribute, or split date columns.
  $('tr').each((_i, row) => {
    const cells = $(row).children('td,th');
    if (cells.length < 2 || cells.length > 10) return;
    const values = cells.map((_j, cell) => clean($(cell).text())).get();
    if (!possibleCourseTitle(values[0])) return;
    data.push({ cells: { first: values[0], values }, row });
  });
  return { $, tables, data };
}

/**
 * Non-identifying structural classification. Never reveal student names,
 * grades, course codes, links, session tokens, or actual HTML.
 */
export function schoolTimetableFailure(html: string):
  'course-no-tables' | 'course-no-rows' | 'course-no-dates' | 'course-unrecognized' {
  const { tables, data } = getCourseRows(html);
  if (!tables.length) return 'course-no-tables';
  if (!data.length) return 'course-no-rows';
  const withDates = data.filter(entry =>
    (entry.cells.values.join(' ').match(isoDate) ?? []).length >= 2);
  return withDates.length ? 'course-unrecognized' : 'course-no-dates';
}

export function parseSchoolCourses(html: string): SchoolCourse[] {
  const { $, data } = getCourseRows(html);
  if (!data.length || data.length > 40) return invalid();
  const courses: SchoolCourse[] = [];

  for (const item of data) {
    const row = $(item.row as Parameters<ReturnType<typeof load>>[0]);
    const cells = row.children('td,th');
    const values = item.cells.values;
    const parsedTitle = possibleCourseTitle(item.cells.first);
    if (!parsedTitle) return invalid();
    const dates = values.join(' ').match(isoDate) ?? [];
    if (dates.length !== 2 || dates[0] > dates[1]) return invalid();
    const meta = values.slice(0, Math.min(2, values.length)).join(' ');
    const block = meta.match(/\bBlock\s*:\s*P?\s*([1-5])\b/i);
    const room = meta.match(/\brm\.\s*([^\s,;]+)/i)?.[1] ?? 'N/A';
    // Mark columns may be followed by auxiliary columns such as a status or
    // credit. Scan rather than assuming the final cell is always the grade.
    const markText = values.slice(1).join(' ');
    const mark = markText.match(/(?:current\s*mark\s*=|(?:FINAL|MIDTERM)\s*MARK\s*:)\s*(\d+(?:\.\d+)?)\s*%/i);
    if (mark && Number(mark[1]) > 100) return invalid();
    const noGrade = !markText || /(?:please\s+see\s+teacher\s+for\s+current\s+status|no\s+mark|not\s+available|n[/]a|see\s+teacher|no\s+grade)/i.test(markText);
    const link = cells.find('a[href]').toArray().map(el => $(el).attr('href') ?? '')
      .find(href => /^((?:\.\.\/)*viewReport\.php|\/live\/students\/viewReport\.php|https:\/\/ta\.yrdsb\.ca\/live\/students\/viewReport\.php)\?/i.test(href));
    // A course without a current grade is valid. A grade-shaped page with a
    // nonnumeric status is not silently converted to a grade.
    const looksGraded = /(?:current\s*mark|final\s*mark|midterm\s*mark)\s*[:=]/i.test(markText);
    if (!mark && looksGraded && !noGrade) return invalid();
    courses.push({
      ...parsedTitle, block: block?.[1] ?? '0', room,
      start_time: dates[0], end_time: dates[1],
      overall_mark: mark ? Number(mark[1]) : 'N/A',
      isFinal: /FINAL\s+MARK/i.test(markText), isMidterm: /MIDTERM\s+MARK/i.test(markText),
      url: link ? schoolCourseURL(link) : null,
    });
  }
  if (new Set(courses.map(c => c.code + ':' + c.start_time + ':' + c.block)).size !== courses.length) return invalid();
  return courses;
}

export function parseSchoolReport(html: string) {
  const $ = document(html);
  const reportInvalid = (reason: 'report-cell' | 'report-assignment' | 'report-weighting' | 'report-layout'): never => { throw new SyncError('partial', undefined, reason); };
  const assignments: Record<string, unknown>[] = [];
  const weight_table: Record<string, { CW: number; W: number; SA: number | null }> = {};
  const text = (el: Parameters<ReturnType<typeof load>>[0]) => clean($(el).text());
  const categoryFor = (value: string): string | null => {
    const name = value.toLowerCase();
    if (/\bknowledge\b/.test(name)) return 'KU';
    if (/\bthinking\b/.test(name)) return 'T';
    if (/\bcommunication\b/.test(name)) return 'C';
    if (/\bapplication\b/.test(name)) return 'A';
    if (/\bother\b/.test(name)) return 'O';
    if (/\bfinal\b/.test(name)) return 'F';
    return null;
  };
  const percentValue = (value: string): number | null => {
    if (!value.trim() || /^N\/A$/i.test(value.trim())) return null;
    const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) && number <= 100 ? number : null;
  };

  // Weightings exist in multiple real TeachAssist variants:
  //  - legacy: table cellpadding="5" with colored rows and four cells
  //  - current: a separate 90%-wide table, often with a heading row above
  //    "Category", then three cells per category, with bgcolor on each tr.
  // Some current reports leave both weighting columns blank; that means
  // weight data is NOT published, never that every category really weighs 0%.
  const weightedTables = $('table').filter((_i, table) => {
    const directRows = $(table).children('tr,tbody,thead,tfoot').find('tr').addBack('tr');
    const keys = new Set<string>();
    directRows.each((_j, row) => {
      const key = colors[($(row).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
      if (key && $(row).children('td').length >= 3) keys.add(key);
    });
    return keys.size >= 2;
  });

  weightedTables.first().find('tr').each((_i, row) => {
    const category = colors[($(row).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
    if (!category) return;
    const cells = $(row).children('td').map((_j, cell) => text(cell)).get();
    if (cells.length < 3 || cells.length > 5 || weight_table[category]) return reportInvalid('report-weighting');
    const values = cells.slice(1).map(percentValue);
    const allBlank = cells.slice(1).every(value => value === '' || /^N\/A$/i.test(value));
    if (values.some((v, i) => v === null && !allBlank && !/^N\/A$/i.test(cells[i + 1]) && cells[i + 1] !== '')) return reportInvalid('report-weighting');
    if (allBlank) {
      // Zeroes are a sentinel for unpublished category weights. The UI must
      // render "Not published" rather than an invented percentage.
      weight_table[category] = { W: 0, CW: 0, SA: null };
      return;
    }
    if (values.length === 2) {
      weight_table[category] = { W: values[0] ?? 0, CW: values[0] ?? 0, SA: values[1] };
    } else {
      const maybeFinal = category === 'F' && values.length === 2;
      if (maybeFinal) values.unshift(0);
      const weight = values.length >= 3 ? values[1] : values[0];
      if (weight === null || weight === undefined) return reportInvalid('report-weighting');
      weight_table[category] = { W: values[0] ?? 0, CW: weight, SA: values.length >= 3 ? values[2] : null };
    }
  });

  // Older reports put text headings and colored cells instead of colored rows.
  if (!Object.keys(weight_table).length) {
    const tables = $('table').filter((_i, table) => {
      const headings = $(table).find('tr').slice(0, 3).map((_j, row) => text(row)).get().join(' ').toLowerCase();
      return /categor(y|ies)/.test(headings) && /course\s*weighting/.test(headings);
    });
    tables.first().find('tr').each((_i, row) => {
      const cells = $(row).children('td');
      if (cells.length < 3) return;
      const category = categoryFor(text(cells.eq(0)));
      if (!category) return;
      const values = cells.map((_j, cell) => text(cell)).get();
      const weighted = percentValue(values[cells.length >= 4 ? 2 : 1]);
      const current = percentValue(values[1]);
      const achievement = percentValue(values[cells.length >= 4 ? 3 : 2]);
      if (weighted === null || weight_table[category]) return reportInvalid('report-weighting');
      weight_table[category] = { CW: weighted, W: current ?? weighted, SA: achievement };
    });
  }

  // If an assignment table has recognizable colored score cells but the
  // weighting table is absent, retain categories with unknown (0) weights
  // rather than discarding otherwise valid assessment details.
  if (!Object.keys(weight_table).length) {
    $('table[width="100%"] td[bgcolor]').each((_i, cell) => {
      const category = colors[($(cell).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
      if (category && !weight_table[category]) weight_table[category] = { W: 0, CW: 0, SA: null };
    });
  }

  // Grade cells can contain nested tables. Read colored descendants, but only
  // store cells with actual grade/status data and a declared numeric weight.
  $('table[width="100%"] tr').each((_i, row) => {
    const title = $(row).children('td[rowspan]').first();
    if (!title.length) return;
    if (assignments.length >= 2000) return reportInvalid('report-assignment');
    const name = text(title);
    if (!name) return reportInvalid('report-assignment');
    const assignment: Record<string, unknown> = { name };
    let parts = 0;
    $(row).find('td[bgcolor]').each((_j, cell) => {
      const category = colors[($(cell).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
      if (!category) return;
      const value = text(cell);
      if (!value) return;
      const points = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      const weight = value.match(/\bweight\s*=\s*(\d+(?:\.\d+)?)/i);
      const noWeight = /\bno\s+weight\b/i.test(value);
      const pending = /not\s*finished|unfinished|ungraded|pending|N\/A/i.test(value);
      const exempt = /\bexempt\b|\bno\s+mark\b/i.test(value);
      const missing = /\bmissing\b/i.test(value);
      if (!points && !pending && !exempt && !missing) {
        // Never quietly drop a school grade with an unfamiliar score format.
        if (weight || noWeight || /\d\s*%/.test(value)) return reportInvalid('report-cell');
        return;
      }
      if ((!weight && !noWeight) || !weight_table[category]) return reportInvalid('report-cell');
      const earned = points ? Number(points[1]) : null;
      const possible = points ? Number(points[2]) : 0;
      const weighting = weight ? Number(weight[1]) : 0;
      if (!Number.isFinite(possible) || !Number.isFinite(weighting) || weighting > 100
        || earned !== null && (earned > possible || possible <= 0)) return reportInvalid('report-cell');
      const existing = assignment[category] as Record<string, unknown>[] | undefined;
      if (existing && existing.length >= 20) return reportInvalid('report-assignment');
      const component = { get: pending || exempt || missing ? null : earned, total: possible,
        weight: weighting, finished: !pending && !missing, exempt, missing };
      if (existing) existing.push(component); else assignment[category] = [component];
      parts++;
    });
    if (!parts) return reportInvalid('report-assignment');
    assignments.push(assignment);
  });
  if (!Object.keys(weight_table).length && !/No (?:assessments|assignments|marks)/i.test($.root().text())) return reportInvalid('report-layout');
  return { assignments, weight_table };
}

export function schoolSnapshot(courses: (SchoolCourse & ReturnType<typeof parseSchoolReport>)[], checkedAt: string) {
  // Validate using TeachAssist's actual provenance so an explicit all-zero
  // weighting sentinel means "unpublished" rather than a fabricated estimate.
  return normalizeTAResponse(courses, checkedAt, 'teachassist');
}
