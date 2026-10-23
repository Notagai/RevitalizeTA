# TA-API integration plan

Target service: https://ta-api.vercel.app/ (unofficial third-party service; not an official YRDSB endpoint).

Its published API documents POST /api/getCourses with JSON username and password fields. It describes a JSON array of course objects with code, name, block, room, start_time, end_time, overall_mark (number or "N/A"), isFinal, isMidterm, assignments and weight_table. See the service's website for category abbreviations.

## Required integration gates
- [ ] Inspect linked source, dependencies, deployment, maintenance, logging, storage and data handling.
- [ ] Confirm authorization and acceptable use of an unofficial client.
- [ ] Assess the implications of sending school credentials to a third-party endpoint. The provider's privacy claims are not independently verified.
- [ ] Decide whether this credential flow is acceptable; prefer authorized direct integration if not.
- [ ] Define versioned normalized types and schemas for course, assessment, and weights using synthetic or properly sanitized fixtures.
- [ ] Build an interchangeable adapter with timeouts, cancellation, error classification and runtime validation.
- [ ] Prevent invalid/partial responses from replacing verified cached snapshots.
- [ ] Test with entirely synthetic fixtures: empty/no grade, N/A, malformed/missing fields, offline, login rejection, unusual weights and changes.
- [ ] Require explicit review before sending real credentials or grades to the third-party API.

Agents must **not** contact the endpoint with actual accounts, perform live login tests, or record student information in logs, source control, telemetry or screenshots. Fixture-only development is allowed now.
