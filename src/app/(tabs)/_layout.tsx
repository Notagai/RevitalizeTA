import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../ui/theme';

export default function TabLayout() {
  const { colors } = useTheme();
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
    headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>▦</Text> }} />
    <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>≋</Text> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Text accessible={false} style={{ color, fontSize: 22 }}>⚙</Text> }} />
  </Tabs>;
}
