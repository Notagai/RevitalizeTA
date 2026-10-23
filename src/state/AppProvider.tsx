import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { FixtureCache } from '../core/cache';
import { demoAdapter, type Scenario } from '../core/demo';
import { initialState, SyncController, type SyncState } from '../core/sync';
import { slots } from '../storage/slots';
import { defaultAppearance, Preferences, type Appearance, type ThemeChoice } from '../core/preferences';
import { normalizeHex } from '../core/palette';

export type { ThemeChoice } from '../core/preferences';
type AppState = {
  sync: SyncState; ready: boolean; scenario: Scenario; setScenario: (value: Scenario) => void;
  theme: ThemeChoice; setTheme: (value: ThemeChoice) => void;
  mainColor: string; accentColor: string; setColors: (main: string, accent: string) => void;
  liquidGlass: boolean; setLiquidGlass: (value: boolean) => void; glassEnabled: boolean;
  preferenceError: boolean;
  refresh: () => Promise<void>; cancel: () => void; clear: () => Promise<boolean>;
};
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: PropsWithChildren) {
  const [sync, setSync] = useState<SyncState>(initialState);
  const [ready, setReady] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [preferenceError, setPreferenceError] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(Platform.OS === 'ios');
  const [preferences] = useState(() => new Preferences(slots));
  const [controller] = useState(() => new SyncController(new FixtureCache(slots), setSync));
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => { changed = true; setReduceTransparency(value); });
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (mounted && !changed) setReduceTransparency(value); }).catch(() => {});
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    let mounted = true;
    const loadPreferences = preferences.loadAppearance().then(value => { if (mounted) setAppearance(value); }).catch(() => { if (mounted) setPreferenceError(true); });
    Promise.all([controller.hydrate(), loadPreferences]).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; controller.cancel(); };
  }, [controller, preferences]);
  function saveAppearance(value: Appearance) {
    setAppearance(value);
    void preferences.saveAppearance(value).then(() => setPreferenceError(false)).catch(() => setPreferenceError(true));
  }
  return <Context.Provider value={{ sync, ready, scenario, setScenario, ...appearance,
    glassEnabled: ready && appearance.liquidGlass && !reduceTransparency,
    setLiquidGlass: value => saveAppearance({ ...appearance, liquidGlass: value }),
    setTheme: value => saveAppearance({ ...appearance, theme: value }),
    setColors: (main, accent) => {
      const mainColor = normalizeHex(main), accentColor = normalizeHex(accent);
      if (mainColor && accentColor) saveAppearance({ ...appearance, mainColor, accentColor });
    }, preferenceError,
    refresh: () => ready ? controller.refresh(demoAdapter(scenario)) : Promise.resolve(),
    cancel: () => controller.cancel(), clear: () => controller.clear(),
  }}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider required');
  return value;
}
