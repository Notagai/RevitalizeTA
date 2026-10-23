/** Versioned, synthetic-only normalized contract. No transport or credentials. */
export type Assessment = {
  id: string;
  name: string;
  category: string;
  earned: number | null;
  possible: number;
  weight: number;
  status: 'graded' | 'ungraded' | 'exempt' | 'missing';
};
export type Course = {
  id: string;
  code: string;
  name: string;
  term: string;
  reportedAverage: number | null;
  categories: { id: string; name: string; weight: number }[];
  assessments: Assessment[];
};
export type Snapshot = { version: 1; source: 'synthetic'; checkedAt: string; courses: Course[] };

export class ValidationError extends Error {
  constructor() { super('INVALID_SNAPSHOT'); }
}
const fail = (): never => { throw new ValidationError(); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) return fail();
  return value;
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
  if (root.version !== 1 || root.source !== 'synthetic') return fail();
  const checkedAt = text(root.checkedAt);
  if (!Number.isFinite(Date.parse(checkedAt)) || new Date(checkedAt).toISOString() !== checkedAt) return fail();
  const courses = list(root.courses, value => {
    const c = object(value);
    const categories = list(c.categories, value => {
      const cat = object(value);
      return { id: text(cat.id), name: text(cat.name), weight: number(cat.weight, 0, 100) };
    });
    unique(categories);
    if (categories.length && Math.abs(categories.reduce((sum, cat) => sum + cat.weight, 0) - 100) > 0.001) fail();
    const assessments = list<Assessment>(c.assessments, value => {
      const a = object(value);
      const status = a.status;
      if (status !== 'graded' && status !== 'ungraded' && status !== 'exempt' && status !== 'missing') return fail();
      const possible = number(a.possible, Number.MIN_VALUE);
      const earned = a.earned === null ? null : number(a.earned, 0, possible);
      if ((status === 'graded') !== (earned !== null)) fail();
      const category = text(a.category);
      if (!categories.some(cat => cat.id === category)) fail();
      return { id: text(a.id), name: text(a.name), category, earned, possible, weight: number(a.weight), status };
    });
    unique(assessments);
    return {
      id: text(c.id), code: text(c.code), name: text(c.name), term: text(c.term),
      reportedAverage: c.reportedAverage === null ? null : number(c.reportedAverage, 0, 100), categories, assessments,
    };
  });
  unique(courses);
  return { version: 1, source: 'synthetic', checkedAt, courses };
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
