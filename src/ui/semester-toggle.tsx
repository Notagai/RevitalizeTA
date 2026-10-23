import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Semester } from '../core/timetable';
import { useTheme } from './theme';

export function SemesterToggle({ value, onChange }: { value: Semester; onChange: (value: Semester) => void }) {
  const { colors } = useTheme();
  return <View accessibilityRole="tablist" accessibilityLabel="Semester" style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]}>
    {([1, 2] as const).map(semester => <Pressable key={semester} accessibilityRole="tab" accessibilityState={{ selected: value === semester }} aria-selected={value === semester}
      onPress={() => onChange(semester)} style={({ pressed }) => [styles.tab, { backgroundColor: value === semester ? colors.tint : 'transparent', opacity: pressed ? 0.6 : 1 }]}>
      <Text style={{ color: value === semester ? colors.accent : colors.muted, fontSize: 14, fontWeight: value === semester ? '700' : '500' }}>Semester {semester}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
