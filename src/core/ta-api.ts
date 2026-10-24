import { parseSnapshot, type Assessment, type Course, type Snapshot } from './model.ts';
import { SyncError, type Adapter } from './sync.ts';

export type Credentials = { username: string; password: string };
const categories = { KU: 'Knowledge / Understanding', T: 'Thinking', C: 'Communication', A: 'Application', F: 'Final', O: 'Other' };
const categoryIds = Object.keys(categories) as (keyof typeof categories)[];
const invalid = (): never => { throw new SyncError('partial'); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function label(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 || /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) return invalid();
  return value.trim();
}
function numeric(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) return invalid();
  return value;
}
function date(value: unknown): string {
  const result = label(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) return invalid();
  return result;
}

/** The public service wraps courses in { response }, unlike its docs' array example. */
export function normalizeTAResponse(value: unknown, checkedAt = new Date().toISOString(), source: 'ta-api' | 'teachassist' = 'ta-api'): Snapshot {
  const courses = Array.isArray(value) ? value : record(value).response;
  if (!Array.isArray(courses) || courses.length > 40) return invalid();
  const normalized = courses.map((value): Course => {
    const raw = record(value);
    const code = label(raw.code), start = date(raw.start_time), end = date(raw.end_time);
    if (end < start || typeof raw.isFinal !== 'boolean' || typeof raw.isMidterm !== 'boolean') return invalid();
    const period = typeof raw.block === 'string' && /^(?:P)?[1-5]$/.test(raw.block) ? Number(raw.block.replace('P', '')) : undefined;
    // Semester is inferred from the published school-year start date only when absent.
    const semester = raw.semester === 1 || raw.semester === 2 ? raw.semester : Number(start.slice(5, 7)) < 8 ? 2 : 1;
    const id = `${code}:${start}:${raw.block === undefined ? '' : label(raw.block)}`;
    if (!Array.isArray(raw.assignments) || raw.assignments.length > 2000) return invalid();
    const table = record(raw.weight_table);
    const weights: Course['categories'] = categoryIds.filter(key => table[key] !== undefined).map(key => {
      const entry = record(table[key]);
      return { id: key, name: categories[key], weight: numeric(entry.CW, 100),
        reportedAverage: entry.SA === null || entry.SA === 'N/A' ? null : numeric(entry.SA, 100) };
    });
    const names = new Map<string, number>();
    const assessments: Assessment[] = [];
    for (const value of raw.assignments) {
      const assignment = record(value), name = label(assignment.name);
      const assignmentDate = assignment.date === undefined || assignment.date === null || assignment.date === '' ? undefined : date(assignment.date);
      // The service has no assignment IDs; a name/date and duplicate ordinal is the best available identity.
      const identity = `${name}:${assignmentDate ?? ''}`;
      const ordinal = names.get(identity) ?? 0; names.set(identity, ordinal + 1);
      const assignmentId = `${identity}:${ordinal}`;
      let parts = 0;
      for (const category of categoryIds) {
        if (assignment[category] === undefined) continue;
        const entries = assignment[category];
        if (!Array.isArray(entries) || entries.length > 20 || !weights.some(weight => weight.id === category)) return invalid();
        for (const [index, value] of entries.entries()) {
          const part = record(value);
          if (typeof part.finished !== 'boolean') return invalid();
          const possible = numeric(part.total), weight = numeric(part.weight);
          const earned = part.get === null ? null : numeric(part.get, possible);
          const status: Assessment['status'] = part.exempt === true ? 'exempt' : part.missing === true ? 'missing' : part.finished && earned !== null && possible > 0 ? 'graded' : 'ungraded';
          assessments.push({ id: `${assignmentId}:${category}:${index}`, assignmentId, name, category, possible, weight,
            earned: status === 'graded' ? earned : null, status, ...(assignmentDate ? { date: assignmentDate } : {}) });
          parts++;
        }
      }
      if (!parts) return invalid();
    }
    return { id, code, name: label(raw.name), term: `Semester ${semester}`, semester, ...(period ? { period } : {}),
      ...(raw.room && raw.room !== 'Unknown Room' && raw.room !== 'N/A' ? { room: label(raw.room) } : {}),
      ...(raw.teacher ? { teacher: label(raw.teacher) } : {}),
      ...(raw.credit === undefined ? {} : { credit: numeric(raw.credit, 10) }),
      reportedAverage: raw.overall_mark === 'N/A' || raw.overall_mark === null ? null : numeric(raw.overall_mark, 100),
      categories: weights, assessments };
  });
  return parseSnapshot({ version: source === 'teachassist' ? 3 : 2, source, checkedAt, courses: normalized });
}

export function validCredentials(value: Credentials): boolean {
  // The upstream interpolates credentials into a query string without encoding them.
  // Reject query delimiters to prevent injecting upstream query parameters.
  return /^[a-zA-Z0-9._@-]{1,100}$/.test(value.username) && value.password.length > 0 && value.password.length <= 256
    && !/[&=#?%+;\s<>\u0000-\u001F\u007F]/.test(value.password);
}

/** One shared limiter for sign-in and refresh. Client throttling is not a server WAF. */
export class RequestLimiter {
  private attempts: number[] = [];
  private blockedUntil = 0;
  private now: () => number;
  constructor(now = Date.now) { this.now = now; }
  get retryAt() { return this.blockedUntil; }
  claim() {
    const now = this.now();
    this.attempts = this.attempts.filter(time => now - time < 300000);
    if (now < this.blockedUntil) throw new SyncError('rate-limited');
    if (this.attempts.length >= 5) { this.blockedUntil = this.attempts[0] + 300000; throw new SyncError('rate-limited'); }
    this.attempts.push(now); this.blockedUntil = now + 30000;
  }
  backoff(header: string | null) {
    const now = this.now();
    const seconds = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - now : 60000;
    this.blockedUntil = Math.max(this.blockedUntil, now + Math.min(3600000, Math.max(30000, Number.isFinite(seconds) ? seconds : 60000)));
  }
}

/** Permanently disabled: its upstream puts credentials in URLs. */
export function createTAAdapter(..._args: unknown[]): Adapter {
  return { async fetch() { throw new SyncError('auth'); } };
}
