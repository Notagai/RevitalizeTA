import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createPalette, DEFAULT_ACCENT, DEFAULT_MAIN, normalizeHex } from '../core/palette';
import { useApp } from '../state/AppProvider';
import { Action, Body, Card, Heading } from './components';
import { Eyebrow } from './grade-visuals';
import { useTheme } from './theme';

const presets = [
  { name: 'Forest', main: DEFAULT_MAIN, accent: DEFAULT_ACCENT },
  { name: 'Ocean', main: '#205D91', accent: '#8FD5EF' },
  { name: 'Plum', main: '#754679', accent: '#E7B7E2' },
  { name: 'Amber', main: '#805018', accent: '#F0CD7C' },
];

export function ThemeEditor() {
  const { mainColor, accentColor } = useApp();
  return <ColorEditor key={`${mainColor}-${accentColor}`} />;
}

function ColorEditor() {
  const { mainColor, accentColor, setColors, ready, preferenceError } = useApp();
  const { colors, isDark } = useTheme();
  const [main, setMain] = useState(mainColor);
  const [accent, setAccent] = useState(accentColor);
  const [applied, setApplied] = useState(false);
  const validMain = normalizeHex(main), validAccent = normalizeHex(accent);
  const preview = createPalette(main, accent, isDark);
  const valid = !!validMain && !!validAccent;
  const unchanged = validMain === mainColor && validAccent === accentColor;

  return <Card><Heading>Colors</Heading>
    <View style={styles.presets}>{presets.map(preset => <Pressable key={preset.name} accessibilityRole="button" accessibilityLabel={`Preview ${preset.name} colors`}
      accessibilityState={{ selected: validMain === preset.main && validAccent === preset.accent, disabled: !ready }} disabled={!ready}
      onPress={() => { setMain(preset.main); setAccent(preset.accent); setApplied(false); }}
      style={[styles.preset, { borderColor: validMain === preset.main && validAccent === preset.accent ? colors.accent : colors.border }]}>
      <View style={{ flexDirection: 'row' }}><View style={[styles.swatch, { backgroundColor: preset.main }]} /><View style={[styles.swatch, { backgroundColor: preset.accent, marginLeft: -7 }]} /></View>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{preset.name}</Text>
    </Pressable>)}</View>
    <View style={styles.fields}>{[
      { label: 'Main color', value: main, set: setMain, valid: validMain },
      { label: 'Accent color', value: accent, set: setAccent, valid: validAccent },
    ].map(field => <View key={field.label} style={styles.field}><Eyebrow>{field.label}</Eyebrow>
      <View style={[styles.inputWrap, { borderColor: field.valid ? colors.border : colors.danger }]}>
        <View style={[styles.smallSwatch, { backgroundColor: field.valid ?? colors.track }]} />
        <TextInput accessibilityLabel={`${field.label} hex code`} accessibilityHint="Enter a three or six digit hex color" value={field.value} editable={ready}
          onChangeText={value => { field.set(value); setApplied(false); }} autoCapitalize="characters" autoCorrect={false} maxLength={7}
          placeholder="#006B57" placeholderTextColor={colors.muted} selectTextOnFocus
          style={{ flex: 1, minHeight: 48, color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] }} />
      </View>
      {!field.valid ? <Text style={{ color: colors.danger, fontSize: 12 }}>Use #RGB or #RRGGBB.</Text> : null}
    </View>)}</View>
    <View style={[styles.preview, { backgroundColor: preview.background, borderColor: colors.border }]}>
      <Text style={{ color: preview.muted, fontSize: 11, letterSpacing: 1, fontWeight: '700' }}>LIVE PREVIEW</Text>
      <View style={{ borderRadius: 15, backgroundColor: preview.hero, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: preview.onHero, fontWeight: '700', fontSize: 16 }}>Your progress</Text><Text style={{ color: preview.onHero, fontWeight: '700', fontSize: 25 }}>85.0%</Text>
      </View>
      <View style={{ backgroundColor: preview.card, borderRadius: 12, padding: 13, gap: 10 }}>
        <Text style={{ color: preview.text, fontWeight: '600' }}>Advanced Functions</Text>
        <View style={{ height: 8, backgroundColor: preview.track, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 8, width: '85%', backgroundColor: preview.bar, borderRadius: 4 }} /></View>
        <Text style={{ color: preview.muted, fontSize: 12 }}>Reported grade · Sample preview</Text>
      </View>
    </View>
    <Action label={applied && unchanged ? 'Colors applied' : 'Apply colors'} disabled={!ready || !valid} onPress={() => { setColors(main, accent); setApplied(true); }} />
    <Action label="Reset to forest green" disabled={!ready} onPress={() => { setColors(DEFAULT_MAIN, DEFAULT_ACCENT); setMain(DEFAULT_MAIN); setAccent(DEFAULT_ACCENT); setApplied(false); }} />
    <View accessibilityLiveRegion="polite"><Body muted>{preferenceError ? 'Colors apply for this session, but could not be saved. Tap Apply colors to retry.' : !valid ? 'Enter valid colors to apply your palette.' : unchanged ? 'Current colors are applied. Your palette is saved on this device.' : 'Preview only. Apply colors to update the app.'}</Body></View>
  </Card>;
}

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { flex: 1, minWidth: 65, minHeight: 72, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  swatch: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF' },
  smallSwatch: { width: 18, height: 18, borderRadius: 9 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 125, gap: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12 },
  preview: { padding: 14, borderWidth: 1, borderRadius: 18, gap: 12 },
});
