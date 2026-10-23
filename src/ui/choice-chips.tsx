import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './theme';

export function ChoiceChips<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly T[]; value: T; onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
    {options.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: option === value }} aria-checked={option === value}
      onPress={() => onChange(option)} style={({ pressed }) => [styles.chip, {
        backgroundColor: option === value ? colors.tint : colors.card, borderColor: option === value ? colors.accent : colors.border, opacity: pressed ? 0.6 : 1,
      }]}><Text style={{ color: option === value ? colors.accent : colors.muted, fontSize: 12, fontWeight: '600' }}>{option}</Text></Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
});
