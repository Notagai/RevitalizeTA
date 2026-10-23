# School login and legacy TA API

The current school-login architecture and security findings are recorded in [SEC_FIXES.md](../SEC_FIXES.md).

The latest user request authorizes implementing login using a school account. It supersedes the earlier request to keep account login disabled. No actual credentials or authenticated school requests were used during implementation or testing.

## Current transport

- The app calls its own Expo route: POST /api/school/grades.
- The route posts properly encoded credentials in the body to the official HTTPS TeachAssist login form, then parses allowlisted course reports with an isolated cookie jar.
- The official form at https://ta.yrdsb.ca/live/ was inspected without logging in. Form fields are username, password, subject_id and submit, with POST to index.php.
- School login is enabled in the UI. The user must acknowledge authorization for their own account before any submission.
- Production requires a deployed app server, its public HTTPS origin for native builds, and server-only shared Redis rate-limit configuration. Missing rate-limit configuration fails closed.
- Credentials and grades remain in memory; no raw responses, cookies, credentials or student IDs are logged or persisted.
- A real-account comparison, authenticated layout verification, native-device validation, and hosting review remain outstanding.

## Unofficial API remains disabled

The public source at https://github.com/ryan-zhu-music/ta-api/blob/main/pages/api/getCourses.ts interpolates credentials into a URL, lacks established global rate limits and can expose raw exceptions. It also loses a zero overall grade through a falsy fallback.

The app no longer contacts that service. The legacy adapter permanently refuses network access, including an attempted approval override. Its JSON normalizer remains for existing fixtures and intermediate normalization; it is not a live credential transport.

Third-party deployment equivalence, logging, storage, maintenance and privacy claims were never independently established. These external risks were removed from the app's credential path rather than marked as repaired on the third-party server.

## Contract and review limits

Synthetic fixtures retain version 1; legacy API-shaped fixtures use version 2; the direct official-school transport uses version 3 with source teachassist. Invalid/partial responses cannot replace verified snapshots, and the unencrypted fixture cache rejects both live sources.

Teacher names, dates and credits remain optional because their availability in authenticated school layouts has not been verified. Semester inference from start dates and duplicate assignment identity need authorized real-world review. Unknown layouts fail closed. Do not bypass MFA, CAPTCHA, account restrictions, or Board acceptable-use rules.
