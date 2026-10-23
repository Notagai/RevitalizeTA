# RevitalizeTA

An unofficial Expo SDK 58 / React Native TeachAssist grade tracker with Dashboard, Analytics, course assessments, course weight breakdowns, and customizable light/dark themes.

School-account sign-in is implemented through the app's own Expo server route and the official YRDSB TeachAssist login form. Credentials are encoded in a POST body and never sent to the unofficial TA API. Testing used only invented accounts/HTML; a real-account login has not been verified.

See [SEC_FIXES.md](SEC_FIXES.md) for the security audit, fixed issues, the remaining upstream audit warning, configuration, and validation limits.

Install dependencies with `npm ci` (Node 24 recommended), then:

```sh
npm start
npm run typecheck
npm test
npm run lint
```

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks script shims. The postinstall script applies a version-checked node-forge security backport; do not skip it. Zod is overridden to 4.6.7.

Development login accepts HTTP only on loopback. Native devices and production need a trusted HTTPS app server. Export/deploy the server and configure EXPO_PUBLIC_APP_ORIGIN for native builds. Production also requires AUTH_REDIS_REST_URL, AUTH_REDIS_REST_TOKEN and AUTH_RATE_LIMIT_SECRET for shared throttling; login fails closed without them. .env.example documents these names without containing secrets. No backend or Redis resource has been deployed/provisioned by this work.

The dashboard shows an overall reported average, the change from the previous successful refresh and a weighted estimate. Semester controls filter the course list. The estimate uses assessment/category weights, then credits or editable course weights across courses. Missing, exempt, pending and zero-weight marks are excluded from estimates.

Course pages show teacher/room metadata when available and virtualize assignment cards. Assignments with multiple category marks remain one card. Sort by date, grade, name or weight; unavailable marks/dates sort last. Weight-page links open at the selected course or at the top from Dashboard.

Credentials, grades, display name, course weights and comparison data remain in memory. Sessions expire after 15 minutes without a successful refresh; signing out clears them. Appearance preferences persist separately. Clearing grade data also removes legacy synthetic caches.

See [FEATURES.md](FEATURES.md), [implementation status](docs/IMPLEMENTATION_STATUS.md), [testing](docs/TESTING.md), and [login architecture](docs/TA_API_INTEGRATION.md).
