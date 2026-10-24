import { load } from 'cheerio/slim';
import { normalizeTAResponse } from './ta-api.ts';
import { parseSnapshot } from './model.ts';
import { SyncError } from './sync.ts';

const SCHOOL_ORIGIN = 'https://ta.yrdsb.ca';
const colors: Record<string, string> = { ffffaa: 'KU', c0fea4: 'T', afafff: 'C', ffd490: 'A', eeeeee: 'O', cccccc: 'F', dedede: 'O' };
const invalid = (): never => { throw new SyncError('partial'); };
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
function document(html: string) {
  if (html.length > 2 * 1024 * 1024) return invalid();
  const $ = load(html);
  $('script,style,iframe,object,embed,template').remove();
  if (/Invalid Login|Access Denied|Session Expired/i.test($.root().text()) || $('form#loginForm,input[name="password"]').length) throw new SyncError('auth');
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
    for (const [key, value] of url.searchParams) {
      if (!['student_id', 'school_id'].includes(key) || seen.has(key) || !/^\d{1,15}$/.test(value)) return;
      seen.add(key);
    }
    if (seen.has('student_id')) targets.set(url.href, url);
  });
  return targets.size === 1 ? [...targets.values()][0] : null;
}

/** This classifies only page structure, never returns school content or identifiers. */
export function schoolCoursePageKind(html: string): 'report-page' | 'other-page' {
  const $ = load(html);
  return /student\s+reports/i.test($.root().text()) ? 'report-page' : 'other-page';
}

export type SchoolCourse = {
  code: string; name: string; block: string; room: string; start_time: string; end_time: string;
  overall_mark: number | 'N/A'; isFinal: boolean; isMidterm: boolean; url: URL | null;
};
export function parseSchoolCourses(html: string): SchoolCourse[] {
  const $ = document(html);
  // TeachAssist often has several layout/navigation tables. Find the table
  // containing actual course rows, not a particular width or header string.
  const tables = $('table').toArray();
  const courseRows = (table: (typeof tables)[number]) => $(table).find('tr').toArray().filter(row => {
    const cells = $(row).children('td');
    if (cells.length < 3 || cells.length > 6) return false;
    const title = clean(cells.eq(0).text());
    if (!/^([^:]+)\s*:\s*(.+)/.test(title)) return false;
    const dateCells = cells.slice(1, -1).toArray().map(cell => clean($(cell).text())).join(' ');
    return (dateCells.match(/\d{4}-\d{2}-\d{2}/g) ?? []).length >= 2;
  });
  const ranked = tables.map(table => ({ table, rows: courseRows(table) })).filter(entry => entry.rows.length)
    .sort((a, b) => b.rows.length - a.rows.length);
  if (!ranked.length) return invalid();
  const rows = ranked[0].rows;
  if (rows.length > 40) return invalid();

  const courses: SchoolCourse[] = [];
  for (const row of rows) {
    const cells = $(row).children('td');
    const titleText = clean(cells.eq(0).text());
    const title = titleText.match(/^([^:]+)\s*:\s*(.+?)(?=\s+Block:|$)/i);
    if (!title) return invalid();
    const blockText = cells.length >= 5
      ? clean(cells.eq(0).text()) + ' ' + clean(cells.eq(1).text())
      : clean(cells.eq(0).text());
    const block = blockText.match(/\bBlock:\s*P?\s*([1-5])\b/i);
    const room = blockText.match(/\brm\.\s*([^,;]+?)(?:\s+Block:|$)/i)?.[1]?.trim() ?? 'N/A';
    const dateText = cells.slice(1, -1).toArray().map(cell => clean($(cell).text())).join(' ');
    const dates = dateText.match(/\d{4}-\d{2}-\d{2}/g);
    if (!dates || dates.length !== 2 || dates[0] > dates[1]) return invalid();
    const gradeCell = cells.last();
    const markText = clean(gradeCell.text());
    const mark = markText.match(/(?:current\s*mark\s*=|(?:FINAL|MIDTERM)\s*MARK\s*:)\s*(\d+(?:\.\d+)?)\s*%/i);
    const noGrade = !markText || /(?:please\s+see\s+teacher\s+for\s+current\s+status|no\s+mark|not\s+available|n[/]a|see\s+teacher)/i.test(markText);
    if (!mark && !noGrade) return invalid();
    const href = gradeCell.find('a[href]').first().attr('href')
      ?? cells.eq(0).find('a[href]').first().attr('href');
    courses.push({
      code: title[1].trim(), name: title[2].trim(), block: block?.[1] ?? '0',
      room, start_time: dates[0], end_time: dates[1],
      overall_mark: mark ? Number(mark[1]) : 'N/A', isFinal: /FINAL/i.test(markText),
      isMidterm: /MIDTERM/i.test(markText), url: href ? schoolCourseURL(href) : null,
    });
  }
  return courses;
}
export function parseSchoolReport(html: string) {
  const $ = document(html);
  const assignments: Record<string, unknown>[] = [];
  const weight_table: Record<string, { CW: number; W: number; SA: number | null }> = {};
  let matchedTable = false;
  $('table[cellpadding="5"] tr').each((_i, row) => {
    const category = colors[($(row).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
    if (!category) return;
    matchedTable = true;
    const cells = $(row).children('td').map((_i, cell) => clean($(cell).text())).get();
    const percentages = cells.slice(1).map(value => value === 'N/A' || value === '' ? null : Number(value.replace('%', '')));
    // School final rows omit the term weighting column.
    if (category === 'F' && percentages.length === 2) percentages.unshift(0);
    if (percentages.length !== 3 || percentages[1] === null || percentages.some(value => value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) || weight_table[category]) return invalid();
    weight_table[category] = { W: percentages[0] ?? 0, CW: percentages[1], SA: percentages[2] };
  });
  $('table[width="100%"] tr').each((_i, row) => {
    const title = $(row).find('td[rowspan="2"]').first();
    if (!title.length) return;
    if (assignments.length >= 2000) return invalid();
    const assignment: Record<string, unknown> = { name: clean(title.text()) };
    let components = 0;
    $(row).children('td[bgcolor]').each((_i, cell) => {
      const category = colors[($(cell).attr('bgcolor') ?? '').replace('#', '').toLowerCase()];
      if (!category || !clean($(cell).text())) return;
      if (!weight_table[category] || assignment[category]) return invalid();
      const value = clean($(cell).text());
      const points = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      const weight = value.match(/weight\s*=\s*(\d+(?:\.\d+)?)/i);
      const pending = /not\s*finished|unfinished|ungraded|pending|N\/A/i.test(value);
      const exempt = /exempt|no\s*mark/i.test(value), missing = /missing/i.test(value);
      if (!weight || (!points && !pending && !exempt && !missing)) return invalid();
      assignment[category] = [{ get: pending || exempt || missing ? null : Number(points![1]), total: points ? Number(points[2]) : 0,
        weight: Number(weight[1]), finished: !pending, exempt, missing }];
      components++;
    });
    if (!components || !assignment.name) return invalid();
    assignments.push(assignment);
  });
  if (!matchedTable && !/No (?:assessments|assignments|marks)/i.test($.root().text())) return invalid();
  return { assignments, weight_table };
}

export function schoolSnapshot(courses: (SchoolCourse & ReturnType<typeof parseSchoolReport>)[], checkedAt: string) {
  const normalized = normalizeTAResponse(courses, checkedAt);
  return parseSnapshot({ ...normalized, version: 3, source: 'teachassist' });
}
