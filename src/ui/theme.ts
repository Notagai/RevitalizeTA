import { useColorScheme } from 'react-native';
import { useApp } from '../state/AppProvider';

const light = { background: '#F2F5F4', card: '#FFFFFF', text: '#152D29', muted: '#4E635E', accent: '#006B57', border: '#BDCEC8', tint: '#DDF2E9', danger: '#9C2D21' };
const dark = { background: '#101C19', card: '#1B2B26', text: '#F0F7F3', muted: '#B6CAC1', accent: '#88DEC1', border: '#526B60', tint: '#253E33', danger: '#FFB4A8' };
export function useTheme() {
  const system = useColorScheme();
  const { theme } = useApp();
  const isDark = theme === 'dark' || (theme === 'system' && system === 'dark');
  return { colors: isDark ? dark : light, isDark };
}
