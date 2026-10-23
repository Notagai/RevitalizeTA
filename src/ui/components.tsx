import { useEffect, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { cacheAge, syncMessage, timestamp } from '../core/presentation';
import { useTheme } from './theme';

export function Page({ children, ...props }: PropsWithChildren<ScrollViewProps>) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.page} {...props}>{children}</ScrollView>
  </SafeAreaView>;
}
export function Heading({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{children}</Text>;
}
export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: muted ? colors.muted : colors.text }]}>{children}</Text>;
}
export function Card({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}
export function Action({ label, onPress, disabled = false, selected, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; destructive?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, { borderColor: destructive ? colors.danger : colors.accent, backgroundColor: selected ? colors.tint : colors.card, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <Text style={[styles.actionText, { color: destructive ? colors.danger : colors.accent }]}>{label}</Text>
  </Pressable>;
}
export function SyncCard() {
  const { sync, ready, refresh, cancel } = useApp();
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  return <Card>
    <Heading>Synthetic demo</Heading>
    <View accessibilityLiveRegion="polite"><Body>{ready ? syncMessage(sync) : 'Reading saved demo data…'}</Body></View>
    {sync.snapshot ? <><Body muted>Last verified demo check: {timestamp(sync.snapshot.checkedAt)}</Body><Body muted>{cacheAge(sync.snapshot.checkedAt)} · Source: synthetic fixture</Body></> : null}
    {sync.lastAttempt ? <Body muted>Last attempt: {timestamp(sync.lastAttempt)}</Body> : null}
    <Action label={sync.status === 'checking' ? 'Cancel check' : 'Check demo data'} disabled={!ready || sync.status === 'deleting'} onPress={() => { if (sync.status === 'checking') cancel(); else void refresh(); }} />
  </Card>;
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 23, lineHeight: 30, fontWeight: '700', flexShrink: 1 },
  body: { fontSize: 16, lineHeight: 25, flexShrink: 1 },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 10 },
  action: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  actionText: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
});
