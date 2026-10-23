import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Action } from './components';
import { useTheme } from './theme';

export function CourseWeightEditor({ code, weight, onSave }: { code: string; weight: number; onSave: (weight: number) => void }) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(String(weight));
  const value = Number(draft);
  const valid = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(draft) && Number.isFinite(value) && value >= 0 && value <= 10;
  return <View style={{ gap: 6 }}>
    <Text style={{ color: colors.muted, fontSize: 12 }}>Course weight</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TextInput accessibilityLabel={`${code} course weight`} accessibilityHint="A number from zero to ten; zero excludes this course"
        value={draft} onChangeText={setDraft} inputMode="decimal" maxLength={8} selectTextOnFocus
        style={{ flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, borderColor: valid ? colors.border : colors.danger, color: colors.text }} />
      <Action label="Apply weight" disabled={!valid || value === weight} onPress={() => onSave(value)} />
    </View>
    {!valid ? <Text style={{ color: colors.danger, fontSize: 12 }}>Enter a weight from 0 to 10.</Text> : null}
  </View>;
}
