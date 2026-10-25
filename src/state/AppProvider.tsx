import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { fetchSchoolGrades } from '../core/direct-school';
import { FixtureCache } from '../core/cache';
import { initialState, SyncController, type SyncState } from '../core/sync';
import { SessionStore } from '../core/session-store';
import { RequestLimiter } from '../core/ta-api';
import { createSchoolAdapter, validSchoolCredentials, type Credentials } from '../core/school-auth';
import { SCHOOL_LOGIN_ENABLED } from '../core/integration';
import { slots } from '../storage/slots';
import { defaultAppearance, Preferences, type Appearance } from '../core/preferences';
import { normalizeHex } from '../core/palette';
import { AppContext } from './context';
import { validLevelOverride } from '../core/levels';
import type { LevelOverrides } from '../core/model';

export type { ThemeChoice } from '../core/preferences';
export { useApp } from './context';
const nativeSchoolFetcher = (credentials: Credentials, signal: AbortSignal) => fetchSchoolGrades(credentials, signal, expoFetch);

export function AppProvider({ children }: PropsWithChildren) {
  const [sync, setSync] = useState<SyncState>(initialState);
  const [ready, setReady] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [preferenceError, setPreferenceError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [courseWeights, setCourseWeights] = useState<Record<string, number>>({});
  const [levelOverrides, setLevelOverrides] = useState<Record<string, LevelOverrides>>({});
  const [retryAt, setRetryAt] = useState(0);
  const [privacyMode, setPrivacy] = useState(false);
  const [revealedGrades, setRevealedGrades] = useState<Record<string, true>>({});
  const setPrivacyMode = (enabled: boolean) => {
    setPrivacy(enabled);
    setRevealedGrades({});
    void preferences.savePrivacyMode(enabled).then(() => setPreferenceError(false)).catch(() => setPreferenceError(true));
  };
  const isGradeVisible = (courseId: string) => !privacyMode || revealedGrades[courseId] === true;
  const showGrade = (courseId: string) => {
    if (signedIn && (courseId === 'overall' || sync.snapshot?.courses.some(course => course.id === courseId))) {
      setRevealedGrades(current => ({ ...current, [courseId]: true }));
    }
  };
  const session = useRef({ credentials: null as Credentials | null, username: '', generation: 0, expiresAt: 0 });
  const signingIn = useRef(false);
  const [preferences] = useState(() => new Preferences(slots));
  const [limiter] = useState(() => new RequestLimiter());
  const [controller] = useState(() => new SyncController(new SessionStore(), setSync, undefined, 60000));
  const cancel = useCallback(() => { session.current.generation++; controller.cancel(); }, [controller]);
  const clear = useCallback(async (status: 'never' | 'auth' = 'never') => {
    session.current.generation++; session.current.credentials = null; session.current.username = ''; session.current.expiresAt = 0;
    setSignedIn(false); setDisplayName(''); setCourseWeights({}); setLevelOverrides({}); setRevealedGrades({});
    const results = await Promise.allSettled([controller.clear(status), new FixtureCache(slots).clear()]);
    return results.every(result => result.status === 'fulfilled' && result.value !== false);
  }, [controller]);
  useEffect(() => {
    const expire = () => { if (session.current.expiresAt && Date.now() >= session.current.expiresAt) void clear(); };
    const timer = setInterval(expire, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') expire(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [clear]);
  useEffect(() => {
    let mounted = true;
    const activeSession = session.current;
    void Promise.all([preferences.loadAppearance(), preferences.loadPrivacyMode()])
      .then(([value, privacy]) => { if (mounted) { setAppearance(value); setPrivacy(privacy); } })
      .catch(() => { if (mounted) { setPrivacy(true); setPreferenceError(true); } })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; activeSession.credentials = null; activeSession.generation++; controller.cancel(); };
  }, [controller, preferences]);
  function saveAppearance(value: Appearance) {
    setAppearance(value);
    void preferences.saveAppearance(value).then(() => setPreferenceError(false)).catch(() => setPreferenceError(true));
  }
  async function refresh() {
    if (!ready || !SCHOOL_LOGIN_ENABLED || Platform.OS === 'web' || !session.current.credentials || signingIn.current) return;
    if (Date.now() >= session.current.expiresAt) { await clear(); return; }
    const generation = session.current.generation;
    await controller.refresh(createSchoolAdapter(session.current.credentials, limiter, { ...{ consent: true }, fetchGrades: nativeSchoolFetcher }));
    if (generation !== session.current.generation) return;
    setRetryAt(limiter.retryAt);
    if (controller.state.status === 'auth') await clear('auth');
    else if (['changed', 'unchanged'].includes(controller.state.status)) session.current.expiresAt = Date.now() + 15 * 60000;
  }
  async function signIn(value: Credentials, name: string, consent: boolean) {
    if (!ready || !SCHOOL_LOGIN_ENABLED || Platform.OS === 'web' || !consent || !validSchoolCredentials(value) || signingIn.current || controller.state.status === 'checking' || controller.state.status === 'deleting') return false;
    signingIn.current = true;
    const generation = ++session.current.generation;
    try {
      // A different account must never inherit the preceding account's grades or baseline.
      if (session.current.username !== value.username) {
        session.current.credentials = null; session.current.username = ''; session.current.expiresAt = 0;
        setSignedIn(false); setDisplayName(''); setCourseWeights({}); setLevelOverrides({}); setRevealedGrades({});
        if (!await controller.clear()) return false;
      }
      if (generation !== session.current.generation) return false;
      await controller.refresh(createSchoolAdapter(value, limiter, { ...{ consent }, fetchGrades: nativeSchoolFetcher }));
      setRetryAt(limiter.retryAt);
      if (generation !== session.current.generation) { await controller.clear(); return false; }
      if (!['changed', 'unchanged'].includes(controller.state.status)) {
        if (controller.state.status === 'auth') await clear('auth');
        return false;
      }
      session.current.credentials = { ...value };
      session.current.username = value.username; session.current.expiresAt = Date.now() + 15 * 60000;
      setSignedIn(true); setDisplayName(name.trim().slice(0, 80)); setCourseWeights({}); setRevealedGrades({});
      return true;
    } finally { signingIn.current = false; }
  }
  return <AppContext.Provider value={{ sync, ready, displayName, signedIn, retryAt, ...appearance,
    privacyMode, setPrivacyMode, isGradeVisible, showGrade,
    levelOverrides, setLevelAssignmentGrade: (courseId, assessmentId, grade) => {
      if (!signedIn) return;
      const course = controller.state.snapshot?.courses.find(item => item.id === courseId);
      const assessment = course?.assessments.find(item => item.id === assessmentId && item.level && item.status === 'graded');
      if (!assessment?.level || (grade !== null && !validLevelOverride(assessment.level, grade))) return;
      setLevelOverrides(current => {
        const next = { ...(current[courseId] ?? {}) };
        if (grade === null) delete next[assessmentId]; else next[assessmentId] = grade;
        if (Object.keys(next).length) return { ...current, [courseId]: next };
        const copy = { ...current }; delete copy[courseId]; return copy;
      });
    },
    courseWeights, setCourseWeight: (id, weight) => {
      if (Number.isFinite(weight) && weight >= 0 && weight <= 10 && controller.state.snapshot?.courses.some(c => c.id === id)) {
        setCourseWeights(current => ({ ...current, [id]: weight }));
      }
    },
    setTheme: value => saveAppearance({ ...appearance, theme: value }),
    setColors: (main, accent) => {
      const mainColor = normalizeHex(main), accentColor = normalizeHex(accent);
      if (mainColor && accentColor) saveAppearance({ ...appearance, mainColor, accentColor });
    }, preferenceError, signIn, refresh, cancel, clear,
  }}>{children}</AppContext.Provider>;
}
