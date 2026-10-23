# Fixture prototype status

All data is synthetic. There is no login form, credential storage, live adapter or request to TeachAssist/TA-API. Permission and privacy gates remain open.

## Data contract

`src/core/model.ts` defines version 1 of the synthetic snapshot schema. Runtime parsing rejects incomplete records, duplicate identities, invalid marks, unknown categories and invalid category weights. Explicit empty lists and null reported grades are valid. Unknown schema versions fail closed.

Calculated averages use assessment weights within each category, then category percentages. Categories without graded, positive-weight assessments are excluded and remaining category weights are renormalized. Missing, exempt and ungraded marks are excluded, not assigned zero. Calculations are estimates and can differ from a reported average. Extra credit is not supported by this initial schema.

The sync controller validates before saving and publishes success only after storage succeeds. It preserves the previous snapshot on failures, deduplicates concurrent checks, supports cancellation and bounds an adapter attempt to 15 seconds. There are no automatic retries or background requests. Check times use the device clock, not teacher publication times.

## Demo UI and storage

Expo Router provides Dashboard, Analytics and Settings tabs plus course drill-down and missing-route recovery. Screens identify synthetic provenance, saved check time, cache age, reported versus calculated marks and explicit check errors. Pull-to-refresh and the check button share one controller. Settings provides controlled synthetic success/error scenarios and confirmed deletion with explicit deletion failure feedback. The official-site link opens separately; it does not validate fixtures.

System/light/dark theme preferences persist separately from grade data, with visible preference read/write failures. Touch targets are at least 48 units, body text scales with system settings, headings have accessibility roles, controls expose selected/disabled states and sync announcements use a polite live region. TalkBack, contrast and large-font device validation remain unverified.

Native storage uses SDK 58 `expo-file-system` in the app document directory. Web uses localStorage with a synthetic namespace. A bounded two-slot journal writes the older/invalid slot, reads it back, and chooses the newest valid generation on restart. An interrupted write can fall back to the prior valid slot; generations do not depend on the device clock. This provides recoverable snapshot commits, not a filesystem durability guarantee. Only synthetic data is supported; this is not an approved sensitive-data store. There is no schema migration from older versions yet; unsupported records fail closed.

Observed diffs describe the most recent check in memory. Long-term history, persistent last-attempt metadata, background refresh, rate-limit retry scheduling, live transport/authentication and sensitive-record protection remain unfinished.

## Verification and environment limitations (2026-10-23)

- All 25 core, cache, preferences, presentation and integrated fixture-flow tests pass (see `npm test`), including the 15-second deadline and refresh/deletion concurrency regressions. TypeScript passes after regenerating Expo route declarations. The typecheck script regenerates them first so stale declarations from a previously empty app do not produce false route errors.
- Android production JavaScript/Hermes bundle exported successfully to ignored `.expo/verification-android`. This confirms bundling only, not installation or runtime UI behavior.
- `npx expo lint` cannot bootstrap missing ESLint dependencies: sandbox network returns `EACCES`. Lint is not verified.
- Both required ADB checks fail with `Cannot mkdir '\.android': Permission denied`. Emulator launch, UI navigation, screenshots and logcat cannot be verified in this sandbox. No sandbox workaround attempted.
- Git staging and commit fail with `Unable to create '.git/index.lock': Permission denied`. Changes remain uncommitted on the original `codex/night-20261023-010530` branch; no push, merge or deployment attempted.
- Real account, native device and official-site comparisons remain gated on authorization.
