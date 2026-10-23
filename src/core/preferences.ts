import type { SlotStorage } from './cache.ts';
import { DEFAULT_ACCENT, DEFAULT_MAIN, normalizeHex } from './palette.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Appearance = { theme: ThemeChoice; mainColor: string; accentColor: string };
export const defaultAppearance: Appearance = { theme: 'system', mainColor: DEFAULT_MAIN, accentColor: DEFAULT_ACCENT };
export function parseAppearance(raw: string | null): Appearance {
  if (raw === null) return { ...defaultAppearance };
  const parsed = JSON.parse(raw);
  if (!parsed || ![1, 2, 3, 4].includes(parsed.version) || !['system', 'light', 'dark'].includes(parsed.theme)) throw new Error('PREFERENCES_INVALID');
  if (parsed.version === 1) return { ...defaultAppearance, theme: parsed.theme };
  const mainColor = typeof parsed.mainColor === 'string' ? normalizeHex(parsed.mainColor) : null;
  const accentColor = typeof parsed.accentColor === 'string' ? normalizeHex(parsed.accentColor) : null;
  if (!mainColor || !accentColor) throw new Error('PREFERENCES_INVALID');
  if (parsed.version === 3 && typeof parsed.liquidGlass !== 'boolean') throw new Error('PREFERENCES_INVALID');
  return { theme: parsed.theme, mainColor, accentColor };
}
export function parseTheme(raw: string | null): ThemeChoice {
  return parseAppearance(raw).theme;
}
/** Serialized writes keep the final selection when a user changes themes quickly. */
export class Preferences {
  private storage: SlotStorage;
  private pending: Promise<void> = Promise.resolve();
  constructor(storage: SlotStorage) { this.storage = storage; }
  async loadPrivacyMode() {
    const raw = await this.storage.read('privacy-mode.json');
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'boolean') throw new Error('PRIVACY_INVALID');
    return parsed;
  }
  async savePrivacyMode(enabled: boolean) {
    await this.storage.write('privacy-mode.json', JSON.stringify(enabled));
  }
  async load() { return parseTheme(await this.storage.read('preferences.json')); }
  async loadAppearance() { return parseAppearance(await this.storage.read('preferences.json')); }
  save(theme: ThemeChoice) {
    return this.saveAppearance({ ...defaultAppearance, theme });
  }
  saveAppearance(appearance: Appearance) {
    const validated = parseAppearance(JSON.stringify({ version: 4, ...appearance }));
    const operation = this.pending.catch(() => {}).then(() => this.storage.write('preferences.json', JSON.stringify({ version: 4, ...validated })));
    this.pending = operation;
    return operation;
  }
}
