import { createContext, useContext } from 'react';
import type { ThemeChoice } from '../core/preferences';
import type { SyncState } from '../core/sync';
import type { Credentials } from '../core/school-auth';

export type AppState = {
  sync: SyncState; ready: boolean; displayName: string; signedIn: boolean;
  theme: ThemeChoice; setTheme: (value: ThemeChoice) => void;
  mainColor: string; accentColor: string; setColors: (main: string, accent: string) => void;
  courseWeights: Readonly<Record<string, number>>; setCourseWeight: (id: string, weight: number) => void;
  preferenceError: boolean; retryAt: number;
  privacyMode: boolean;
  setPrivacyMode: (enabled: boolean) => void;
  isGradeVisible: (courseId: string) => boolean;
  showGrade: (courseId: string) => void;
  signIn: (credentials: Credentials, name: string, consent: boolean) => Promise<boolean>;
  refresh: () => Promise<void>; cancel: () => void; clear: () => Promise<boolean>;
};

// Keep context identity separate from the provider's changing transport imports.
// Expo Fast Refresh can then update the provider without stranding consumers.
export const AppContext = createContext<AppState | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider required');
  return value;
}
