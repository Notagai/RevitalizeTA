import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SCHOOL_LOGIN_ENABLED } from '../core/integration';
import { validSchoolCredentials } from '../core/school-auth';
import { syncMessage } from '../core/presentation';
import { useApp } from '../state/AppProvider';
import { BackButton, Page } from '../ui/components';
import { useTheme } from '../ui/theme';

export default function SignIn() {
  const { colors } = useTheme();
  const supported = SCHOOL_LOGIN_ENABLED && Platform.OS !== 'web';
  const { signIn, ready, sync, cancel } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consented, setConsented] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  useFocusEffect(useCallback(() => () => {
    cancel(); setPassword(''); setShowPassword(false); setConsented(false);
  }, [cancel]));

  const canSubmit = supported && ready && !submitting && consented
    && validSchoolCredentials({ username, password });

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFailed(false);
    const value = { username, password };
    setPassword('');
    setShowPassword(false);
    try {
      const success = await signIn(value, name, consented);
      if (success) router.replace('/');
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  const fields = [
    { label: 'Display name', placeholder: 'Optional', value: name, change: setName, limit: 80 },
    { label: 'Student ID', placeholder: '9-digit student number', value: username, change: setUsername, limit: 9 },
    { label: 'Password', placeholder: 'Your TeachAssist password', value: password, change: setPassword, limit: 256 },
  ];

  return <Page contentContainerStyle={styles.page}>
    <BackButton />
    <View style={styles.content}>
      <View style={[styles.brand, { backgroundColor: colors.hero }]}>
        <View style={styles.brandTop}>
          <View style={[styles.logoHolder, { backgroundColor: colors.card }]}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="RevitalizeTA logo" />
          </View>
          <Text style={[styles.brandName, { color: colors.onHero }]}>REVITALIZETA</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.onHero }]}>
          {supported ? 'Sign in' : 'Connection unavailable'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.heroMuted }]}>
          {supported ? 'Your courses, all in one place.' : 'Sign-in is available in the mobile app.'}
        </Text>
      </View>

      {supported ? <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {fields.map(field => {
          const isPassword = field.label === 'Password';
          const isUsername = field.label === 'Student ID';
          return <View key={field.label} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{field.label}</Text>
            <View style={[styles.inputShell, {
              borderColor: focused === field.label ? colors.accent : colors.border,
              backgroundColor: colors.background,
            }]}>
              <TextInput
                accessibilityLabel={field.label}
                value={field.value}
                onChangeText={field.change}
                editable={!submitting}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={field.limit}
                keyboardType={isUsername ? 'number-pad' : 'default'}
                autoComplete={isPassword ? 'current-password' : isUsername ? 'username' : 'off'}
                secureTextEntry={isPassword && !showPassword}
                textContentType={isPassword ? 'password' : isUsername ? 'username' : 'none'}
                onFocus={() => setFocused(field.label)}
                onBlur={() => setFocused(previous => previous === field.label ? null : previous)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text }]}
              />
              {isPassword ? <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityState={{ disabled: submitting }}
                onPress={() => setShowPassword(previous => !previous)}
                disabled={submitting}
                style={styles.passwordToggle}>
                <Text style={[styles.toggleText, { color: colors.accent }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable> : null}
            </View>
          </View>;
        })}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="I authorize access to my TeachAssist account"
          accessibilityState={{ checked: consented, disabled: submitting }}
          disabled={submitting}
          onPress={() => setConsented(previous => !previous)}
          style={styles.consentRow}>
          <View style={[styles.checkbox, {
            borderColor: consented ? colors.accent : colors.border,
            backgroundColor: consented ? colors.accent : colors.card,
          }]}>
            {consented ? <Text style={[styles.checkmark, { color: colors.card }]}>✓</Text> : null}
          </View>
          <Text style={[styles.consentText, { color: colors.muted }]}>
            I authorize access to my TeachAssist account
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          accessibilityState={{ disabled: !canSubmit, busy: submitting }}
          disabled={!canSubmit}
          onPress={() => { void submit(); }}
          style={({ pressed }) => [styles.primaryButton, {
            backgroundColor: colors.hero,
            opacity: !canSubmit ? 0.48 : pressed ? 0.8 : 1,
          }]}>
          {submitting ? <ActivityIndicator size="small" color={colors.onHero} /> : null}
          <Text style={[styles.primaryText, { color: colors.onHero }]}>
            {submitting ? 'Connecting…' : 'Sign in'}
          </Text>
          {!submitting ? <Text style={[styles.arrow, { color: colors.onHero }]}>→</Text> : null}
        </Pressable>
        {submitting ? <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel sign-in</Text>
        </Pressable> : null}
        {failed ? <View accessibilityLiveRegion="polite" style={[styles.errorBox, { borderColor: colors.danger }]}>
          <Text style={[styles.errorTitle, { color: colors.danger }]}>Could not sign in</Text>
          <Text selectable style={[styles.errorMessage, { color: colors.text }]}>{syncMessage(sync)}</Text>
        </View> : null}
      </View> : <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.unavailable, { color: colors.text }]}>
          Open RevitalizeTA on Android or iOS to connect to TeachAssist.
        </Text>
      </View>}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          Sign-in is handled on your device.
        </Text>
        <Link href="https://ta.yrdsb.ca/" style={[styles.officialLink, { color: colors.accent }]}>
          Official TeachAssist website ↗
        </Link>
      </View>
    </View>
  </Page>;
}

const styles = StyleSheet.create({
  page: { maxWidth: 560, gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  content: { gap: 16, width: '100%', maxWidth: 440, alignSelf: 'center' },
  brand: { borderRadius: 24, paddingHorizontal: 24, paddingVertical: 24, gap: 8 },
  brandTop: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  logoHolder: { width: 47, height: 47, borderRadius: 15, padding: 6, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 35, height: 35 },
  brandName: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { fontSize: 36, lineHeight: 42, letterSpacing: -1.2, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 21 },
  formCard: { borderWidth: 1, borderRadius: 24, padding: 22, gap: 18 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  inputShell: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, minHeight: 54 },
  input: { flex: 1, minHeight: 52, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  passwordToggle: { minHeight: 48, minWidth: 60, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  checkbox: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkmark: { fontSize: 16, fontWeight: '800', lineHeight: 19 },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryText: { fontSize: 16, fontWeight: '800' },
  arrow: { fontSize: 19, fontWeight: '600', position: 'absolute', right: 18 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelText: { fontSize: 14, fontWeight: '700' },
  errorBox: { gap: 6, borderWidth: 1, borderRadius: 14, padding: 14 },
  errorTitle: { fontSize: 14, fontWeight: '800' },
  errorMessage: { fontSize: 13, lineHeight: 20 },
  unavailable: { fontSize: 15, lineHeight: 23 },
  footer: { alignItems: 'center', gap: 9, paddingBottom: 10 },
  footerText: { fontSize: 12 },
  officialLink: { fontSize: 13, minHeight: 36, textAlignVertical: 'center', textAlign: 'center', fontWeight: '700' },
});
