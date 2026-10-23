import { Tabs } from 'expo-router';
import { BottomNavigation } from '../../ui/bottom-navigation';

export default function TabLayout() {
  return <Tabs tabBar={props => <BottomNavigation {...props} />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
    <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
