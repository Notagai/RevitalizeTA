import { type ComponentRef, type PropsWithChildren, type Ref } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

export function Page({ children, scrollRef, ...props }: PropsWithChildren<ScrollViewProps & { scrollRef?: Ref<ComponentRef<typeof ScrollView>> }>) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets {...props} contentContainerStyle={[styles.page, props.contentContainerStyle]}>{children}</ScrollView>
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
  return <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>{children}</View>;
}
export function BackButton() {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
    style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 48, minWidth: 64, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
  </Pressable>;
}
export function Action({ label, onPress, disabled = false, selected, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; destructive?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} aria-selected={selected} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, { borderColor: destructive ? colors.danger : colors.accent, backgroundColor: selected ? colors.tint : colors.card, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <Text style={[styles.actionText, { color: destructive ? colors.danger : colors.accent }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16, paddingBottom: 36, maxWidth: 760, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 22, flexShrink: 1 },
  card: { padding: 18, borderRadius: 20, borderWidth: 1, gap: 12 },
  action: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  actionText: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
});
