import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from './glass-surface';
import { NavigationIcon } from './navigation-icon';
import { useTheme } from './theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function BottomNavigation({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  return <GlassSurface style={[styles.bar, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8), paddingLeft: Math.max(insets.left, 10), paddingRight: Math.max(insets.right, 10) }]}>
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="Main navigation">{state.routes.map((route, index) => {
      const focused = state.index === index;
      const { options } = descriptors[route.key];
      const label = options.title ?? route.name;
      const color = focused ? colors.accent : colors.muted;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel ?? label} accessibilityState={{ selected: focused }} aria-selected={focused}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [styles.tab, { backgroundColor: focused ? colors.tint : 'transparent', borderColor: focused ? colors.border : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
        <NavigationIcon color={color} name={route.name === 'index' ? 'overview' : route.name === 'analytics' ? 'analytics' : 'settings'} />
        <Text style={{ fontSize: 11, lineHeight: 16, fontWeight: focused ? '700' : '500', color }}>{label}</Text>
      </Pressable>;
    })}</View>
  </GlassSurface>;
}
const styles = StyleSheet.create({
  bar: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 6 },
});
