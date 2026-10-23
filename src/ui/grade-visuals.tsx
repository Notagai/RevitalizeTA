import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { percent } from '../core/presentation';
import { mix } from '../core/palette';
import { GlassSurface } from './glass-surface';
import { useTheme } from './theme';

export function Eyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  const { colors } = useTheme();
  return <Text style={[styles.eyebrow, { color: inverse ? colors.heroMuted : colors.muted }]}>{children}</Text>;
}

export function GradeBar({ value, label, color }: { value: number | null; label: string; color?: string }) {
  const { colors } = useTheme();
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label}: ${percent(value)}`}
    accessibilityValue={value === null ? { text: 'No grade available' } : { min: 0, max: 100, now: value }}
    style={[styles.track, { backgroundColor: colors.track }]}>
    {value !== null ? <View style={[styles.fill, { backgroundColor: color ?? colors.bar, width: `${Math.max(0, Math.min(100, value))}%` }]} /> : null}
  </View>;
}

// Two clipped semicircles make a smooth, transparent ring with a constant view count.
export const GradeRing = memo(function GradeRing({ value, inverse = false, label = 'average' }: { value: number | null; inverse?: boolean; label?: string }) {
  const { colors } = useTheme();
  const filled = value === null ? 0 : Math.max(0, Math.min(100, value));
  const fill = inverse ? colors.heroAccent : colors.bar;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${label}: ${percent(value)}`} style={styles.ring}>
    <View aria-hidden pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', borderRadius: 68 }]}>
      <View style={[styles.circle, { left: 4, top: 4, borderColor: inverse ? mix(colors.hero, colors.heroAccent, 0.2) : colors.track }]} />
      {filled > 0 ? <View style={[styles.half, { left: 68 }]}><View style={[styles.circle, { left: -64, borderColor: 'transparent', borderTopColor: fill, borderRightColor: fill, transform: [{ rotate: `${Math.min(filled, 50) * 3.6 - 135}deg` }] }]} /></View> : null}
      {filled > 50 ? <View style={[styles.half, { left: 4 }]}><View style={[styles.circle, { left: 0, borderColor: 'transparent', borderTopColor: fill, borderRightColor: fill, transform: [{ rotate: `${(filled - 50) * 3.6 + 45}deg` }] }]} /></View> : null}
    </View>
    <Text style={[styles.ringValue, { color: inverse ? colors.onHero : colors.text }]}>{value === null ? '—' : value.toFixed(1)}<Text style={styles.percent}>{value === null ? '' : '%'}</Text></Text>
    <Text style={[styles.ringLabel, { color: inverse ? colors.heroMuted : colors.muted }]}>{value === null ? 'No grade yet' : label}</Text>
  </View>;
});

export function Metric({ value, label, alert = false }: { value: number | string; label: string; alert?: boolean }) {
  const { colors } = useTheme();
  return <GlassSurface style={[styles.metric, { borderColor: colors.border }]}>
    <View style={[styles.dot, { backgroundColor: alert ? colors.danger : colors.accent }]} />
    <Text style={[styles.metricValue, { color: alert ? colors.danger : colors.text }]}>{value}</Text>
    <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
  </GlassSurface>;
}

export function Badge({ label, alert = false }: { label: string; alert?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.badge, { backgroundColor: colors.tint }]}><Text style={[styles.badgeText, { color: alert ? colors.danger : colors.accent }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 1.6, fontWeight: '700', textTransform: 'uppercase' },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  ring: { width: 136, height: 136, borderRadius: 68, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circle: { position: 'absolute', top: 0, width: 128, height: 128, borderWidth: 8, borderRadius: 64 },
  half: { position: 'absolute', top: 4, width: 64, height: 128, overflow: 'hidden' },
  ringValue: { fontSize: 31, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  percent: { fontSize: 16 },
  ringLabel: { fontSize: 11, marginTop: 2 },
  metric: { flex: 1, minWidth: 85, borderRadius: 18, borderWidth: 1, padding: 14, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metricValue: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 12, lineHeight: 17 },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
});
