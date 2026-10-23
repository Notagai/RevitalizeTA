import { createHmac, randomBytes } from 'node:crypto';
import { abortable, boundedText } from '../core/http.ts';
import { validSchoolCredentials, type Credentials } from '../core/school-auth.ts';
import type { Snapshot } from '../core/model.ts';
import { RequestLimiter } from '../core/ta-api.ts';
import { SyncError } from '../core/sync.ts';
import { fetchSchoolGrades } from './school.ts';
import { configuredRateLimit, type DistributedClaim } from './rate-limit.ts';

const headers = { 'Cache-Control': 'no-store, private, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000',
  'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'X-Frame-Options': 'DENY' };
const reply = (data: unknown, status: number, retry?: number) => Response.json(data, { status, headers: { ...headers, ...(retry ? { 'Retry-After': String(retry) } : {}) } });

/** Bounded per-account and global controls. No spoofable forwarded-IP key. */
export function createSchoolHandler(options: {
  fetchGrades?: (credentials: Credentials, signal: AbortSignal) => Promise<Snapshot>; now?: () => number; development?: boolean;
  distributedClaim?: DistributedClaim | null;
} = {}) {
  const now = options.now ?? Date.now, salt = randomBytes(32);
  const accounts = new Map<string, { limiter: RequestLimiter; expires: number }>();
  let inFlight = 0, globalAttempts: number[] = [];
  const production = options.development === false || (options.development === undefined && process.env.NODE_ENV === 'production');
  const distributed = options.distributedClaim === undefined ? (production ? configuredRateLimit() : null) : options.distributedClaim;
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return reply({ error: 'method' }, 405);
    const url = new URL(request.url), origin = request.headers.get('origin');
    if (url.search || url.hash || (url.protocol !== 'https:' && !((options.development ?? process.env.NODE_ENV !== 'production')
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return reply({ error: 'transport' }, 403);
    if ((origin !== null && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site'
      || request.headers.get('x-revitalize-request') !== 'school-login') return reply({ error: 'origin' }, 403);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')) return reply({ error: 'content-type' }, 415);
    // Parse unauthenticated bodies WITHOUT occupying an upstream school request slot.
    // A malicious slow body cannot reserve one of the three school connections.
    let admittedToSchool = false;
    const abort = new AbortController(), cancel = () => abort.abort();
    request.signal.addEventListener('abort', cancel, { once: true });
    if (request.signal.aborted) abort.abort();
    const timer = setTimeout(cancel, 12000);
    try {
      let body: unknown;
      try { body = JSON.parse(await boundedText(request, 2048, abort.signal)); }
      catch { return reply({ error: abort.signal.aborted ? 'cancelled' : 'body' }, abort.signal.aborted ? 408 : 400); }
      if (!validSchoolCredentials(body) || (body as Record<string, unknown>).consent !== true
        || Object.keys(body).some(key => !['username', 'password', 'consent'].includes(key))) return reply({ error: 'credentials' }, 400);
      // A production deployment must share limits. Missing/unavailable Redis never
      // silently falls back to a resettable per-instance limiter.
      if (production && !distributed) return reply({ error: 'configuration' }, 503);
      if (distributed) {
        const retry = await distributed(body.username, abort.signal);
        if (retry > 0) return reply({ error: 'rate-limited' }, 429, retry);
      }
      const time = now();
      // Hash with a process-specific salt; never retain or log raw student IDs.
      const accountKey = createHmac('sha256', salt).update(body.username.toLowerCase()).digest('hex');
      for (const [key, value] of accounts) if (value.expires <= time) accounts.delete(key);
      let account = accounts.get(accountKey);
      if (!account) {
        if (accounts.size >= 1000) return reply({ error: 'rate-limited' }, 429, 300);
        account = { limiter: new RequestLimiter(now), expires: time + 300000 }; accounts.set(accountKey, account);
      }
      try { account.limiter.claim(); }
      catch { return reply({ error: 'rate-limited' }, 429, Math.max(1, Math.ceil((account.limiter.retryAt - time) / 1000))); }
      account.expires = time + 300000;
      if (abort.signal.aborted) throw new SyncError('cancelled');
      // Only structurally valid, account-throttled attempts consume the bounded
      // outbound budget. This protects the school's service from arbitrary IDs.
      globalAttempts = globalAttempts.filter(attempt => time - attempt < 60000);
      if (globalAttempts.length >= 60 || inFlight >= 3) return reply({ error: 'rate-limited' }, 429, 60);
      globalAttempts.push(time);
      inFlight++;
      admittedToSchool = true;
      const snapshot = await abortable((options.fetchGrades ?? fetchSchoolGrades)({ username: body.username, password: body.password }, abort.signal), abort.signal);
      if (abort.signal.aborted) throw new SyncError('cancelled');
      const encoded = JSON.stringify(snapshot);
      if (new TextEncoder().encode(encoded).byteLength > 1024 * 1024) throw new SyncError('partial');
      return reply(snapshot, 200);
    } catch (error) {
      const code = error instanceof SyncError ? error.code : 'unavailable';
      return reply({ error: code }, code === 'auth' ? 401 : code === 'rate-limited' ? 429 : code === 'cancelled' ? 408 : 502, code === 'rate-limited' ? 60 : undefined);
    } finally { clearTimeout(timer); request.signal.removeEventListener('abort', cancel); if (admittedToSchool) inFlight--; }
  };
}
