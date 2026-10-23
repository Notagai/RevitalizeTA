import { parseSnapshot, type Snapshot } from './model.ts';
import type { SnapshotStore } from './sync.ts';

export interface SlotStorage {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
type Record = { format: 1; generation: number; snapshot: Snapshot };
const keys = ['snapshot-a.json', 'snapshot-b.json'];

/** Recoverable two-slot cache. A failed write never touches the newest valid slot.
 * No encryption: synthetic data only. A future live store requires its own review. */
export class FixtureCache implements SnapshotStore {
  private storage: SlotStorage;
  constructor(storage: SlotStorage) { this.storage = storage; }
  private async records() {
    return Promise.all(keys.map(async key => {
      const raw = await this.storage.read(key);
      if (raw === null) return { key, record: null, corrupt: false };
      try {
        const data = JSON.parse(raw);
        if (data.format !== 1 || !Number.isSafeInteger(data.generation) || data.generation < 1) throw new Error('CACHE_FORMAT');
        const record: Record = { format: 1, generation: data.generation, snapshot: parseSnapshot(data.snapshot) };
        return { key, record, corrupt: false };
      } catch { return { key, record: null, corrupt: true }; }
    }));
  }
  async load(): Promise<Snapshot | null> {
    const records = await this.records();
    const latest = records.filter(r => r.record).sort((a, b) => b.record!.generation - a.record!.generation)[0];
    if (latest) return latest.record!.snapshot;
    if (records.some(r => r.corrupt)) throw new Error('CACHE_INVALID');
    return null;
  }
  async save(value: Snapshot) {
    const snapshot = parseSnapshot(value);
    const records = await this.records();
    const newest = Math.max(0, ...records.map(r => r.record?.generation ?? 0));
    if (newest >= Number.MAX_SAFE_INTEGER) throw new Error('CACHE_GENERATION');
    const target = records.find(r => !r.record) ?? records.reduce((a, b) => a.record!.generation < b.record!.generation ? a : b);
    const encoded = JSON.stringify({ format: 1, generation: newest + 1, snapshot });
    await this.storage.write(target.key, encoded);
    if (await this.storage.read(target.key) !== encoded) throw new Error('CACHE_WRITE');
  }
  async clear() {
    // Remove both even if one deletion fails, then report the failure.
    const results = await Promise.allSettled(keys.map(key => this.storage.remove(key)));
    if (results.some(r => r.status === 'rejected')) throw new Error('CACHE_DELETE');
  }
}
