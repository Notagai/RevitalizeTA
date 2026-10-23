import { useState } from 'react';
import { Link } from 'expo-router';
import { useApp, type ThemeChoice } from '../../state/AppProvider';
import { SCHOOL_LOGIN_ENABLED } from '../../core/integration';
import { Action, Body, Card, Heading, Page } from '../../ui/components';
import { useTheme } from '../../ui/theme';
import { ThemeEditor } from '../../ui/theme-editor';

export default function Settings() {
  const { theme, setTheme, preferenceError, signedIn, displayName, ready, clear, sync, privacyMode, setPrivacyMode } = useApp();
  const { colors } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<'deleted' | 'failed' | null>(null);
  return <Page><Heading>Settings</Heading>
    <Card><Heading>Account</Heading>
      <Body>{signedIn ? displayName || 'Signed in' : SCHOOL_LOGIN_ENABLED ? 'Not signed in' : 'Account connection unavailable.'}</Body>
      {!signedIn ? <Link href="/sign-in" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16, minHeight: 48 }}>Sign in</Link> : null}
      <Body muted>Credentials, grades, comparison history, and course weights stay in memory for this session. Closing the app clears them.</Body>
      {confirmDelete ? <><Body>Sign out and clear grades? This also removes any legacy grade cache. Your color preferences will be kept.</Body>
        <Action label={deleting ? 'Clearing…' : 'Confirm sign out and clear grades'} destructive disabled={deleting}
          onPress={() => { setDeleting(true); void clear().then(success => setResult(success ? 'deleted' : 'failed')).finally(() => { setDeleting(false); setConfirmDelete(false); }); }} />
        <Action label="Cancel" disabled={deleting} onPress={() => setConfirmDelete(false)} />
      </> : <Action label="Sign out and clear grade data" destructive disabled={!ready || sync.status === 'deleting'}
        onPress={() => { setResult(null); setConfirmDelete(true); }} />}
      {result === 'deleted' ? <Body>Signed out. Grade data cleared.</Body> : result === 'failed' ? <Body>Some local data could not be removed. Please retry.</Body> : null}
    </Card>
    <Card><Heading>Privacy Mode</Heading>
      <Body muted>When enabled, marks and grade-related details stay hidden until you choose Show for each course or for your overall average. Screenshots remain available. Revealed values reset when you sign out or switch modes.</Body>
      <Action label={privacyMode ? 'Turn Privacy Mode off' : 'Turn Privacy Mode on'}
        selected={privacyMode} onPress={() => setPrivacyMode(!privacyMode)} />
    </Card>
    <Card><Heading>Appearance</Heading>
      {preferenceError ? <Body>Appearance could not be saved. Choose it again to retry.</Body> : null}
      {(['system', 'light', 'dark'] as ThemeChoice[]).map(choice => <Action key={choice}
        label={`${choice[0].toUpperCase()}${choice.slice(1)}`} disabled={!ready} selected={choice === theme} onPress={() => setTheme(choice)} />)}
    </Card>
    <ThemeEditor />
    <Card><Heading>Privacy</Heading>
      <Body>RevitalizeTA is unofficial and is not affiliated with TeachAssist or YRDSB. Login goes through the RevitalizeTA app server to the official TeachAssist website. The unofficial TA API is not used.</Body>
      <Body muted>Credentials and grades stay in memory. Sessions expire after 15 minutes without a successful refresh. Refresh is manual; the app does not log credentials or grades.</Body>
      <Link href="https://ta.yrdsb.ca/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16, minHeight: 48 }}>Official TeachAssist website</Link>
    </Card>
  </Page>;
}
