# Verification

All credentials, grades, HTML and accounts used in automated tests are invented. The public school login form was read without authenticating. No real account was accessed.

## Commands

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx expo export --platform android --platform web --output-dir .expo/security-verification
```

Use npm.cmd/npx.cmd on Windows if PowerShell blocks script shims. Node 24 runs TypeScript tests without a test transpiler. One deadline test takes about 15 seconds. After dependency upgrades, start Metro with --clear if its module cache is stale.

npm ci runs the version/source-checked node-forge backport. If install scripts were explicitly skipped, run node scripts/patch-security-dependencies.cjs before testing or building.

## Automated coverage

The current suite contains 61 tests, covering schema/cache recovery, category/credit estimates, grade deltas, assignment grouping/sorting, appearance migration, cancellation/deletion races, official form encoding, request-cookie isolation, unsafe URLs/redirects, body/response bounds, CSRF/origin/TLS checks, production shared-limit configuration and failure, and both dependency regressions.

The direct login integration test exercises the actual client adapter, server handler, school fetch sequence and parser with mocked school HTML. It checks that punctuation survives form encoding and credentials never appear in an upstream URL. A disabled legacy transport cannot be enabled by its old approval override. The Zod regression verifies early collection bounds; the forge regression signs a malformed nested DigestAlgorithm and confirms rejection while valid RSA signatures verify.

## Browser verification (2026-10-23)

Headless Chrome, isolated profile, 390 × 844:

- The password field is masked and account authorization starts unchecked.
- The Sign in control requires valid input and authorization.
- A synthetic POST intercepted at the app API returns a version-3 teachassist snapshot, signs in and displays the invented course/grade and display name.
- Sign-out clears account metadata and course links.
- A mocked 401 shows the authentication message and leaves the password empty.
- Canceling an intercepted pending request does not sign in and leaves the password empty.
- No request reaches the school or unofficial API; all browser credential requests are intercepted.
- No uncaught browser errors in the completed run.

Local screenshots: .expo/review-shots/security/. Ignored harness: .expo/security-login-review.mjs. It requires a local dev server on localhost:8083 and an isolated Chrome DevTools endpoint on 127.0.0.1:9333, with no added browser dependency.

The actual local API route was also checked with GET and a missing-consent POST: 405 and 400 respectively, both with no-store/private headers. Neither check can reach school authentication.

Earlier feature verification also covered 390/320-pixel layouts, semester filtering, grade changes, assignment sorting/filtering, targeted weight-page scrolling, top navigation from Dashboard, weight overrides and lowest-grade Analytics.

## Audit and production boundary

npm audit after the fixes reports four high alerts, all propagated from node-forge's unreleased upstream advisory. The specific defect is locally backported and regression tested; the audit is not falsely described as clean. See SEC_FIXES.md.

Client exports must exclude the school parser and Redis server credential names. The API server exports separately. Production login requires a configured shared rate limiter and a trusted HTTPS app origin; missing configuration returns 503 and never contacts the school.

No native-device UI test, real school-account login, authenticated-layout comparison, Redis provisioning or deployment was performed. These require authorized validation and hosting configuration, not a fabricated success claim.
