import { Pressable, Text } from 'react-native';
import { useApp } from '../state/AppProvider';
import { useTheme } from './theme';

/** Each grade reveal is explicit and never persisted to disk. */
export function GradeReveal({ id, label }: { id: string; label: string }) {
  const { privacyMode, isGradeVisible, showGrade } = useApp();
  const { colors } = useTheme();
  if (!privacyMode || isGradeVisible(id)) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={() => showGrade(id)}
    style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center',
      borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9,
      borderColor: colors.accent }}>
    <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>{label}</Text>
  </Pressable>;
}
