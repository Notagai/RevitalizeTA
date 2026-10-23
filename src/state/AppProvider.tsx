import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { FixtureCache } from '../core/cache';
import { demoAdapter, type Scenario } from '../core/demo';
import { initialState, SyncController, type SyncState } from '../core/sync';
import { slots } from '../storage/slots';
import { Preferences, type ThemeChoice } from '../core/preferences';

export type { ThemeChoice } from '../core/preferences';
type AppState = {
  sync: SyncState; ready: boolean; scenario: Scenario; setScenario: (value: Scenario) => void;
  theme: ThemeChoice; setTheme: (value: ThemeChoice) => void;
  preferenceError: boolean;
  refresh: () => Promise<void>; cancel: () => void; clear: () => Promise<boolean>;
};
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: PropsWithChildren) {
  const [sync, setSync] = useState<SyncState>(initialState);
  const [ready, setReady] = useState(false);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [preferenceError, setPreferenceError] = useState(false);
  const [preferences] = useState(() => new Preferences(slots));
  const [controller] = useState(() => new SyncController(new FixtureCache(slots), setSync));
  useEffect(() => {
    let mounted = true;
    const loadPreferences = preferences.load().then(value => { if (mounted) setTheme(value); }).catch(() => { if (mounted) setPreferenceError(true); });
    Promise.all([controller.hydrate(), loadPreferences]).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; controller.cancel(); };
  }, [controller, preferences]);
  function chooseTheme(value: ThemeChoice) {
    setTheme(value);
    void preferences.save(value).then(() => setPreferenceError(false)).catch(() => setPreferenceError(true));
  }
  return <Context.Provider value={{ sync, ready, scenario, setScenario, theme, setTheme: chooseTheme, preferenceError,
    refresh: () => ready ? controller.refresh(demoAdapter(scenario)) : Promise.resolve(),
    cancel: () => controller.cancel(), clear: () => controller.clear(),
  }}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider required');
  return value;
}
