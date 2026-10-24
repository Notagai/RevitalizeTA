import { parseSnapshot, type Snapshot } from './model.ts';

export type Failure = 'offline' | 'auth' | 'partial' | 'rate-limited' | 'unavailable' | 'cancelled' | 'storage';
/** Safe diagnostic labels only. Never include URLs, HTML, credentials, or cookies in errors. */
export type SchoolStage = 'initial-page' | 'login-submission' | 'course-table' | 'course-report';
export type SchoolProblem = 'redirect' | 'status' | 'content-type' | 'body-stream' | 'cookie' | 'parser' | 'native-exception' | 'login-method' | 'course-layout' | 'portal-page' | 'login-page' | 'auth-rejected' | 'course-no-tables' | 'course-no-rows' | 'course-no-dates' | 'course-unrecognized';
export type SyncStatus = 'never' | 'checking' | 'deleting' | 'changed' | 'unchanged' | Failure;
export type Change = { courseId: string; description: string };
export type SyncState = { status: SyncStatus; snapshot: Snapshot | null; lastAttempt: string | null; changes: Change[]; problem?: SchoolStage; problemCode?: SchoolProblem };
export interface SnapshotStore { load(): Promise<unknown>; save(snapshot: Snapshot): Promise<void>; clear(): Promise<void> }
export interface Adapter { fetch(signal: AbortSignal): Promise<unknown> }
export class SyncError extends Error {
  readonly code: Failure;
  readonly stage?: SchoolStage;
  readonly reason?: SchoolProblem;
  constructor(code: Failure, stage?: SchoolStage, reason?: SchoolProblem) {
    super(code); this.code = code; this.stage = stage; this.reason = reason;
  }
}
export const initialState: SyncState = { status: 'never', snapshot: null, lastAttempt: null, changes: [] };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  return JSON.stringify(value);
}
export function diffSnapshots(before: Snapshot | null, after: Snapshot): Change[] {
  if (!before) return after.courses.map(c => ({ courseId: c.id, description: 'Course added' }));
  const changes: Change[] = [];
  for (const course of after.courses) {
    const old = before.courses.find(c => c.id === course.id);
    if (!old) { changes.push({ courseId: course.id, description: 'Course added' }); continue; }
    const { assessments: oldAssessments, ...oldDetails } = old;
    const { assessments, ...details } = course;
    const normalize = (value: typeof details) => ({ ...value, categories: [...value.categories].sort((a, b) => a.id.localeCompare(b.id)) });
    if (stable(normalize(oldDetails)) !== stable(normalize(details))) changes.push({ courseId: course.id, description: 'Course details, reported average or category weights changed' });
    for (const a of assessments) {
      const previous = oldAssessments.find(item => item.id === a.id);
      if (!previous || stable(previous) !== stable(a)) changes.push({ courseId: course.id, description: previous ? 'Assessment changed' : 'Assessment added' });
    }
    for (const a of oldAssessments) if (!assessments.some(item => item.id === a.id)) changes.push({ courseId: course.id, description: 'Assessment removed' });
  }
  for (const c of before.courses) if (!after.courses.some(item => item.id === c.id)) changes.push({ courseId: c.id, description: 'Course removed' });
  return changes;
}

/** Single-flight controller. Validate and durably save before publishing success. */
export class SyncController {
  state: SyncState = { ...initialState };
  private pending: Promise<void> | null = null;
  private deleting: Promise<boolean> | null = null;
  private abort: AbortController | null = null;
  private store: SnapshotStore;
  private notify: (state: SyncState) => void;
  private now: () => string;
  private deadlineMs: number;
  constructor(store: SnapshotStore, notify: (state: SyncState) => void,
    now = () => new Date().toISOString(), deadlineMs = 15000) {
    this.store = store; this.notify = notify; this.now = now; this.deadlineMs = deadlineMs;
  }
  private publish(next: SyncState) { this.state = next; this.notify(next); }
  async hydrate() {
    try {
      const raw = await this.store.load();
      if (raw !== null) this.publish({ ...initialState, snapshot: parseSnapshot(raw) });
    } catch { this.publish({ ...initialState, status: 'storage' }); }
  }
  refresh(adapter: Adapter): Promise<void> {
    if (this.deleting) return this.deleting.then(() => {});
    if (this.pending) return this.pending;
    const abort = new AbortController();
    this.abort = abort;
    this.publish({ ...this.state, status: 'checking', lastAttempt: this.now(), changes: [], problem: undefined, problemCode: undefined });
    this.pending = this.run(adapter, abort).finally(() => { this.pending = null; this.abort = null; });
    return this.pending;
  }
  private async run(adapter: Adapter, abort: AbortController) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new SyncError('unavailable')); abort.abort(); }, this.deadlineMs);
        abort.signal.addEventListener('abort', () => reject(new SyncError('cancelled')), { once: true });
      });
      const raw = await Promise.race([adapter.fetch(abort.signal), deadline]);
      if (abort.signal.aborted) throw new SyncError('cancelled');
      const parsed = parseSnapshot(raw);
      const previous = this.state.snapshot;
      const checkedAt = this.now();
      const snapshot: Snapshot = { version: parsed.version, source: parsed.source, courses: parsed.courses, checkedAt,
        ...(previous && previous.source === parsed.source && previous.checkedAt <= checkedAt ? { comparison: { checkedAt: previous.checkedAt,
          courses: previous.courses.map(({ id, reportedAverage }) => ({ id, reportedAverage })) } } : {}) };
      const changes = diffSnapshots(this.state.snapshot, snapshot);
      try { await this.store.save(snapshot); } catch { throw new SyncError('storage'); }
      if (abort.signal.aborted) throw new SyncError('cancelled');
      this.publish({ ...this.state, snapshot, changes, status: changes.length ? 'changed' : 'unchanged', problem: undefined, problemCode: undefined });
    } catch (error) {
      this.publish({ ...this.state, status: error instanceof SyncError ? error.code : 'partial',
        problem: error instanceof SyncError ? error.stage : undefined,
        problemCode: error instanceof SyncError ? error.reason : 'native-exception', changes: [] });
    } finally { if (timer) clearTimeout(timer); }
  }
  cancel() { this.abort?.abort(); }
  clear(status: 'never' | 'auth' = 'never'): Promise<boolean> {
    if (this.deleting) return this.deleting;
    this.deleting = this.deleteData(status).finally(() => { this.deleting = null; });
    return this.deleting;
  }
  private async deleteData(status: 'never' | 'auth') {
    this.cancel();
    await this.pending;
    // Keep only the fixed diagnostic labels across an authentication-driven
    // sign-out; the previous snapshot and account are still cleared.
    const diagnostic = status === 'auth'
      ? { problem: this.state.problem, problemCode: this.state.problemCode } : {};
    this.publish({ ...this.state, status: 'deleting', changes: [] });
    try { await this.store.clear(); this.publish({ ...initialState, status, ...diagnostic }); return true; }
    catch { this.publish({ ...this.state, status: 'storage' }); return false; }
  }
}
