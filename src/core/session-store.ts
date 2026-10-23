import { parseSnapshot, type Snapshot } from './model.ts';
import type { SnapshotStore } from './sync.ts';

/** Sensitive grades never enter the unencrypted synthetic fixture cache. */
export class SessionStore implements SnapshotStore {
  private snapshot: Snapshot | null = null;
  async load() { return this.snapshot; }
  async save(value: Snapshot) { this.snapshot = parseSnapshot(value); }
  async clear() { this.snapshot = null; }
}
