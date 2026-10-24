# Implementation status

RevitalizeTA is an Expo SDK 58 native application with Dashboard, course details, analytics, weight editor, light/dark themes and Privacy Mode.

## School integration

The application no longer needs a separate developer-operated HTTPS server or Redis. The native client sends an HTTPS form POST directly to the official TeachAssist host, parses allowlisted course reports on device and keeps credentials, cookies and grades in volatile memory. The unofficial third-party TA API remains disabled. Browser login is disabled.

A valid nine-digit student number and explicit authorization are required. Do not force an eight-character password limit; account holders may have longer, more complex passwords. The app contains a local sign-in/refresh cooldown, which cannot substitute for school-side abuse protection.

**Native release-device verification remains outstanding** for redirects, cookies and the authenticated HTML schema. No live school login was performed during this implementation.

## Privacy Mode

Setting persists locally as a boolean. Concealed grades, course details, analytics, ranking and accessible labels are restored only by explicit per-course or overall Show controls. Revelations reset on sign-out and mode switches. Screenshots remain allowed.

Read `docs/TESTING.md` and `SEC_FIXES.md` before release.
