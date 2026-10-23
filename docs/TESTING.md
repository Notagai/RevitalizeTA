# Fixture verification

Use synthetic demo data only. Never enter actual school credentials, capture private grades or include raw account responses in test output.

## Automated checks

Run `npm run typecheck`, `npm test`, and `npm run lint`. Typechecking regenerates Expo Router declarations before checking. Tests use Node 24's TypeScript stripping without transpilation dependencies. One deadline regression intentionally runs for about 15 seconds.

Tests cover normalized schema validation, intentional empty data, missing marks, duplicate identities, category math, stable-identity diffs, every controller error state, single-flight checks, cancellation, bounded timeouts, disk-write/deletion failures, corrupt/interrupted cache recovery, generation ordering, preference persistence and demo check → failure → restart flows. They do not mount React Native views or prove native filesystem behavior.

To verify Android bundle compilation without a native rebuild:

```sh
npx expo export --platform android --output-dir .expo/verification-android
```

## Android manual checklist (not yet executed in the sandbox)

1. Check `adb devices`, then the selected device's Android version. Confirm the installed package is `com.notagai.revitalizeta`.
2. Install initially with `npx expo run:android`; for JS-only changes use `npx expo start` with the installed compatible development build. Avoid redundant native builds.
3. On fresh launch, confirm there are no invented grades until the demo is loaded and no credential prompt is offered.
4. Check demo data; verify two courses, a visible synthetic source and a checked timestamp. Check again and verify “No grade changes found.”
5. Open Advanced Functions; verify reported and calculated averages are distinct, category weights appear, and missing/exempt/ungraded marks have separate labels. Open English; verify no assessments and unavailable marks are explicit.
6. Choose Changed grades in Settings, check again and inspect Analytics. Choose Offline, Session expired and Incomplete response in turn; confirm old data and checked time remain. Last attempt should advance. Check diagnostics for sanitized state codes only.
7. Choose No courses; verify an intentional empty state. Restore Original grades. Start a check and cancel; verify a terminal cancellation message.
8. Kill/relaunch the app without a network connection. Confirm saved demo grades appear with their old check time and no fresh-success claim. Repeat after changing the device clock backwards.
9. Change the theme and restart; verify persistence. Test system theme transitions, TalkBack traversal, maximum font scaling, narrow/wide layouts and touch targets.
10. Delete local demo grade data and confirm it disappears after restart. Cancelling deletion must preserve it. Theme preferences are separate and are retained.
11. Inspect sanitized runtime errors with logcat. Record only error codes and reproduction steps; do not attach credential or actual-grade screenshots/logs.

The current sandbox blocks host ADB before connectivity can be verified. An Android bundle export is not an emulator UI test. See [implementation status](IMPLEMENTATION_STATUS.md) for the recorded blocker.
