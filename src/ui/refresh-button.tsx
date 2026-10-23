import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { SCHOOL_LOGIN_ENABLED } from '../core/integration';
import { useApp } from '../state/AppProvider';
import { useTheme } from './theme';

/** Mounted only on Dashboard. Cooldown is shared with sign-in and transport. */
export function RefreshButton() {
  const { sync, ready, signedIn, retryAt, refresh, cancel } = useApp();
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now);
  const coolingDown = now < retryAt;
  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt, coolingDown]);
  const checking = sync.status === 'checking';
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const disabled = !ready || sync.status === 'deleting' || (!checking && (!SCHOOL_LOGIN_ENABLED || !signedIn || seconds > 0));
  return <Pressable accessibilityRole="button" accessibilityLabel={checking ? 'Cancel refresh' : 'Refresh grades'}
    accessibilityHint={!signedIn ? 'Sign in to refresh your grades' : undefined}
    accessibilityState={{ disabled, busy: checking }} disabled={disabled} onPress={() => { if (checking) cancel(); else void refresh(); }}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', justifyContent: 'center',
      borderRadius: 12, borderWidth: 1, borderColor: colors.heroAccent, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
    <Text style={{ color: colors.heroAccent, fontSize: 13, fontWeight: '700' }}>{checking ? 'Cancel' : seconds > 0 ? `Wait ${seconds}s` : 'Refresh'}</Text>
  </Pressable>;
}
