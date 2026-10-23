import { useState } from 'react';
import { Link } from 'expo-router';
import { useApp, type ThemeChoice } from '../../state/AppProvider';
import { scenarios } from '../../core/demo';
import { Action, Body, Card, Heading, Page } from '../../ui/components';
import { useTheme } from '../../ui/theme';

export default function Settings() {
  const { theme, setTheme, preferenceError, scenario, setScenario, sync, ready, clear } = useApp();
  const { colors } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  return <Page><Heading>Make it yours</Heading>
    <Card><Heading>Appearance</Heading><Body muted>Theme is saved on this device.</Body>{preferenceError ? <Body>Theme could not be loaded or saved. Choose a theme to retry. Your current selection still applies to this session.</Body> : null}{(['system', 'light', 'dark'] as ThemeChoice[]).map(choice => <Action key={choice} label={`${choice[0].toUpperCase()}${choice.slice(1)}`} disabled={!ready} selected={choice === theme} onPress={() => setTheme(choice)} />)}</Card>
    <Card><Heading>Demo check scenario</Heading><Body>Select a synthetic response, then use Check demo data on Dashboard. No network request is made.</Body>
      {scenarios.map(item => <Action key={item.value} label={item.label} selected={scenario === item.value} disabled={sync.status === 'checking'} onPress={() => setScenario(item.value)} />)}
    </Card>
    <Card><Heading>Privacy and integration</Heading><Body>RevitalizeTA is unofficial and is not affiliated with TeachAssist or YRDSB. This build uses invented courses and marks only. It does not accept credentials or connect to school accounts.</Body>
      <Body>Manual checks only. No automatic refresh, background polling, notifications, analytics or remote diagnostics.</Body>
      <Body muted>The official site opens separately and does not verify this demo. Never enter credentials into third-party API services without an approved privacy review.</Body>
      <Link href="https://ta.yrdsb.ca/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16 }} accessibilityLabel="Open official TeachAssist website in browser">Open official TeachAssist ↗</Link>
    </Card>
    <Card><Heading>Local demo data</Heading><Body>Saved synthetic grades are stored on this device without encryption. Deleting removes both saved snapshot slots.</Body>
      {deleted && !sync.snapshot && sync.status === 'never' ? <Body>Local demo grade data deleted.</Body> : null}
      {sync.status === 'storage' ? <Body>Local storage operation failed. Saved data may still be present. Retry deletion or check demo data again.</Body> : null}
      {confirmDelete ? <><Body>Delete saved demo grades? You can load the fixtures again.</Body><Action label={deleting ? 'Deleting…' : 'Confirm delete demo data'} destructive disabled={deleting} onPress={() => { setDeleting(true); void clear().then(setDeleted).finally(() => { setDeleting(false); setConfirmDelete(false); }); }} /><Action label="Keep demo data" disabled={deleting} onPress={() => setConfirmDelete(false)} /></> : <Action label="Delete local demo data" destructive disabled={!ready || sync.status === 'checking'} onPress={() => { setDeleted(false); setConfirmDelete(true); }} />}
    </Card>
    <Card><Heading>Sanitized diagnostics</Heading><Body>State code: {sync.status}</Body><Body>Schema: 1 · Source: synthetic</Body><Body muted>No credentials, course contents or raw exceptions are logged. Check timestamps rely on your device clock.</Body></Card>
  </Page>;
}
