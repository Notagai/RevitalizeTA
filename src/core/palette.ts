/** Two seed colors generate the entire palette; foregrounds meet WCAG AA contrast. */
export const DEFAULT_MAIN = '#006B57';
export const DEFAULT_ACCENT = '#88DEC1';

export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) return `#${hex.split('').map(c => c + c).join('').toUpperCase()}`;
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}
function rgb(hex: string) {
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
}
export function mix(a: string, b: string, amount: number): string {
  const target = rgb(b);
  return `#${rgb(a).map((channel, index) => Math.round(channel + (target[index] - channel) * amount).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function luminance(hex: string) {
  const channels = rgb(hex).map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function readable(seed: string, surface: string | string[], ratio = 4.5) {
  const backgrounds = typeof surface === 'string' ? [surface] : surface;
  const minimum = (color: string) => Math.min(...backgrounds.map(background => contrast(color, background)));
  const target = minimum('#FFFFFF') > minimum('#000000') ? '#FFFFFF' : '#000000';
  for (let step = 0; step <= 100; step++) {
    const color = mix(seed, target, step / 100);
    if (minimum(color) >= ratio) return color;
  }
  return target;
}
export function createPalette(mainColor: string, accentColor: string, dark: boolean) {
  const main = normalizeHex(mainColor) ?? DEFAULT_MAIN;
  const secondary = normalizeHex(accentColor) ?? DEFAULT_ACCENT;
  const background = mix(dark ? '#101513' : '#F5F7F5', main, dark ? 0.08 : 0.025);
  const card = dark ? mix('#1A2420', main, 0.08) : '#FFFFFF';
  const tint = mix(card, secondary, dark ? 0.16 : 0.2);
  const hero = mix(main, '#000000', 0.12);
  const surfaces = [background, card, tint];
  return {
    background, card, tint, hero,
    text: readable(dark ? '#EFF7F2' : '#182E27', surfaces),
    muted: readable(dark ? '#A8BDB2' : '#596C62', surfaces),
    accent: readable(main, surfaces),
    secondary: readable(secondary, surfaces),
    border: mix(card, main, dark ? 0.32 : 0.16),
    track: mix(card, secondary, dark ? 0.23 : 0.3),
    bar: readable(main, mix(card, secondary, dark ? 0.23 : 0.3), 3),
    onHero: readable('#FFFFFF', hero),
    heroAccent: readable(secondary, hero, 3),
    heroMuted: readable(mix(hero, '#FFFFFF', 0.8), hero),
    danger: readable(dark ? '#FFB4A8' : '#A12F23', surfaces),
  };
}
