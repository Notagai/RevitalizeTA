import { createHmac, randomUUID } from 'node:crypto';
import { abortable, boundedText } from '../core/http.ts';
import { SyncError } from '../core/sync.ts';

// Redis TIME, pruning, admission, and cooldown are atomic across server instances.
const script = `
local t = redis.call('TIME')
local now = t[1] * 1000 + math.floor(t[2] / 1000)
local cooldown = redis.call('PTTL', KEYS[3])
if cooldown > 0 then return math.ceil(cooldown / 1000) end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 300000)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - 60000)
if redis.call('ZCARD', KEYS[1]) >= 5 then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return math.max(1, math.ceil((tonumber(oldest[2]) + 300000 - now) / 1000))
end
if redis.call('ZCARD', KEYS[2]) >= 20 then return 60 end
redis.call('ZADD', KEYS[1], now, ARGV[1])
redis.call('PEXPIRE', KEYS[1], 300000)
redis.call('ZADD', KEYS[2], now, ARGV[1])
redis.call('PEXPIRE', KEYS[2], 60000)
redis.call('SET', KEYS[3], '1', 'PX', 30000)
return 0`;

export type DistributedClaim = (username: string, signal: AbortSignal) => Promise<number>;
export function configuredRateLimit(environment: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): DistributedClaim | null {
  const endpoint = environment.AUTH_REDIS_REST_URL, token = environment.AUTH_REDIS_REST_TOKEN, secret = environment.AUTH_RATE_LIMIT_SECRET;
  if (!endpoint || !token || !secret || secret.length < 32 || token.length > 4096 || /[\r\n]/.test(token)) return null;
  let url: URL;
  try { url = new URL(endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || !/^[a-z0-9.-]+\.upstash\.io$/i.test(url.hostname) || url.port || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) return null;
  return async (username, signal) => {
    const key = createHmac('sha256', secret).update(username.toLowerCase()).digest('hex');
    const abort = new AbortController(), cancel = () => abort.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) abort.abort();
    const timer = setTimeout(cancel, 2000);
    try {
      const response = await abortable(fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(['EVAL', script, 3, `revitalizeta:{auth}:account:${key}`, 'revitalizeta:{auth}:global', `revitalizeta:{auth}:cooldown:${key}`, randomUUID()]),
        signal: abort.signal, credentials: 'omit', redirect: 'error', cache: 'no-store' }), abort.signal);
      if (!response.ok || response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new SyncError('unavailable');
      const result: unknown = JSON.parse(await boundedText(response, 1024, abort.signal));
      const value = result && typeof result === 'object' && !('error' in result) ? (result as Record<string, unknown>).result : undefined;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 300) throw new SyncError('unavailable');
      return value;
    } catch { throw new SyncError(signal.aborted ? 'cancelled' : 'unavailable'); }
    finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  };
}
