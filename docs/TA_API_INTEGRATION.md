# Direct TeachAssist integration

The Android and iOS app now connects **directly** to `https://ta.yrdsb.ca/live/index.php` and the allowlisted official report paths. There is no intermediary service hosted by RevitalizeTA. The official login form uses POST with fields `username`, `password`, `subject_id`, and `submit`.

Implementation files:
- `src/core/school-auth.ts`: consent, nine-digit student number validation, client throttling, cancellation and timeout.
- `src/core/direct-school.ts`: direct HTTPS request sequence, memory-only cookies, exact URL validation, redirect refusal and bounded HTML downloads.
- `src/core/school-parser.ts`: parse and validate HTML, normalize into a grade snapshot.
- `src/state/AppProvider.tsx`: 15-minute memory session, refresh, sign-out and Privacy Mode.

The unofficial third-party TA API is deliberately disabled because its historical credential transport encoded sensitive data in URLs. No server route, Expo hosting, Redis or app-origin configuration is needed.

**Known limits:** Direct browser sign-in is disabled due to CORS. Native Fetch's actual redirect and cookie behavior needs verification on an Android release build. The current parsing expectations derive from public HTML structure and mocked fixtures, not verified authenticated school HTML. No real TeachAssist account was accessed during development.

Do not insert student credentials into analytics, URLs, logs, crash reports, error strings or persistent preferences.
