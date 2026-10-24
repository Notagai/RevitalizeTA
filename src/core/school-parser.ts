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
  if (declared.length > 1000 || /[\\\\\u0000-\u001F]/.test(declared)) return invalid();
  const action = new URL(declared || '/live/index.php', SCHOOL_ORIGIN + '/live/index.php');
  if (action.origin !== SCHOOL_ORIGIN || action.username || action.password || action.hash
    || !['/live/index.php', '/yrdsb/index.php'].includes(action.pathname)
    || action.search) return invalid();
  const rawId = form.find('input[name="subject_id"]').first().attr('value') ?? '0';
  if (!/^\\d{1,15}$/.test(rawId)) return invalid();
  return { action, subjectId: rawId };
}

export type SchoolCourse = {
  code: string; name: string; block: string; room: string; start_time: string; end_time: string;
  overall_mark: number | 'N/A'; isFinal: boolean; isMidterm: boolean; url: URL | null;
};
export function parseSchoolCourses(html: string): SchoolCourse[] {
  const $ = document(html), courses: SchoolCourse[] = [];
  // TeachAssist uses a three-column table (course/block, dates, mark).
  // Older fixtures and installations may use five separate columns.
  const tables = $('table').filter((_i, table) =>
    $(table).attr('width') === '85%' || /Course\s*Name/i.test($(table).find('tr').first().text()));
  if (!tables.length) return invalid();
  const table = tables.filter((_i, item) =>
    $(item).find('tr').toArray().some(row => /Block:\s*P?[1-5]/i.test($(row).text()))).first();
  if (!table.length) return invalid();
  let recognizedRows = 0;
  table.find('tr').each((_index, row) => {
    const cells = $(row).children('td');
    const rowText = clean($(row).text());
    const firstCellText = clean(cells.eq(0).text());
    // Cheerio joins adjacent table-cell text without spaces (NameBlockStart...).
    // Identify headings from their own cell, not the concatenated row text.
    if (!rowText || /^(?:Course\s*Name|Course\s*Info|Subject)$/i.test(firstCellText)
      || /No (?:courses|subjects)/i.test(rowText)) return;
    // A heading or inactive table row is not a course.
    const isCompact = cells.length === 3;
    if (!isCompact && cells.length < 5) return;
    recognizedRows++;
    if (/Dropped\s+on/i.test(rowText)) return;
    const courseCell = clean(cells.eq(0).text());
    const title = courseCell.match(/^([^:]+)\s*:\s*(.+?)(?=\s+Block:|$)/i);
    const blockText = isCompact ? courseCell : clean(cells.eq(1).text());
    const block = blockText.match(/Block:\s*P?([1-5])\b/i);
    const room = blockText.match(/rm\.\s*([^,;]+?)(?:\s+Block:|$)/i)?.[1]?.trim() ?? 'N/A';
    const dates = isCompact ? clean(cells.eq(1).text()) : '';
    const start = isCompact ? dates.match(/(\d{4}-\d{2}-\d{2})/)?.[1]
      : clean(cells.eq(2).text()).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const end = isCompact ? dates.match(/\d{4}-\d{2}-\d{2}\s*~\s*(\d{4}-\d{2}-\d{2})/)?.[1]
      : clean(cells.eq(3).text()).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!title || !block || !start || !end || courses.length >= 40) return invalid();
    const gradeCell = isCompact ? cells.eq(2) : cells.eq(4);
    const markText = clean(gradeCell.text());
    const mark = markText.match(/(?:current\s*mark\s*=|(?:FINAL|MIDTERM)\s*MARK\s*:)\s*(\d+(?:\.\d+)?)\s*%/i);
    const noMark = /^(?:N[/]A|Not available|No mark|Please see teacher for current status|See teacher)$/i.test(markText);
    if (!mark && markText && !noMark) return invalid();
    const href = gradeCell.find('a[href]').first().attr('href') ?? (isCompact ? undefined : cells.eq(0).find('a[href]').first().attr('href'));
    courses.push({
      code: title[1].trim(), name: title[2].trim(), block: block[1], room, start_time: start, end_time: end,
      overall_mark: mark ? Number(mark[1]) : 'N/A', isFinal: /FINAL/i.test(markText),
      isMidterm: /MIDTERM/i.test(markText), url: href ? schoolCourseURL(href) : null,
    });
  });
  if (!recognizedRows && !/No (?:courses|subjects)/i.test(table.text())) return invalid();
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
