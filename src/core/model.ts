/** Versioned normalized contract. Transport data is validated before reaching UI. */
export type Assessment = {
  id: string;
  name: string;
  category: string;
  earned: number | null;
  possible: number;
  weight: number;
  status: 'graded' | 'ungraded' | 'exempt' | 'missing';
  assignmentId?: string;
  date?: string;
};
export type Course = {
  id: string;
  code: string;
  name: string;
  term: string;
  semester?: 1 | 2;
  period?: number;
  teacher?: string;
  room?: string;
  credit?: number;
  reportedAverage: number | null;
  categories: { id: string; name: string; weight: number; reportedAverage?: number | null }[];
  assessments: Assessment[];
  /** Course marks may load even when the private assessment HTML is unsupported. */
  reportProblem?: 'report-cell' | 'report-assignment' | 'report-weighting' | 'report-layout' | 'report-normalization';
};
export type Comparison = { checkedAt: string; courses: { id: string; reportedAverage: number | null }[] };
export type Snapshot = {
  version: 1 | 2 | 3; source: 'synthetic' | 'ta-api' | 'teachassist'; checkedAt: string; courses: Course[];
  comparison?: Comparison;
};

export class ValidationError extends Error {
  constructor() { super('INVALID_SNAPSHOT'); }
}
const fail = (): never => { throw new ValidationError(); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 || /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) return fail();
  return value.trim();
}
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail();
  return value;
}
function list<T>(value: unknown, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > 10000) return fail();
  return value.map(parse);
}
function unique(items: { id: string }[]) {
  if (new Set(items.map(item => item.id)).size !== items.length) fail();
}
export function parseSnapshot(value: unknown): Snapshot {
  const root = object(value);
  if (!((root.version === 1 && root.source === 'synthetic') || (root.version === 2 && root.source === 'ta-api') || (root.version === 3 && root.source === 'teachassist'))) return fail();
  const checkedAt = text(root.checkedAt);
  if (!Number.isFinite(Date.parse(checkedAt)) || new Date(checkedAt).toISOString() !== checkedAt) return fail();
  const courses = list(root.courses, value => {
    const c = object(value);
    const categories = list(c.categories, value => {
      const cat = object(value);
      return { id: text(cat.id), name: text(cat.name), weight: number(cat.weight, 0, 100),
        ...(cat.reportedAverage === undefined ? {} : { reportedAverage: cat.reportedAverage === null ? null : number(cat.reportedAverage, 0, 100) }) };
    });
    unique(categories);
    if (categories.length) {
      const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
      // TeachAssist can publish assessment marks without a category weighting
      // breakdown. An all-zero set is an explicit "weights unavailable"
      // sentinel, not a mathematical set of 0% weighted categories.
      const unknownWeights = root.source === 'teachassist' && totalWeight === 0;
      if (!unknownWeights && Math.abs(totalWeight - 100) > 0.001) fail();
    }
    const assessments = list<Assessment>(c.assessments, value => {
      const a = object(value);
      const status = a.status;
      if (status !== 'graded' && status !== 'ungraded' && status !== 'exempt' && status !== 'missing') return fail();
      const possible = number(a.possible, status === 'graded' ? Number.MIN_VALUE : 0);
      const earned = a.earned === null ? null : number(a.earned, 0, possible);
      if ((status === 'graded') !== (earned !== null)) fail();
      const category = text(a.category);
      if (!categories.some(cat => cat.id === category)) fail();
      const date = a.date === undefined ? undefined : text(a.date);
      if (date !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) fail();
      return { id: text(a.id), name: text(a.name), category, earned, possible, weight: number(a.weight), status,
        ...(a.assignmentId === undefined ? {} : { assignmentId: text(a.assignmentId) }), ...(date === undefined ? {} : { date }) };
    });
    unique(assessments);
    if (c.semester !== undefined && c.semester !== 1 && c.semester !== 2) fail();
    if (c.period !== undefined && (typeof c.period !== 'number' || !Number.isInteger(c.period) || c.period < 1 || c.period > 5)) fail();
    const reportProblem = c.reportProblem;
    if (reportProblem !== undefined && !['report-cell', 'report-assignment', 'report-weighting', 'report-layout', 'report-normalization'].includes(reportProblem as string)) fail();
    if (reportProblem !== undefined && (categories.length || assessments.length || root.source !== 'teachassist')) fail();
    return {
      id: text(c.id), code: text(c.code), name: text(c.name), term: text(c.term),
      ...(reportProblem === undefined ? {} : { reportProblem: reportProblem as Course['reportProblem'] }),
      ...(c.semester === undefined ? {} : { semester: c.semester as 1 | 2 }),
      ...(c.period === undefined ? {} : { period: c.period as number }),
      ...(c.teacher === undefined ? {} : { teacher: text(c.teacher) }),
      ...(c.room === undefined ? {} : { room: text(c.room) }),
      ...(c.credit === undefined ? {} : { credit: number(c.credit, 0, 10) }),
      reportedAverage: c.reportedAverage === null ? null : number(c.reportedAverage, 0, 100), categories, assessments,
    };
  });
  unique(courses);
  let comparison: Comparison | undefined;
  if (root.comparison !== undefined) {
    const raw = object(root.comparison);
    const date = text(raw.checkedAt);
    if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString() !== date || date > checkedAt) fail();
    const previous = list(raw.courses, value => {
      const c = object(value);
      return { id: text(c.id), reportedAverage: c.reportedAverage === null ? null : number(c.reportedAverage, 0, 100) };
    });
    unique(previous);
    comparison = { checkedAt: date, courses: previous };
  }
  return { version: root.version as Snapshot['version'], source: root.source as Snapshot['source'], checkedAt, courses, ...(comparison ? { comparison } : {}) };
}

/** Weighted category mean; empty categories are omitted and remaining weights renormalized.
 * Missing/ungraded/exempt entries are excluded, never silently counted as zero. */
export function calculatedAverage(course: Course): number | null {
  let sum = 0;
  let weights = 0;
  for (const category of course.categories) {
    const entries = course.assessments.filter(a => a.category === category.id && a.status === 'graded' && a.weight > 0);
    const total = entries.reduce((s, a) => s + a.weight, 0);
    if (!total || !category.weight) continue;
    sum += entries.reduce((s, a) => s + a.earned! / a.possible * 100 * a.weight, 0) / total * category.weight;
    weights += category.weight;
  }
  return weights ? sum / weights : null;
}
