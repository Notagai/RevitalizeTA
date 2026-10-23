import { parseSnapshot } from './model.ts';
import { abortable, boundedText } from './http.ts';
import { RequestLimiter } from './ta-api.ts';
import { SyncError, type Adapter } from './sync.ts';

export type Credentials = { username: string; password: string };
export const SCHOOL_API_PATH = '/api/school/grades';
/** Check before serializing credentials: rejecting HTTP at the server is too late. */
export function schoolEndpoint(origin: string | undefined, development = false): string {
  if (!origin) throw new SyncError('unavailable');
  let url: URL;
  try { url = new URL(origin); } catch { throw new SyncError('unavailable'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (url.protocol !== 'https:' && !(development && loopback && url.protocol === 'http:'))) throw new SyncError('unavailable');
  return url.origin + SCHOOL_API_PATH;
}
export function validSchoolCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false;
  const { username, password } = value as Record<string, unknown>;
  return typeof username === 'string' && /^[a-zA-Z0-9._@-]{1,100}$/.test(username)
    && typeof password === 'string' && password.length > 0 && password.length <= 256 && !/[\u0000-\u001F\u007F]/.test(password);
}

export function createSchoolAdapter(credentials: Credentials, limiter: RequestLimiter, options: {
  fetchImpl?: typeof fetch; consent: boolean; origin?: string; development?: boolean;
}): Adapter {
  return { async fetch(signal) {
    if (!options.consent || !validSchoolCredentials(credentials)) throw new SyncError('auth');
    if (signal.aborted) throw new SyncError('cancelled');
    const origin = options.origin ?? (typeof window !== 'undefined' && window.location ? window.location.origin : process.env.EXPO_PUBLIC_APP_ORIGIN);
    const endpoint = schoolEndpoint(origin, options.development ?? (typeof __DEV__ !== 'undefined' && __DEV__));
    limiter.claim();
    const abort = new AbortController();
    const cancel = () => abort.abort();
    let timedOut = false;
    signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 15000);
    try {
      const response = await abortable((options.fetchImpl ?? fetch)(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Revitalize-Request': 'school-login' },
        body: JSON.stringify({ ...credentials, consent: true }), signal: abort.signal,
        credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
      }), abort.signal);
      if (response.status === 401 || response.status === 403) throw new SyncError('auth');
      if (response.status === 429) { limiter.backoff(response.headers.get('retry-after')); throw new SyncError('rate-limited'); }
      if (!response.ok) throw new SyncError('unavailable');
      if (response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new SyncError('partial');
      const snapshot = parseSnapshot(JSON.parse(await boundedText(response, 1024 * 1024, abort.signal)));
      if (snapshot.source !== 'teachassist' || snapshot.comparison !== undefined) throw new SyncError('partial');
      return snapshot;
    } catch (error) {
      if (signal.aborted) throw new SyncError('cancelled');
      if (timedOut) throw new SyncError('unavailable');
      if (error instanceof SyncError) throw error;
      throw new SyncError(error instanceof TypeError ? 'offline' : 'partial');
    } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  } };
}
