# Security review and school login

Reviewed 2026-10-23. Scope: application code, locked npm dependencies, credential/session handling, the public school login form, and the published unofficial API source. Testing uses invented credentials and HTML only. No real account was accessed, no secrets were read, and no service was deployed.

This is a scoped engineering review, not a guarantee that every vulnerability has been found. Findings below distinguish implemented fixes from deployment requirements and external risks.

## Findings and fixes

| Finding | Severity | Resolution |
| --- | --- | --- |
| Unofficial API interpolates school credentials into a URL, exposing them to URL processing/logging | High | Fixed in this app: permanently disable that transport, including its former approval override. New login uses the app server and an encoded form POST to the official endpoint. |
| Client-side throttling can be bypassed by calling the server or restarting a client | High | Add server account/global/concurrency limits. Production additionally requires an atomic shared Redis limiter and fails closed if missing/unavailable. |
| Untrusted report links or redirects could forward session cookies or replay passwords | High | Exact HTTPS school-host/path/query allowlists; reject arbitrary hosts, userinfo, fragments, duplicate IDs, unsafe actions, and 307/308 password replay. Cookies are isolated to one request flow. |
| The previous response-size fallback buffered the entire response before checking size | High | Stream byte limits for requests, HTML, JSON and rate-limit responses. No unbounded text fallback. Cancellation races also terminate readers/transports that ignore abort. |
| Cancellation could arrive while saving a snapshot and still publish success | Medium | Recheck cancellation before validation and after commit; sign-in generations prevent canceled/older attempts from assigning new credentials. |
| Account switching/auth expiry could retain another session's metadata or credentials | High | Clear old account state on switching, clear credentials/grades on authentication rejection, expire credentials and grades after 15 minutes without a successful refresh, and check expiry on foregrounding. |
| Password text could remain mounted after leaving the login screen | Medium | Clear the password immediately on submission and on blur; cancel pending sign-in when leaving. Enforce explicit account-access acknowledgement at UI, adapter and server boundaries. |
| Cross-origin/browser request abuse and cache disclosure on the new login route | Medium | POST JSON only, exact same-origin checks, custom request header, byte limits and sanitized errors. Grade responses use no-store/private, nosniff, no-referrer, and deny framing. |
| Rejecting insecure transport only after credentials reach the server is too late | High | The client validates the app origin before building/sending the credential request. Require HTTPS except development loopback; reject missing origins, userinfo, paths and insecure remote hosts. API responses also set HSTS. |
| Local environment secrets could accidentally enter version control | Medium | Ignore .env and .env.*; allow only the non-secret .env.example. Never put Redis credentials in EXPO_PUBLIC_* configuration. |
| Zod resource exhaustion, GHSA-mrhx-c7xc-m3w5 | High | Override to 4.6.7, which includes the upstream fix. Regression verifies oversized constrained arrays reject before visiting elements; Expo schema compatibility and normal SDK checks are exercised. |
| node-forge nested DigestAlgorithm signature verification, GHSA-86w9-cpqp-85rv | High | Apply a narrowly scoped, version/source-checked backport of upstream PR #1152 after install. Regression verifies malformed nested ASN.1 signatures are rejected while valid signatures still verify. See dependency caveat below. |

School HTML is parsed on the server with Cheerio's non-executing slim parser. Scripts, styles, frames and embeds are removed; HTML is never sent to a WebView or rendered with innerHTML. The client accepts only validated version-3 `teachassist` snapshots. Raw school HTML, passwords, cookies and exceptions are never logged or returned. No credential, grade or cookie is persisted to disk; the legacy synthetic cache rejects live snapshots.

## Actual login flow

1. The user enters their own YRDSB TeachAssist username/password and explicitly authorizes access.
2. The client sends JSON to the same app server at `POST /api/school/grades`, with manual refresh and a shared client cooldown.
3. The server validates origin, transport, body, consent and rate limits before accessing the school.
4. An isolated cookie jar seeds a school session, then posts URLSearchParams containing username/password/subject_id/submit to `https://ta.yrdsb.ca/live/index.php`. Credentials never appear in the request URL. Password punctuation is preserved.
5. Only allowlisted course report URLs on that same official host are fetched, within a 12-second total deadline and per-document/aggregate size limits.
6. The server normalizes and validates all courses before returning a no-store JSON snapshot. A malformed or partial response cannot replace verified grades.
7. Sign-out, session expiry or rejected authentication clears sensitive client state. Refresh requires credentials still held in the current session.

The latest user request authorizes implementing school login and supersedes the earlier request to keep all account login disabled. The unofficial third-party API remains disabled: approval of school login does not repair its external security defects.

## Configuration and deployment requirements

Development: run Expo's server locally. Credential-bearing HTTP requests are accepted only on loopback hosts in development; LAN/plaintext login is rejected. For a native device, use a trusted HTTPS app server, not unencrypted LAN traffic.

Production requires an exported/deployed Expo server, not a static-only site:

- `EXPO_PUBLIC_APP_ORIGIN`: the bare HTTPS origin of **your app server**, configured through app.config.js for native relative requests. This public value is not a secret.
- `AUTH_REDIS_REST_URL`: a trusted HTTPS Upstash Redis REST origin supporting EVAL.
- `AUTH_REDIS_REST_TOKEN`: server-only token authorized for the rate-limit script.
- `AUTH_RATE_LIMIT_SECRET`: server-only stable random string of at least 32 characters, shared by instances.

Use .env.example as documentation, not live configuration. No Redis database was provisioned or configured by this review. Production login returns 503 until shared throttling is configured, and fails closed during limiter outages. Deployment must also avoid request-body capture, disable sensitive response logging/telemetry, enforce TLS and access controls, set request/body/concurrency limits, and protect the public service from distributed abuse. The app does not claim to configure hosting infrastructure that has not been deployed.

The atomic Redis script uses Redis time, a rolling five-attempt/five-minute account window, a 30-second account cooldown, and a shared 20-attempt/minute service budget. It receives only keyed account hashes and short-lived counters, never passwords, grades or raw student IDs. Development has bounded in-memory limits; it is not a multi-instance production limiter.

## Dependency caveat

Initial npm audit: five high alerts, propagated from two underlying advisories. After the Zod update, npm still reports four high alerts for node-forge and its Expo dependents because the official npm release remains 1.4.0 and the advisory has no published patched version. The local backport does not falsify package versions or suppress the audit result. It mitigates the specific nested-DigestAlgorithm flaw; it is not an independent cryptographic audit.

`npm ci` runs scripts/patch-security-dependencies.cjs. It accepts only the reviewed node-forge version and source pattern, is idempotent, and fails on unknown layouts. Installing with --ignore-scripts requires running that script explicitly before development, builds or tests. Replace the backport with a verified upstream release when available. Do not use npm audit fix --force: its proposed Expo 44 downgrade would break this SDK 58 app.

## Verification and remaining risks

- Security tests cover the direct client/server/parser flow using mocked school HTML, password encoding, isolated cookies, unsafe URLs/redirects, CSRF/transport/body checks, cancellation, cache protection, shared rate-limit admission/failure and both dependency regressions.
- Verified: all 61 tests, Expo lint, TypeScript, web/server and Android bundle exports, and a browser login-flow test with mocked responses. Browser checks cover consent, masking, success, sign-out, rejection, password clearing and cancellation without any school requests. Results are recorded in docs/TESTING.md.
- No genuine school account login or authenticated school HTML was used. The public login form is verified, but authenticated layouts, zero-course variants, final-mark tables, summer/full-year semesters and native device behavior still need authorized validation. Unknown layouts fail closed instead of fabricating an empty success.
- No permission to access someone else's account is implied. The app requires the user's acknowledgement of Board acceptable-use obligations and does not bypass MFA, CAPTCHA, account restrictions or school authentication.
- Vulnerabilities in the school service, unknown vulnerabilities, compromised devices, hosting misconfiguration, distributed traffic beyond configured service limits, and JavaScript heap inspection cannot be eliminated by this code review. JavaScript strings cannot be reliably zeroized.

## Primary references

- [Official public login form](https://ta.yrdsb.ca/live/) — inspected without credentials; form action index.php, method POST, fields username/password/subject_id/submit.
- [Unofficial getCourses source](https://github.com/ryan-zhu-music/ta-api/blob/main/pages/api/getCourses.ts) — source of the insecure URL credential flow and legacy layout information; not used as a live transport.
- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [API routes and native origin configuration](https://docs.expo.dev/router/web/api-routes/), [streaming fetch](https://docs.expo.dev/versions/v58.0.0/sdk/expo/).
- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) and [upstream fix](https://github.com/colinhacks/zod/commit/a0ebf97).
- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and [reviewed upstream backport proposal](https://github.com/digitalbazaar/forge/pull/1152/files).
- [Upstash REST commands](https://upstash.com/docs/redis/features/restapi) and [atomic EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval).
