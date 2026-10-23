import { Tabs } from 'expo-router';
import { useTheme } from '../../ui/theme';
import { BottomNavigation } from '../../ui/bottom-navigation';

export default function TabLayout() {
  const { colors } = useTheme();
  return <Tabs tabBar={props => <BottomNavigation {...props} />} screenOptions={{
    headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Dashboard', headerTitle: 'RevitalizeTA' }} />
    <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
