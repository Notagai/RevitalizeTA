# Security follow-up (October 23, 2026)

This is a source-code hardening change, not a third-party penetration test or evidence that YRDSB/TeachAssist was compromised.

## Request admission

- Student user names now follow YRDSB's published nine-digit pattern. Passwords are not forced to exactly eight characters: the board's password policy allows longer, more complex values.
- The app parses and validates bounded request bodies **before** claiming one of its three outbound school-login slots.
- Invalid JSON or malformed student numbers no longer consume that outbound request budget.
- After validation, per-account in-process and distributed Redis controls still apply. A limited global outbound rate cap remains to protect the school service from many fabricated but syntactically valid student numbers.
- This does not eliminate all denial-of-service risk. The app server's ingress requests, upload/headers and connection timeouts must be enforced by the hosting provider, and upstream requests need a deployment-level circuit breaker.
- Production traffic is impossible without the properly configured Redis limiter, and its global budget is stricter than the in-process fallback.

## Privacy Mode

Settings includes Privacy Mode. When enabled, overall/weighted grades and individual course grades are hidden until explicitly revealed. Course assessment details, charts, changes, ranked courses, bars and accessible labels are also concealed where appropriate. Screenshot capability is intentionally retained.

The boolean preference is saved locally without persisting grades or school credentials. Reveal state resets when signing out, switching accounts, or switching the mode. On invalid saved privacy settings, the app defaults to hidden.

## Dependency verification

CVE-2026-85393 / GHSA-86w9-cpqp-85rv affects node-forge <= 1.4.0. At time of review no official patched npm version is published. Continue the existing fail-on-unknown-layout postinstall backport and its RSA regression test. CI checks for **new** advisories, but does not relabel the known advisory as resolved. Do not use npm audit fix --force to downgrade Expo.

## Native network acceptance test

These requirements still need a real Android build and a controlled test server; synthetic mocks are not native transport proof.

1. Use a test HTTPS app origin you control, not a school endpoint, and credentials invented solely for testing.
2. Configure the test endpoint to respond with HTTP 307 or 308 directing traffic to a second controlled HTTPS endpoint. The second endpoint must receive **no** POST body or credentials.
3. Repeat with HTTP 301, 302 and 303, malformed JSON, interrupted response streams and certificate failures. None may mark the app signed in.
4. Verify an ordinary 200 JSON response can sign in to a synthetic snapshot.
5. Verify remote plaintext HTTP is rejected before any credentials are serialized.
6. Test Android release APK, not just Expo web/dev mode. Record device, OS, build SHA, results and network captures with synthetic data only.

## Protect the release branch

1. Open repository Settings > Rules > Rulesets > New branch ruleset.
2. Target the default branch `main`; enable ruleset enforcement.
3. Require pull requests, no force-push, no deletion; block direct changes to `main`.
4. Require successful status check `verify` from the Security and app checks workflow after the first run.
5. Restrict who can bypass, and consider a review requirement before public releases.
6. Enable secret scanning, Dependabot security updates and private vulnerability reporting where available.
7. Keep workflow tokens read-only by default. Do not expose server secrets to forked PRs.
8. Keep test and release workflows separate: a passing CI run should not automatically publish an APK without an explicit release gate.

Remember to configure edge rate limits, request-body limits, proxy trust, and TLS on whichever HTTPS host is deployed. None of those protections are installed merely by committing application code.
