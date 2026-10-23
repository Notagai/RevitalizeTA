import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppProvider';
import { cacheAge, syncMessage } from '../core/presentation';
import { useTheme } from './theme';

export function SyncNotice() {
  const { sync, ready, refresh, cancel } = useApp();
  const { colors } = useTheme();
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(tick => tick + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const checking = sync.status === 'checking';
  const busy = checking || sync.status === 'deleting';
  const failed = !['never', 'changed', 'unchanged', 'checking', 'deleting', 'cancelled'].includes(sync.status);
  let message = !ready ? 'Reading saved grades…' : checking ? 'Refreshing demo grades…' : sync.status === 'deleting' ? 'Deleting saved demo grades…'
    : sync.status === 'cancelled' ? 'Refresh cancelled · Saved grades kept'
    : failed ? `${sync.status === 'offline' ? 'Offline' : sync.status === 'storage' ? 'Storage error' : 'Couldn’t refresh'} · ${sync.snapshot ? 'Saved grades kept' : 'Try again'}`
    : sync.snapshot ? `Demo grades · ${cacheAge(sync.snapshot.checkedAt)}` : 'Demo grades · Ready to explore';
  if (sync.status === 'changed') message = `Demo grades updated · ${sync.changes.length} changes`;
  if (sync.status === 'unchanged') message = 'Demo grades up to date';
  return <View testID="sync-notice" style={[styles.notice, { backgroundColor: colors.tint, borderBottomColor: colors.border }]}>
    {checking ? <ActivityIndicator size="small" color={colors.accent} accessibilityLabel="Refreshing" /> : <View aria-hidden style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: failed ? colors.danger : colors.accent }} />}
    <View style={{ flex: 1 }} accessibilityLiveRegion="polite"><Text accessibilityLabel={ready ? syncMessage(sync) : message} style={{ fontSize: 12, lineHeight: 17, color: failed ? colors.danger : colors.muted }}>{message}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={checking ? 'Cancel refresh' : sync.snapshot ? 'Refresh demo grades' : 'Load demo grades'}
      accessibilityState={{ disabled: !ready || sync.status === 'deleting', busy }} aria-busy={busy} disabled={!ready || sync.status === 'deleting'}
      onPress={() => { if (checking) cancel(); else void refresh(); }} style={({ pressed }) => ({ minHeight: 44, minWidth: 58, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', opacity: !ready || sync.status === 'deleting' ? 0.5 : pressed ? 0.65 : 1 })}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{checking ? 'Cancel' : sync.snapshot ? 'Refresh' : 'Load'}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({ notice: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 20, paddingRight: 12, borderBottomWidth: StyleSheet.hairlineWidth } });
