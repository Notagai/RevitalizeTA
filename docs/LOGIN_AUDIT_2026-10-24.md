# TeachAssist login audit: 2026-10-24

## Scope and verification

The `mainappwork` branch has received an end-to-end static audit of native login, sessions, redirects, HTML parsing, error propagation, and relevant tests. Typechecking, Node synthetic tests, and Expo Android bundling **do not prove** successful login on the official portal. A real authorized Android test remains an explicit release blocker.

## Fixed issues

- Expo SDK 58 raw redirect responses were mistaken for already-followed responses; redirect allowlists and unsafe-redirect rejection remain in place.
- School-issued student IDs were not consistently propagated as cookies when an authenticated redirect or verified student-report link supplied them.
- Course detection made assumptions about table width, column count, date layout, and optional classroom fields.
- Grade report parsing assumed only synthetic flat weighting tables; additional semantic weighting and nested assessment structures are now covered.
- Unweighted assessments were rejected even when the school explicitly reported "no weight".
- Some out-of-range course marks could pass the HTML parser and fail much later.
- Authentication errors lost their diagnostic stage when the app cleared the session.
- A returned login page, explicit authentication rejection, unsupported Student Reports layout, and unrelated portal HTML are now differentiated without printing their contents.
- A requested simple sign-in design was implemented with native styling and accessible controls.
- Synthetic regression tests added for redirects, cookies, grade structures, malformed links, state cleanup, and login form failures.

## Fundamental unresolved blocker

Some publicly available TeachAssist clients authenticate using password-bearing GET URLs, while RevitalizeTA deliberately submits school credentials via HTTPS POST. We have not verified the official site's current authenticated POST behaviour and will not silently place passwords in URLs. If the server does not accept POST, a separate verified sign-in design will be necessary.

## Safe device validation

1. Update `mainappwork` and restart Metro with `npx expo start --clear`.
2. Attempt one authorized login on an Android emulator or phone.
3. Observe the sign-in error *stage* and *detail* only. Never publish your login credentials, response HTML, student identifier, cookies, or grades.
4. Validate complete sign-in, course list, assessments, manual refresh, cancellation, and sign-out before merging into `main`.

## Verification status

- Native network code: statically reviewed; real Android session still unverified
- Course/assessment parsers: tested with synthetic fixtures, not real private grades
- Safety checks: automated regression tests
- Production readiness: **not verified**

## Authenticated report HTML evidence (2026-10-24)

An authorized emulator test on the isolated `debug/teachassist-table-capture` branch produced a **sanitized course-report capture**, not a timetable capture. It contained five root tables:

- 60%-width general summary
- 100%-width assessment matrix: colored K/T/C/A/F cells, rowspans for assignment names
- 90%-width category summary: a title row, headers below the title, and category row colors on `tr`, with blank category weighting cells
- 50%-width footer
- empty `cellpadding="5"` table

**Root cause:** The school report parser recognized category weightings only in a color-coded `cellpadding="5"` table or a header starting with an expected phrase. Neither matches the captured 90%-wide weighting table. The older normalizer then rejected an explicit unknown-weight sentinel under the `ta-api` validation rules even after the parser was fixed.

The production branch now detects the colored `tr` rows and the 90%-width three-column structure, treats wholly missing category weights as unavailable, validates the normalized result under version 3 TeachAssist rules, and displays `Weight not published` instead of a false 0% claim. Reconstructed synthetic five-table fixture and end-to-end HTML -> normalized grades regression tests cover this shape. The debug recorder stays off `mainappwork`.

**Remaining verification:** Re-run on a real Android emulator to establish whether the original report grade text follows the points/weight convention that was represented synthetically by the safe capture. No original student HTML or grade values were stored in the repository.
