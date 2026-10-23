import type { SlotStorage } from './cache.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export function parseTheme(raw: string | null): ThemeChoice {
  if (raw === null) return 'system';
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1 || !['system', 'light', 'dark'].includes(parsed.theme)) throw new Error('PREFERENCES_INVALID');
  return parsed.theme;
}
/** Serialized writes keep the final selection when a user changes themes quickly. */
export class Preferences {
  private storage: SlotStorage;
  private pending: Promise<void> = Promise.resolve();
  constructor(storage: SlotStorage) { this.storage = storage; }
  async load() { return parseTheme(await this.storage.read('preferences.json')); }
  save(theme: ThemeChoice) {
    const operation = this.pending.catch(() => {}).then(() => this.storage.write('preferences.json', JSON.stringify({ version: 1, theme })));
    this.pending = operation;
    return operation;
  }
}
