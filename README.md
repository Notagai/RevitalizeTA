# RevitalizeTA

An unofficial Expo SDK 58 / React Native Android grade tracker for YRDSB TeachAssist. Dashboard, analytics, assignment details, grade weights, semester navigation and an optional Privacy Mode are included.

## Direct on-device school login

The **Android and iOS app directly contacts** `https://ta.yrdsb.ca/live/index.php` using the official form. No RevitalizeTA API endpoint, server, Redis, password proxy, or public backend is needed. The deprecated third-party TA API is disabled.

Student identifiers are nine digits; passwords may be longer and include punctuation. Sign-in requires affirmative consent. Passwords, parsed grades and session cookies remain in device memory for the current session, never persisted. Session state expires after 15 minutes without a successful refresh. Privacy Mode is persistent, but only its on/off boolean is saved; reveals are ephemeral. Screenshots remain enabled.

**This is source implementation, not proof of successful real-school authentication.** Only invented credentials and mock HTML have been tested. Native release-device checks are still required for redirect prevention, Android cookie behavior and the school's authenticated HTML structure. Browser login is disabled, since browser cross-origin restrictions prevent safe direct authentication without a backend.

## Setup

Use Node 24 and Android Studio:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx expo export --platform android --output-dir .expo/native-export
npx expo run:android
```

On Windows use `npm.cmd` / `npx.cmd` if PowerShell blocks shims. The postinstall script applies a version-checked node-forge security backport; do not skip install scripts. See `SEC_FIXES.md`.

## Security and privacy

The client communicates only with allowed HTTPS paths under the official TeachAssist host. Requests use form-encoded bodies, bounded responses, request-local cookies, strict parser validations and manual redirect checks. Never forward school passwords or cookies to arbitrary URLs. The unofficial API is disabled.

Native networking differs from Node Fetch. Test the signed release APK against a **controlled, simulated HTTPS server** with synthetic credentials to confirm that Android does not automatically forward the request body when receiving 307/308 redirects. Never use real school accounts in these tests.

Grade data remains in memory and is discarded on sign-out. Privacy Mode hides grades and grade-related details until each course or the overall average is explicitly revealed. This is screen privacy, not device encryption or a substitute for locking the phone.

Docs: [Features](FEATURES.md) · [Security](SEC_FIXES.md) · [Testing](docs/TESTING.md) · [Integration](docs/TA_API_INTEGRATION.md).

This is unofficial software, not affiliated with YRDSB or TeachAssist.
