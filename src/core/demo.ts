import { timetableFixtureSnapshot } from './fixtures.ts';
import { SyncError, type Adapter, type Failure } from './sync.ts';

export type Scenario = 'normal' | 'changed' | 'empty' | 'malformed' | Exclude<Failure, 'cancelled' | 'storage'>;
export const scenarios: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Original grades' }, { value: 'changed', label: 'Changed grades' },
  { value: 'empty', label: 'No courses' }, { value: 'offline', label: 'Offline' },
  { value: 'auth', label: 'Session expired' }, { value: 'malformed', label: 'Incomplete response' },
  { value: 'rate-limited', label: 'Rate limited' }, { value: 'unavailable', label: 'Service unavailable' },
];
export function demoAdapter(scenario: Scenario): Adapter {
  return { async fetch(signal) {
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) { reject(new SyncError('cancelled')); return; }
      const onAbort = () => { clearTimeout(timer); reject(new SyncError('cancelled')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, 650);
      signal.addEventListener('abort', onAbort, { once: true });
    });
    if (scenario === 'malformed') return { courses: [] };
    if (scenario === 'offline' || scenario === 'auth' || scenario === 'partial' || scenario === 'rate-limited' || scenario === 'unavailable') throw new SyncError(scenario);
    const snapshot = timetableFixtureSnapshot(new Date().toISOString(), scenario === 'changed');
    return scenario === 'empty' ? { ...snapshot, courses: [] } : snapshot;
  } };
}
