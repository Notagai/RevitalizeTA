import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../state/AppProvider';
import { useTheme } from '../ui/theme';

function Navigation() {
  const { colors, isDark } = useTheme();
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="course/[id]" />
    <Stack.Screen name="weights" />
    <Stack.Screen name="sign-in" />
    <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />
  </Stack></>;
}
export default function RootLayout() { return <AppProvider><Navigation /></AppProvider>; }
