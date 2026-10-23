import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useApp } from '../state/AppProvider';
import { useTheme } from './theme';

const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
const webGlass: ViewStyle & { backdropFilter: string; WebkitBackdropFilter: string; backgroundImage: string } = {
  backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)',
  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%)',
};

/** Keep the content mounted when switching effects; only the decorative layer changes. */
export function GlassSurface({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { glassEnabled } = useApp();
  const { colors, isDark } = useTheme();
  return <View {...props} style={[{ backgroundColor: colors.card }, style,
    glassEnabled ? { backgroundColor: nativeGlass ? 'transparent' : colors.card + 'EB', borderTopColor: isDark ? '#FFFFFF30' : '#FFFFFFD9',
      boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.14)' : '0 4px 18px rgba(0,70,50,0.05)' } : null,
    glassEnabled && Platform.OS === 'web' ? webGlass : null, { overflow: 'hidden' }]}>
    {glassEnabled ? <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
      {nativeGlass ? <GlassView glassEffectStyle="regular" colorScheme={isDark ? 'dark' : 'light'} tintColor={colors.tint + '55'} style={StyleSheet.absoluteFill} /> : <>
        <View style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, backgroundColor: '#FFFFFF70' }} />
        <View style={{ position: 'absolute', top: -50, right: -30, width: 140, height: 90, borderRadius: 70, backgroundColor: colors.tint + '38' }} />
      </>}
    </View> : null}
    {children}
  </View>;
}
