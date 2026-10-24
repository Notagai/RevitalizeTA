import { fetchSchoolGrades } from './direct-school.ts';
import { abortable } from './http.ts';
import { RequestLimiter } from './ta-api.ts';
import { SyncError, type Adapter } from './sync.ts';

export type Credentials = { username: string; password: string };
/** Student identifiers are nine digits; school passwords may contain punctuation or be long. */
export function validSchoolCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false;
  const { username, password } = value as Record<string, unknown>;
  return typeof username === 'string' && /^\d{9}$/.test(username)
    && typeof password === 'string' && password.length > 0 && password.length <= 256
    && !/[\u0000-\u001F\u007F]/.test(password);
}

/** Native-only, direct official-host login without our own intermediary service. */
export function createSchoolAdapter(credentials: Credentials, limiter: RequestLimiter, options: {
  consent: boolean;
  fetchGrades?: typeof fetchSchoolGrades;
}): Adapter {
  return { async fetch(signal) {
    if (!options.consent || !validSchoolCredentials(credentials)) throw new SyncError('auth');
    if (signal.aborted) throw new SyncError('cancelled');
    limiter.claim();
    const abort = new AbortController();
    const cancel = () => abort.abort();
    let timedOut = false;
    signal.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 60000);
    try {
      return await abortable((options.fetchGrades ?? fetchSchoolGrades)(credentials, abort.signal), abort.signal);
    } catch (error) {
      if (signal.aborted) throw new SyncError('cancelled');
      if (timedOut) throw new SyncError('unavailable');
      if (error instanceof SyncError) throw error;
      throw new SyncError(error instanceof TypeError ? 'offline' : 'partial');
    } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  } };
}
