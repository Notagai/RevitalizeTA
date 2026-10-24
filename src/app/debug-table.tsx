import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Share, StyleSheet, Text, View } from 'react-native';
import { currentTableDebugCapture } from '../core/debug-table';
import { Action, BackButton, Body, Heading, Page } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function DebugTablePage() {
  const { colors } = useTheme();
  // Retain only a generated, sanitized copy. The original school HTML is
  // never kept by the recorder or displayed in this debugging screen.
  const [snapshot] = useState(currentTableDebugCapture);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  async function openHtml() {
    if (!snapshot || exporting) return;
    setExporting(true); setError('');
    try {
      const file = new File(Paths.cache, 'revitalizeta-teachassist-redacted.html');
      file.create({ overwrite: true });
      await file.write(snapshot.html);
      await file.preview({ title: 'Sanitized TeachAssist table' });
    } catch {
      setError('HTML preview is unavailable on this emulator. Use Share or select and copy the HTML below.');
    } finally { setExporting(false); }
  }

  async function shareHtml() {
    if (!snapshot || exporting) return;
    setExporting(true); setError('');
    try {
      // Native Share uses a local Android share sheet. It never POSTs data to
      // RevitalizeTA, GitHub, or any server controlled by this app.
      await Share.share({
        title: 'RevitalizeTA sanitized TeachAssist table',
        message: snapshot.html,
      });
    } catch {
      setError('Share is unavailable. Long-press and copy the selectable HTML below instead.');
    } finally { setExporting(false); }
  }

  return <Page contentContainerStyle={styles.page}>
    <BackButton />
    <Heading>TeachAssist table debugger</Heading>
    <Body muted>This temporary screen is only on the debugging branch. It shows invented values in the shape of the school response, not actual names, student IDs, marks or credentials.</Body>
    {!snapshot ? <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Body>No captured response yet. Return to Sign in, attempt a login, then open this screen using the error panel.</Body>
    </View> : <>
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.stage, { color: colors.text }]}>Captured: {snapshot.stage === 'course-list' ? 'Course list' : 'Course report'}</Text>
        <Body muted>The file contains table rows, column structure, safe HTML attributes, and structural labels. Sensitive contents have been replaced with example text.</Body>
        <Action label={exporting ? 'Opening HTML…' : 'Open local HTML preview'} disabled={exporting} onPress={() => { void openHtml(); }} />
        <Action label={exporting ? 'Sharing…' : 'Share redacted HTML'} disabled={exporting} onPress={() => { void shareHtml(); }} />
        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Copyable HTML</Text>
      <View style={[styles.codeBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text selectable accessibilityLabel="Sanitized TeachAssist HTML" style={[styles.code, { color: colors.text }]}>{snapshot.html}</Text>
      </View>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingBottom: 56 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  stage: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  codeBox: { borderWidth: 1, borderRadius: 14, padding: 12 },
  code: { fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
});
