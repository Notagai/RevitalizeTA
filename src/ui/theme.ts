import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { useApp } from '../state/AppProvider';
import { createPalette } from '../core/palette';

// Share generated palettes across every label/chart; bound the cache during customization.
const palettes = new Map<string, ReturnType<typeof createPalette>>();
function palette(main: string, accent: string, dark: boolean) {
  const key = `${main}/${accent}/${dark}`;
  let colors = palettes.get(key);
  if (!colors) {
    colors = createPalette(main, accent, dark);
    if (palettes.size >= 12) palettes.clear();
    palettes.set(key, colors);
  }
  return colors;
}

export function useTheme() {
  const system = useColorScheme();
  const { theme, mainColor, accentColor, ready } = useApp();
  // Match the server's first render before applying device and saved preferences.
  // Otherwise web hydration can leave navigation styled with the wrong palette.
  const isDark = ready && (theme === 'dark' || (theme === 'system' && system === 'dark'));
  const colors = useMemo(() => palette(mainColor, accentColor, isDark), [mainColor, accentColor, isDark]);
  return { colors, isDark };
}
