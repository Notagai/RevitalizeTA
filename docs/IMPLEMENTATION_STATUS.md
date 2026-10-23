# Implementation status

The UI work in FEATURES.md remains implemented. School login is now enabled through the app server and the official TeachAssist form. The insecure unofficial TA API stays permanently disabled. See [SEC_FIXES.md](../SEC_FIXES.md) for the security review, configuration and remaining limits.

## Screens and calculations

Dashboard has the supplied logo/welcome, grade ring, overall/course changes, weighted estimates, semester course toggle, and shared course-weight page. Course pages contain reported/estimated grades, teacher/room metadata when available, weight links, and virtualized assignment cards with status/date/grade/name/weight controls. Analytics includes the lowest grade. The demo controls, universal refresh banner and glass UI are removed.

The overall average uses available reported grades. The weighted estimate combines category-weighted estimates with course credits or explicit weights. Unknown grades and zero-weight entries are excluded. Comparison history is the previous successful refresh in the session.

## School login and security

The latest user request authorizes implementing school login, superseding the earlier disabled-login decision. The app posts credentials to /api/school/grades on its own server; that server uses an encoded form POST to the official school, isolated cookies, allowlisted course links, streaming size limits and total deadlines. It never uses the unofficial API as a live transport.

HTTPS is checked by the client before transmitting credentials and by the server. HTTP is limited to development loopback. Explicit authorization is required. The server enforces same-origin JSON/custom-header requests, per-account and global limits, and requires atomic shared Redis limits in production. Production without that configuration fails closed. Sensitive responses are no-store, private and sanitized.

Version 1 remains synthetic; version 2 is the legacy normalized contract; direct-school snapshots are version 3 with source teachassist. The synthetic cache rejects all live sources. Credentials, grades, names, weights and history stay in memory, expire after 15 minutes without a successful refresh, and clear on sign-out/auth rejection. Appearance settings persist separately.

Zod is overridden to 4.6.7. A version/source-checked node-forge backport runs after install and has a cryptographic regression test. Four npm alerts remain because the upstream node-forge release is still affected; they are documented, not suppressed.

## Verification and deployment limits

Unit/integration tests, lint/typechecking, web/server and Android bundle exports, and browser login tests use only synthetic data. See TESTING.md for recorded results and local screenshots.

No school-account login, authenticated-school HTML capture, native-device interaction, hosting deployment, Redis provisioning, secret access, push or merge was performed. Authenticated layouts and school acceptable-use obligations require authorized verification. Production needs a deployed HTTPS app server, its public origin for native builds and server-only shared limiter configuration.
