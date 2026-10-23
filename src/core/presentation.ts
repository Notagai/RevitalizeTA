import type { SyncState } from './sync.ts';

export const percent = (value: number | null) => value === null ? 'Not available' : `${value.toFixed(1)}%`;
export function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'No successful check';
}
export function cacheAge(checkedAt: string, now = Date.now()) {
  const age = now - Date.parse(checkedAt);
  if (age < 0) return 'Device clock is earlier than the saved check';
  if (age < 60000) return 'Saved less than a minute ago';
  if (age < 3600000) return `Saved ${Math.floor(age / 60000)} minutes ago`;
  if (age < 86400000) return `Saved ${Math.floor(age / 3600000)} hours ago`;
  return `Saved ${Math.floor(age / 86400000)} days ago`;
}
export function syncMessage(state: SyncState): string {
  const messages = {
    never: state.snapshot ? 'Showing saved demo grades. Run a demo check to verify the fixture again.' : 'No saved grades. Load the synthetic demo to explore the app.',
    checking: 'Checking synthetic data. Saved grades remain visible.',
    deleting: 'Deleting local demo grade data. Wait for confirmation before loading the demo again.',
    changed: `${state.changes.length} changes found in the synthetic data.`,
    unchanged: 'Demo checked successfully. No grade changes found.',
    offline: 'Offline simulation. Could not verify new grades. Saved grades were kept.',
    auth: 'Session expired simulation. Live sign-in is unavailable pending privacy review. Saved grades were kept.',
    partial: 'Unexpected or incomplete response. Saved grades were not replaced.',
    'rate-limited': 'Rate limit simulation. Wait before trying another demo check. No automatic retry.',
    unavailable: 'Service unavailable or check timed out. Saved grades were kept.',
    cancelled: 'Check cancelled. Saved grades were kept.',
    storage: 'Saved data could not be read or written. A successful check has not been confirmed. Retry or delete local demo data in Settings.',
  };
  return messages[state.status];
}
