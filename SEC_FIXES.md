# Security review and direct on-device login

Reviewed October 23, 2026. Tests use **synthetic login data and HTML only**. Neither YRDSB nor a real account was tested or compromised. This is code hardening, not certification.

## Current architecture

Android/iOS device -> official `https://ta.yrdsb.ca` login and report pages. There is **no RevitalizeTA server route or Redis dependency**. Credentials are placed in an application/x-www-form-urlencoded POST body, never in the URL. The client validates exact HTTPS origin and approved report paths; cookies and parsed grades remain in memory. The old unofficial third-party API is disabled. Browser account login is disabled because no credential relay or CORS workaround will be installed.

The student number must be nine digits. Passwords are not artificially limited to eight characters; valid longer school passwords and punctuation are accepted. Explicit user consent is required before attempting login.

## Safeguards

- URL allowlist for login, report navigation, and any manual redirects; no arbitrary host requests or password 307/308 replay in the JavaScript flow.
- Response URL and redirected flags checked, plus content type and body size limits.
- School HTML parsed as data, never evaluated as JavaScript, then strictly converted into a versioned normalized grade snapshot.
- In-memory session cookie jar and no persisted passwords or raw HTML.
- Client request cooldown and limited attempts. **These controls do not rate-limit the school globally**; official TeachAssist must protect its own service.
- Synthetic-only cache and in-memory school snapshot. Privacy Mode masks grades, summaries, change history, charts and screen-reader labels while retaining screenshot capability.
- Known node-forge postinstall patch and dependency regression test remain. An upstream advisory may still appear in npm audit pending an official patched version.

## Remaining verification

**Do not treat direct login as production verified yet.** A physical device/emulator using an Android release build is required to test the native Fetch implementation. In particular, verify that an HTTPS 307/308 redirect cannot cause the native layer to replay password-containing POST bodies to another host. HTTP 30x, cookies, malformed HTML, TLS failure, aborts, and logout behaviour must also be verified using a controlled mock endpoint and invented credentials. Require an Android Metro bundle check and all automated tests to pass before merging.

Security tradeoff: no developer-operated credential server is a meaningful privacy improvement; there is also no centrally enforced request throttling or cross-device synchronization. Never publicly claim the official school supports or endorses this app.

See `docs/TESTING.md` and `docs/TA_API_INTEGRATION.md`.
