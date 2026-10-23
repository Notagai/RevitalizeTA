import { SyncError } from './sync.ts';

/** Race even uncooperative transports/readers against cancellation. */
export async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void work.catch(() => {}); throw new SyncError('cancelled'); }
  let cancel: () => void = () => {};
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      cancel = () => reject(new SyncError('cancelled'));
      signal.addEventListener('abort', cancel, { once: true });
    })]);
  } finally { signal.removeEventListener('abort', cancel); }
}

/** Never use .text() as a fallback: it buffers an unbounded body first. */
export async function boundedText(message: Request | Response, limit: number, signal: AbortSignal): Promise<string> {
  if (Number(message.headers.get('content-length')) > limit) throw new SyncError('partial');
  const reader = message.body?.getReader();
  if (!reader) throw new SyncError('partial');
  let size = 0, text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new SyncError('partial');
      text += decoder.decode(chunk.value, { stream: true });
    }
    if (signal.aborted) throw new SyncError('cancelled');
    return text + decoder.decode();
  } finally {
    signal.removeEventListener('abort', cancel);
    // Cancel without awaiting an untrusted source's cancellation handler.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
