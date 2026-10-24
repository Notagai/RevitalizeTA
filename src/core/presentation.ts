import type { SyncState } from './sync.ts';
import type { Course } from './model.ts';

export const percent = (value: number | null) => value === null ? 'Not available' : `${value.toFixed(1)}%`;
export const deltaLabel = (value: number | null) => value === null ? 'No previous grade' : Math.abs(value) < 0.05 ? 'No change' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
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
    never: state.snapshot ? 'Showing saved grades. Refresh to check for updates.' : 'Sign in to see your courses and grades.',
    checking: 'Refreshing grades. Your current grades remain visible.',
    deleting: 'Clearing grades from this device. Please wait.',
    changed: `${state.changes.length} grade updates found.`,
    unchanged: 'Grades refreshed. No changes found.',
    offline: 'Could not connect. Your previous grades were kept.',
    auth: 'Sign in again to refresh your grades. Your previous grades were kept.',
    partial: 'Unexpected or incomplete response. Saved grades were not replaced.',
    'rate-limited': 'Too many requests. Wait before refreshing again.',
    unavailable: 'Service unavailable or check timed out. Saved grades were kept.',
    cancelled: 'Check cancelled. Saved grades were kept.',
    storage: 'Grades could not be saved. Retry or clear grade data in Settings.',
  };
  const stages = {
    'initial-page': 'Opening the school website',
    'login-submission': 'Submitting the school login form',
    'course-table': 'Reading the course list',
    'course-report': 'Reading course assessments',
  };
  const reasons = {
    redirect: 'Unexpected or blocked redirect',
    status: 'Unexpected HTTP status',
    'content-type': 'School returned non-HTML content',
    'body-stream': 'Native response stream unavailable',
    cookie: 'Invalid school session cookie',
    parser: 'School HTML did not match a supported layout',
    'native-exception': 'Native request or response reader failed',
    'login-method': 'School login form requires a different sign-in method',
    'course-layout': 'Student Reports loaded, but its timetable layout is not recognized',
    'course-no-tables': 'Student Reports returned no timetable tables',
    'course-no-rows': 'The report contained tables but no recognizable course rows',
    'course-no-dates': 'Course rows were found, but their dates were missing or in an unexpected format',
    'course-unrecognized': 'Course rows and dates were found, but the grade format could not be read',
    'portal-page': 'The school returned a non-report page after sign-in',
    'login-page': 'The school returned its login screen instead of your courses',
    'auth-rejected': 'The school rejected or expired the login session',
    'report-cell': 'An assessment cell used an unsupported score or weight format',
    'report-assignment': 'Assessment rows were missing required details',
    'report-weighting': 'Course category weighting rows were not recognized',
    'report-layout': 'The course assessment report was not recognized',
    'report-normalization': 'Course assessment values failed validation',
  };
  const stage = state.problem ? ` Failed during: ${stages[state.problem]}.` : '';
  const reason = state.problemCode ? ` Detail: ${reasons[state.problemCode]}.` : '';
  return messages[state.status] + stage + reason;
}

/** Fixed labels only; never include raw grade content in diagnostics. */
export function reportIssueMessage(reason: NonNullable<Course['reportProblem']>): string {
  const descriptions: Record<NonNullable<Course['reportProblem']>, string> = {
    'report-cell': 'The school used an assessment score or weight format this app does not yet understand.',
    'report-assignment': 'The school assessment rows could not be interpreted.',
    'report-weighting': 'The school category weighting table could not be interpreted.',
    'report-layout': 'The course report layout could not be interpreted.',
    'report-normalization': 'The school report contained grade data that failed validation.',
  };
  return descriptions[reason];
}
