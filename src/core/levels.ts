/** Ontario Growing Success achievement bands. Levels are ranges, never exact percentages. */
export type AchievementLevel = '1' | '1-' | '1+' | '2' | '2-' | '2+' | '3' | '3-' | '3+' | '4' | '4-' | '4+';
const bands = { 1: [50, 59], 2: [60, 69], 3: [70, 79], 4: [80, 100] } as const;
export function levelRange(level: AchievementLevel) {
  const band = Number(level[0]) as 1 | 2 | 3 | 4;
  const [min, max] = bands[band];
  return { min, max, midpoint: (min + max) / 2 };
}
export function parseLevel(value: string): AchievementLevel | null {
  // Only parse an explicitly labeled level or the whole grade-cell text.
  // 4/10 is a points score, never a Level 4.
  const normalized = value.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(?:achievement\s+)?level\s*[:=]?\s*([1-4])\s*([+-])?$/i)
    ?? normalized.match(/^([1-4])\s*([+-])?$/);
  return match ? (match[1] + (match[2] ?? '')) as AchievementLevel : null;
}
export function parseLevelMark(value: string): AchievementLevel | null {
  // Named average or mark fields can contain a level (with arbitrary suffix
  // text in the table), but numeric percentage wins when present.
  const match = value.match(/(?:current\s*mark|final\s*mark|midterm\s*mark|overall\s*(?:mark|average|grade))\s*[:=]\s*(?:level\s*)?([1-4])\s*([+-])?(?=\s|$|[;,])/i);
  if (match) return (match[1] + (match[2] ?? '')) as AchievementLevel;
  return parseLevel(value);
}
export function levelLabel(level: AchievementLevel): string {
  return 'Level ' + level;
}
export function levelBandLabel(level: AchievementLevel): string {
  const { min, max } = levelRange(level);
  return min + '–' + max + '%';
}
export function validLevel(value: unknown): value is AchievementLevel {
  return typeof value === 'string' && /^(?:[1-4][+-]?)$/.test(value);
}
/** Grade entered by the student, never the school's reported percentage. */
export function validManualLevelPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
export function validLevelOverride(level: AchievementLevel, value: unknown): value is number {
  if (!validManualLevelPercent(value)) return false;
  const { min, max } = levelRange(level);
  // A student can choose a value within the official band, not an impossible
  // conversion such as Level 4 = 65%.
  return value >= min && value <= max;
}
