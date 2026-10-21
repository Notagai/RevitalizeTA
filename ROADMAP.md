# RevitalizeTA Roadmap

> **TeachAssist, without the uncertainty.** A fast, trustworthy, minimal, free and open-source Android grade tracker for YRDSB TeachAssist.
>
> **Status:** Planning | **Platform:** Android-first | **Distribution goal:** GitHub APK releases, then Google Play | **Last updated:** 2026-10-21

## Why this exists

Existing unofficial TeachAssist apps can feel unpredictable: sometimes grades update and sometimes they apparently do not. A student should never have to guess whether a refresh worked or whether the grades on screen are old. Features such as appointment booking, teacher lookup and chat add complexity without fixing that fundamental trust issue.

RevitalizeTA will compete on **correctness, understandable sync status, speed, uncluttered design and privacy**, not feature count. We should not make unsupported claims about competing apps' implementations.

## Non-negotiable product principles

1. **Never silently fail.** A spinner disappearing is not proof of synchronization. Surface verified success, no changes, failure, offline and login-expired states separately.
2. **Never pass cached data off as live data.** Display last verified check time, cache age and source on relevant views.
3. **Do one job well.** Courses, marks, assessment details, useful calculations and changes first. No appointment booking, teacher directory, social feed or student chat in the initial product.
4. **Privacy by default.** No developer-operated password/grade collection server, ads, trackers, or unnecessary permissions. Keep academic data on device.
5. **Source transparency.** Provide a one-tap link to official TeachAssist for verification. A successful fetch confirms what the site returned, **not** that a teacher has published all marks.
6. **Do not fabricate grades.** Clearly separate official returned values, app-calculated values and hypothetical inputs; document calculation assumptions.
7. **Open and maintainable.** Document compatibility, failures, testing, builds, supported Android versions and known limitations.

## Success criteria

- **100%** of attempted manual syncs terminate in an explicit success/no-change/error/authentication state, never an ambiguous green check.
- **0** cached snapshots labeled as verified live without a completed successful data validation.
- **0** passwords, session tokens, student identifiers or assessment contents in logs, crash reports, analytics or GitHub artifacts.
- Show a locally cached dashboard immediately on repeat launch, with a visible timestamp, even when offline.
- If any required course or assessment parsing is unexpectedly incomplete, flag partial sync; do not overwrite a known-good snapshot with silently missing data.
- Calculated and displayed grades match a documented fixture set, including KTCA weights and edge cases.
- Manual cross-checks against the official site pass before public beta. Keep measured startup, sync and crash metrics during testing without collecting personal data.

## Scope and information architecture

**Primary navigation:** **Dashboard** | **Analytics** | **Settings**.

- **Dashboard:** Course cards with reported average, optional calculated average, last verified timestamp, grade-change summary and course drill-down. Refresh action and global sync state always accessible.
- **Course details:** Assessments, categories (including KTCA where available), returned marks, weightings, missing/exempt/unevaluated flags and source/precision distinctions.
- **Analytics:** Historical snapshots, change diffs and what-if calculator. Delay until reliable core data exists.
- **Settings:** Theme, refresh preferences, security/privacy, diagnostics, data export/deletion, about, unofficial-app disclaimer and official-site link.

Do **not** add teacher lookup, guidance appointment booking, user-to-user chat, gamification, AI features, or developer accounts to v1. Revisit requests only after reliability is demonstrated.

## Sync contract (the central differentiator)

### Explicit states

| State | Meaning | UI behavior |
| --- | --- | --- |
| Never synced | No successful validated snapshot yet | Explain setup and show retry |
| Checking | Request/validation in progress | Show progress, preserve cached data |
| Verified, unchanged | Authenticated response parsed and validated; same grades as before | Show **checked at** timestamp, not “grades updated” |
| Verified, changed | Valid snapshot with detected changes | Show **checked at**, affected courses and change details |
| Offline/network error | New data could not be verified | Keep cache, show **last successful check**, retry |
| Session expired/auth error | Authentication needs user action | Explain and show login action; retain protected cache as appropriate |
| Partial/parse error | Site layout unexpected or some required data missing | Warn; preserve last known-good snapshot; capture **sanitized** diagnostic code |
| Rate limited/service unavailable | Site rejected or temporarily cannot process request | Respect retry/backoff, do not loop |

**Acceptance rules:**

- An HTTP 200 response alone is **not** success: detect login redirects, auth errors, changed markup, empty/unexpected payloads, missing required fields and invalid mark formats.
- Treat legitimate empty courses/assessments distinctly from incomplete parse failures.
- Store both **last attempt time** and **last fully verified successful check time**; optionally record partial-check details.
- Use atomic snapshots: parse and validate first, then commit data. Never replace working grade data with an incomplete result.
- Diff stable course/assessment identities; preserve historical snapshots locally, handle renamed assignments and duplicate names carefully.
- Deduplicate concurrent refreshes and guard against overlapping background/manual checks.
- Use bounded retries with exponential backoff and jitter; respect source rate limits and avoid aggressive polling.
- Cancel safely, surface errors in plain language, and expose a redacted troubleshooting view without sensitive content.
- Label the state as *checked* even when no marks have changed. Timestamp precision and device clock assumptions must be clear.
- Add an explicit **Open official TeachAssist** option for cross-checking.

### UI copy examples

- “Checked successfully at 3:41 PM. No grade changes found.”
- “2 assignments changed since the last verified check.”
- “Could not verify new grades. Showing saved grades from yesterday at 4:02 PM.”
- “Session expired. Sign in again to refresh.”
- “TeachAssist returned an unexpected page. Saved grades were not replaced.”

## Architecture (proposed, validate with prototype)

| Area | Initial approach |
| --- | --- |
| Mobile app | React Native + Expo, TypeScript; evaluate native Kotlin/Compose if constrained by background execution or secure auth |
| Navigation/UI | Minimal native-feeling layout, accessible typography, dark/light/system modes |
| Networking | Direct HTTPS to official TeachAssist endpoints **only where authorized** |
| Parser | Isolated versioned adapters with validated normalized course/assessment models |
| Storage | On-device SQLite for snapshots and preferences; encrypted sensitive records where appropriate |
| Authentication | Android Keystore-backed secure storage/session handling; never plaintext credentials in logs or repositories |
| Background work | Platform-supported scheduled work (e.g. WorkManager/native module), best-effort only |
| Notifications | Optional, local notifications after verified snapshot changes; do not promise immediate alerts |
| CI/CD | GitHub Actions build, test, lint, release-sign APK; produce Play-compatible AAB later |
| Observability | Local redacted diagnostics and opt-in sanitized bug reports; no tracking by default |

**Critical gate:** Confirm TeachAssist/YRDSB terms, permitted integration methods and service constraints before distributing a client using real student accounts. Do not bypass access controls, CAPTCHA, MFA or rate limits. Respect authentication boundaries. If permission is not obtained, pause public integration distribution and continue with fixture-based UI/prototyping.

No production service, API contract or third-party library is assumed stable until a prototype and permission review validate it.

## Phased delivery

### Phase 0: Discovery and permission gate

- [ ] Review official TeachAssist/board policies, branding, student data handling and permission for unofficial clients.
- [ ] Compare competitor pain points using direct, permission-based testing rather than feature-list assumptions.
- [ ] Evaluate relevant open-source repos/libraries and their licenses; keep attribution if code is reused.
- [ ] Investigate current supported login, sessions, CSRF flows, endpoint/HTML stability and logout behavior with a test account authorized for use.
- [ ] Record sample **redacted or synthetic** fixtures for courses, grades, KTCA weights, errors and unusual account states.
- [ ] Decide React Native/Expo vs Kotlin after testing required networking, secure storage and background constraints.
- [ ] Define Android minimum version, accessibility baseline, package ID and release signing owner.

**Exit gate:** Access/privacy plan documented; no unresolved dependency on prohibited access; architecture proof of concept.

### Phase 1: Sync engine and data correctness (P0)

- [ ] Model terms, courses, assessments, categories, weighting, exemptions, ungraded entries, reported and calculated averages.
- [ ] Implement direct authorized login/session management with secure credential handling.
- [ ] Implement isolated parser, schema validation and meaningful error classification.
- [ ] Implement atomic, versioned local snapshot persistence and migrations.
- [ ] Implement sync state machine, last attempt/verified times and retry with backoff.
- [ ] Compare complete validated snapshots; detect added/removed/changed assessments and changes in weights.
- [ ] Implement sanitized local diagnostics and open-official-site link.
- [ ] Unit test every sync state and malformed/incomplete response.

**Exit gate:** Verified success cannot occur on a bad response; offline cache is never falsely represented as fresh.

### Phase 2: Minimum viable Android app (P0)

- [ ] Onboarding and login with transparent unofficial-app/privacy explanation.
- [ ] Dashboard with fast cached launch, course averages and clear sync indicators.
- [ ] Course details with assessment marks and KTCA/category breakdown where applicable.
- [ ] Manual pull-to-refresh/button; straightforward loading, error, empty and expired-session screens.
- [ ] Dark/light/system themes and consistent, compact typography.
- [ ] Settings for refresh, session sign-out, local data deletion and privacy.
- [ ] Accessible labels, screen-reader support, sensible touch targets and dynamic text sizing.
- [ ] GitHub Actions CI for typecheck, lint, tests and debug APK artifact.
- [ ] Real-device regression checks against official TeachAssist, only with appropriate authorization.

**MVP definition:** A student can sign in, view and verify current retrieved grades, navigate assessment details, safely refresh and identify stale data.

### Phase 3: Public beta / GitHub release (P0-P1)

- [ ] Permission/privacy and security review before inviting beta testers.
- [ ] Sign release APK using protected CI secrets; establish reproducible versioning and signing-key backups.
- [ ] Publish readable setup instructions, support/issue templates and privacy policy.
- [ ] Verify install/upgrade, session expiration, offline behavior, unusual courses and error reporting across Android devices.
- [ ] Validate exact grades versus official TeachAssist with volunteer testers; never request their passwords.
- [ ] Test app resume, rotation, low-storage, migration and interrupted-sync scenarios.
- [ ] Publish release notes including fixes, known limitations and verified sync behavior.
- [ ] Establish incident procedure for markup changes, login failures or unsafe data handling.

**Exit gate:** Core correctness, safe authentication, stability and transparent failures confirmed in beta.

### Phase 4: Quality-of-life v1.1 (P1)

- [ ] What-if calculator with transparent weights, category handling and unsaved hypothetical marks.
- [ ] Grade change timeline with local timestamps and diffs; distinguish observed change time from teacher entry time.
- [ ] Optional best-effort background checks and alerts for *verified* changes.
- [ ] User-configurable sync frequency bounded to avoid overloading TeachAssist.
- [ ] Data export/import of non-secret history where appropriate; user-controlled deletion.
- [ ] Better filtering/search inside long assessment lists and historical semester views.
- [ ] Compare reported grade and locally computed grade with explicit discrepancy explanations.

**Exit gate:** Analytics and alerts do not compromise battery, source reliability or privacy.

### Phase 5: Play Store and sustained maintenance (P1)

- [ ] Confirm eligible adult-owned Play developer account and registration requirements.
- [ ] Produce signed AAB, complete Data safety form, privacy policy and third-party/unofficial disclosure.
- [ ] Meet current target SDK, API level, verification and testing-track requirements (check at submission).
- [ ] Complete closed testing requirements that apply to the account before applying for production.
- [ ] Confirm app name/icon do not imply YRDSB/TeachAssist endorsement.
- [ ] Set up release channels, rollback communication and compatibility monitoring.
- [ ] Keep GitHub APK and Play releases built from the same tagged source, with consistent signatures/versioning.

### Phase 6: Optional v2 (P2, only with demand)

- [ ] Home-screen widgets showing cached grades **and their last-verified age**.
- [ ] Improved visual analytics, historical comparisons and exportable reports.
- [ ] Local-only user personalization and per-course layout controls.
- [ ] Additional accessibility and performance refinements based on beta feedback.

## Priority backlog

| Priority | Work | Rationale |
| --- | --- | --- |
| P0 | Permission / integration feasibility | Public release blocker |
| P0 | Accurate login + validated parser | Core functionality |
| P0 | Trustworthy sync-state UX | Primary reason this app exists |
| P0 | Atomic offline cache | Never damage known-good data |
| P0 | Secure credential/session handling | Protect students |
| P0 | Dashboard + assessment details | Core product |
| P0 | Error regression tests + official-site comparison | Prove correctness |
| P1 | Grade-change history | Adds insight with low UI noise |
| P1 | What-if grade calculator | Valuable without feature sprawl |
| P1 | Opt-in, best-effort background alerts | Convenience, not accuracy guarantee |
| P1 | Play Store distribution | Ease of installation and updates |
| P2 | Widgets and richer analytics | Nice-to-have |

## Testing matrix

- **Auth:** correct/incorrect credentials, expired session, forced logout, login-page response with HTTP 200, account without expected courses.
- **Network:** airplane mode, timeout, DNS failure, slow response, 429/5xx, interrupted refresh, simultaneous refresh, backoff and recovery.
- **Parsing:** changed HTML, malformed percentages, blank marks, missing weighting, special characters, duplicate assignment names, removed/renamed items, semester changes, zero grades and intentional empty lists.
- **Grade math:** KTCA and alternate categories, uneven weights, exemptions, empty categories, rounding/precision, reported-vs-calculated discrepancies; verify against fixtures rather than presuming one universal grading rule.
- **Caching:** app killed mid-sync, migrations, corrupted snapshot, first launch offline, device clock changed, stale snapshot after auth failure.
- **UI:** very narrow/wide devices, font scaling, TalkBack, contrast, dark/light mode, no confusing success signal on failures.
- **Security:** encrypted secrets, no sensitive logs, no network request to developer servers, backups/screenshot exposure decisions, credential deletion and export safety.
- **Delivery:** CI checks, APK signing, upgrade with preserved history, fresh install, AAB packaging and compatible Play signing strategy.

## Security, legal and ethical release checklist

- [ ] Obtain clarity on authorized third-party access and relevant terms before public distribution.
- [ ] Minimize permissions and process only necessary academic data.
- [ ] Store secrets with Android Keystore-backed facilities; prefer short-lived session material rather than persist raw password when supported.
- [ ] Never transmit or log credentials, marks, school IDs or session tokens to a developer server.
- [ ] Avoid screenshots, crash payloads and automatic device backups leaking private grade data.
- [ ] Provide clear privacy policy, locally accessible data deletion and unofficial-app notice.
- [ ] Review dependency licenses, including MIT attribution notices if reusing code.
- [ ] Never include real grades or credentials in source-controlled fixtures.
- [ ] Treat Play policy, age/ownership and closed-testing requirements as pre-release gates.

## Key risks and mitigations

| Risk | Mitigation |
| --- | --- |
| TeachAssist changes HTML or authentication | Adapter isolation, fixture tests, parse-failure detection, urgent compatibility releases |
| Unauthorized integration/brand confusion | Explicit review/permission gate, clear non-affiliation notice, no access-control bypass |
| Misleading grade accuracy | Verified timestamps, reported vs calculated separation, official-site cross-check |
| Background throttling on Android | Best-effort scheduling, no immediate-notification promise, explicit check timestamps |
| Account privacy breach | On-device-first architecture, secure session storage, minimized logs |
| Feature creep | Three-tab IA, P0/P1/P2 prioritization, defer appointments/directories/chat |
| Store policy changes | Re-check requirements before submission; GitHub beta as initial distribution path |

## Definition of done for each feature

- [ ] Acceptance criteria and failure states documented.
- [ ] Test coverage for normal, edge and offline/error cases.
- [ ] No private student data added to logs, telemetry, fixtures or commits.
- [ ] Accessible UI and correct stale-data indicators.
- [ ] Works after app restart and session expiry as applicable.
- [ ] Updated changelog/release notes and user-facing limitation documentation.

## Guiding decision

**Reliability before features.** If adding a feature makes the app harder to trust, harder to maintain, or more invasive, it does not belong in the release yet.
