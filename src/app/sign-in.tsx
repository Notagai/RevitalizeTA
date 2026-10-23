import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SCHOOL_LOGIN_ENABLED } from '../core/integration';
import { validSchoolCredentials } from '../core/school-auth';
import { syncMessage } from '../core/presentation';
import { useApp } from '../state/AppProvider';
import { Action, BackButton, Body, Card, Heading, Page } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function SignIn() {
  const { colors } = useTheme();
  const { signIn, ready, sync, cancel } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => () => { cancel(); setPassword(''); setConsented(false); }, [cancel]));
  async function submit() {
    if (submitting || !consented || !validSchoolCredentials({ username, password })) return;
    setSubmitting(true); setFailed(false);
    try {
      const value = { username, password };
      setPassword('');
      const success = await signIn(value, name, consented);
      if (success) router.replace('/'); else setFailed(true);
    } finally { setSubmitting(false); }
  }
  return <Page><BackButton /><Heading>{SCHOOL_LOGIN_ENABLED ? 'Sign in' : 'Account connection'}</Heading>
    {!SCHOOL_LOGIN_ENABLED ? <Card><Heading>Account connection unavailable</Heading>
      <Body>Live sign-in is disabled. This build does not accept or transmit school credentials.</Body>
      <Link href="https://ta.yrdsb.ca/" style={{ color: colors.accent, paddingVertical: 14, fontSize: 16, minHeight: 48 }}>Open official TeachAssist</Link>
    </Card> : <Card>
      <Body>Use your own YRDSB TeachAssist account. Your credentials pass through the RevitalizeTA app server to the official school website over HTTPS. The unofficial TA API is not used.</Body>
      {[
        { label: 'Display name (optional)', value: name, change: setName, secure: false, limit: 80 },
        { label: 'Username', value: username, change: setUsername, secure: false, limit: 100 },
        { label: 'Password', value: password, change: setPassword, secure: true, limit: 256 },
      ].map(field => <View key={field.label} style={{ gap: 5 }}><Text style={{ color: colors.muted, fontSize: 13 }}>{field.label}</Text>
        <TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} editable={!submitting}
          secureTextEntry={field.secure} autoCapitalize="none" autoCorrect={false} maxLength={field.limit}
          keyboardType={field.label === 'Username' ? 'number-pad' : 'default'}
          autoComplete={field.secure ? 'current-password' : field.label === 'Username' ? 'username' : 'off'}
          style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text }} />
      </View>)}
      <Body muted>Credentials and grades stay in memory for this session. You must be authorized to access this account under Board policies.</Body>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="I authorize this app to access my school account" accessibilityState={{ checked: consented, disabled: submitting }} aria-checked={consented}
        disabled={submitting} onPress={() => setConsented(value => !value)} style={{ minHeight: 48, justifyContent: 'center', paddingVertical: 12 }}>
        <Text style={{ color: colors.accent, fontSize: 14 }}>{consented ? '☑' : '☐'} I authorize access to my school account</Text>
      </Pressable>
      <Action label={submitting ? 'Signing in…' : 'Sign in'} disabled={!ready || submitting || !consented || !validSchoolCredentials({ username, password })} onPress={() => { void submit(); }} />
      {submitting ? <Action label="Cancel sign-in" onPress={cancel} /> : null}
      {failed ? <View accessibilityLiveRegion="polite"><Body>{syncMessage(sync)}</Body></View> : null}
    </Card>}
  </Page>;
}
