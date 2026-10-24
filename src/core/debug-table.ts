import { load } from 'cheerio/slim';

/**
 * Temporary, DEBUG-BRANCH-ONLY HTML table recorder.
 *
 * Never retain source HTML, credentials, cookies, URLs or school-provided text.
 * Every exported text value is synthesized from a fixed vocabulary. The DOM
 * structure, supported presentation attributes, and coarse semantic flags are
 * enough to compare real timetable layouts with the parser.
 */
let capture: { stage: 'course-list' | 'course-report'; html: string } | null = null;
export function clearTableDebugCapture() { capture = null; }
export function currentTableDebugCapture() { return capture; }

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function maskedCellText(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'EMPTY';
  const dates = clean.match(/\b\d{4}-\d{2}-\d{2}\b/g)?.length ?? 0;
  const isCourse = /(?:^[A-Z]{2,6}\d[A-Z0-9-]{1,12}\s*[: -]|Block\s*:)/i.test(clean);
  if (isCourse) return 'ABC1D-01 : Example Course Block: P1 - rm. ROOM';
  if (dates > 0) return dates > 1 ? '2000-01-01 ~ 2000-06-30' : '2000-01-01';
  if (/(?:current|midterm|final)\s*mark\s*[:=]/i.test(clean)) return 'current mark = 50%';
  if (/please\s+see\s+teacher|no\s+mark|not\s+available|N\/A/i.test(clean)) return 'Please see teacher for current status';
  if (/student\s+reports/i.test(clean)) return 'STUDENT REPORTS';
  if (/weight\s*=/i.test(clean)) return '8 / 10 = 80% weight=1';
  if (/course\s*weighting/i.test(clean)) return 'Course Weighting';
  if (/student\s+achievement/i.test(clean)) return 'Student Achievement';
  if (/\bcategory\b/i.test(clean)) return 'Category';
  if (/^(?:knowledge|thinking|communication|application|other|final)\b/i.test(clean)) return 'CATEGORY LABEL';
  if (/%/.test(clean)) return '50%';
  return 'TEXT';
}

function cellFlags(text: string, links: number, nestedTables: number) {
  const flags = [];
  if (/\bBlock\s*:/i.test(text)) flags.push('block');
  if (/\brm\./i.test(text)) flags.push('room');
  if (/^[^:]{2,100}\s*:/i.test(text)) flags.push('colon');
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g)?.length ?? 0;
  if (dates) flags.push('dates-' + Math.min(9, dates));
  if (/(?:current|midterm|final)\s*mark\s*[:=]/i.test(text)) flags.push('mark');
  if (/Please see teacher|No mark|N\/A/i.test(text)) flags.push('no-mark');
  if (/%/.test(text)) flags.push('percentage');
  if (links) flags.push('link');
  if (nestedTables) flags.push('nested-table');
  return flags.join(',') || 'text';
}
function allowedAttrs(attrs: Record<string, string | undefined>, tag: string) {
  const result: string[] = [];
  const numbers = ['width', 'height', 'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border'];
  for (const key of numbers) {
    const value = attrs[key];
    if (value && /^\d{1,3}%?$/.test(value) && Number(value.replace('%', '')) <= 100) {
      result.push(' ' + key + '="' + value + '"');
    }
  }
  const background = attrs.bgcolor?.replace(/^#/, '').toLowerCase();
  if (background && /^(?:[0-9a-f]{6})$/.test(background)) {
    // Keep only known static category colors; never unknown attribute values.
    const known = ['ffffaa', 'c0fea4', 'afafff', 'ffd490', 'eeeeee', 'cccccc', 'dedede', 'f0f0f0'];
    if (known.includes(background)) result.push(' bgcolor="#' + background + '"');
    else result.push(' data-bgcolor="other"');
  }
  if (attrs.class) result.push(' data-has-class="true"');
  if (attrs.id) result.push(' data-has-id="true"');
  if (attrs.style) result.push(' data-has-style="true"');
  if (attrs.href) result.push(' data-has-href="true"');
  if (tag === 'table') result.push(' data-debug-table="true"');
  return result.join('');
}
function maskLink(href: string | undefined) {
  if (!href) return '#';
  // The complete href and its query values are never exported.
  if (/viewReport\.php/i.test(href)) return 'viewReport.php?subject_id=111111&amp;student_id=222222222';
  if (/listReports\.php/i.test(href)) return 'listReports.php?student_id=222222222';
  return '#';
}

/** Returns an entire standalone HTML document. No original text is copied. */
export function sanitizeSchoolTableHtml(source: string, stage: 'course-list' | 'course-report') {
  const $ = load(source.slice(0, 2 * 1024 * 1024));
  const roots = $('table').toArray().filter(table => !$(table).parents('table').length).slice(0, 20);
  let renderedRows = 0;
  const renderTable = (table: unknown, depth: number): string => {
    if (depth > 5) return '<!-- nesting limit -->';
    const el = $(table as Parameters<typeof $>[0]);
    let out = '<table' + allowedAttrs((table as { attribs?: Record<string, string> }).attribs ?? {}, 'table') + '>';
    let rows = el.children('tr,thead,tbody,tfoot').toArray().flatMap(child => {
      const node = $(child);
      return node.is('tr') ? [child] : node.children('tr').toArray();
    });
    rows = rows.slice(0, 100);
    for (const row of rows) {
      if (++renderedRows > 500) break;
      const raw = row as { attribs?: Record<string, string> };
      out += '<tr' + allowedAttrs(raw.attribs ?? {}, 'tr') + '>';
      for (const cell of $(row).children('td,th').toArray().slice(0, 16)) {
        const tag = $(cell).is('th') ? 'th' : 'td';
        const rawCell = cell as { attribs?: Record<string, string> };
        // Exclude descendant table text from the parent cell's description.
        const withoutTables = $(cell).clone();
        withoutTables.find('table').remove();
        const rawText = withoutTables.text().slice(0, 10000);
        const inner = $(cell).find('table').toArray().filter(n => $(n).parents('table').length === depth + 1).slice(0, 6);
        const anchors = $(cell).find('a[href]').toArray().slice(0, 2);
        const flags = cellFlags(rawText, anchors.length, inner.length);
        out += '<' + tag + allowedAttrs(rawCell.attribs ?? {}, tag) +
          ' data-shape="' + escapeHtml(flags) + '">';
        const replacement = escapeHtml(maskedCellText(rawText));
        if (anchors.length) out += '<a href="' + maskLink($(anchors[0]).attr('href')) + '">' + replacement + '</a>';
        else out += replacement;
        for (const nested of inner) out += renderTable(nested, depth + 1);
        out += '</' + tag + '>';
      }
      out += '</tr>';
    }
    return out + '</table>';
  };
  let output = roots.map(el => renderTable(el, 0)).join('\n');
  if (!output) output = '<p>NO TABLE ELEMENTS IN RESPONSE</p>';
  // No form fields or HTML scripts are carried over. The page-level flags
  // describe structure only and contain no actual identifiers or content.
  const info = [
    'source: ' + stage,
    'root-tables: ' + roots.length,
    'has-password-field: ' + ($('input[type="password"],input[name="password"]').length > 0),
    'has-student-reports-heading: ' + /student\s+reports/i.test($.root().text()),
    'has-report-link: ' + ($('a[href*="listReports.php"]').length > 0),
  ];
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>RevitalizeTA sanitized TeachAssist table</title>' +
    '<style>body{font:14px system-ui;margin:20px;background:#fafafa;color:#111}table{border-collapse:collapse;margin:16px 0;width:100%}' +
    'td,th{border:1px solid #bbb;padding:8px;vertical-align:top;overflow-wrap:anywhere}' +
    'header{padding:12px;background:#eee}small{color:#555}</style></head><body>' +
    '<header><h1>Sanitized TeachAssist table structure</h1>' +
    '<p>All cell text and link values are synthetic placeholders.</p><small>' + info.join(' | ') +
    '</small></header>' + output + '</body></html>';
}
export function rememberTableDebugPage(source: string, stage: 'course-list' | 'course-report') {
  capture = { stage, html: sanitizeSchoolTableHtml(source, stage) };
}
