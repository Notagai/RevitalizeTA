# RevitalizeTA

An unofficial Android-first TeachAssist grade tracker prototype built with Expo SDK 58 and TypeScript. The current app uses **synthetic data only**. It does not accept school credentials or connect to TeachAssist or the unofficial TA-API.

Install project dependencies with `npm ci` (Node 24 recommended for the built-in TypeScript test runner), then:

```sh
npm start
npm run typecheck
npm test
npm run lint
```

Use an installed compatible development build. For initial Android installation, run `npm run android` with an authorized emulator/device available. Native dependency changes require rebuilding the development app. No generated native directories belong in commits.

Use **Load** in the small notice at the top to load invented courses, then **Refresh** for subsequent checks. The notice stays visible while scrolling and includes cancel/retry states. Open a course to inspect marks, category weights and calculation assumptions. Settings lets you simulate changed grades, no courses, offline, expired-session and invalid-response states. Try a failure after a successful check: saved grades and their previous verified timestamp should remain visible. Theme preferences and demo grades persist locally. Grade data can be deleted from Settings after confirmation.

Choose **Semester 1** or **Semester 2** to see five demo courses in timetable order, with a flat **Lunch** bar after the second course. Refresh once to expand an older saved demo to the new timetable. The dashboard shows a transparent circular average, course grade bars, assessment counts, and missing-mark flags for the selected semester. Its average gives each available reported course grade equal weight; courses without reported grades and Lunch are excluded. Course details include category grade bars and filters for graded, missing, and pending assessments. Analytics compares courses and groups reported grades into grade bands; these charts are a current snapshot, not historical trends.

In Settings, choose a light, dark, or system appearance, then customize **Main color** and **Accent color** using hex codes or a preset. The live preview appears before applying colors. The palette algorithm derives surfaces, chart colors, and contrasting text for both appearances; forest green (`#006B57`) and mint (`#88DEC1`) are the defaults. Existing theme preferences migrate automatically, and the selected colors persist locally.

The **Liquid glass** toggle adds glass surfaces to cards and the bottom navigation. It uses the installed native Expo glass effect when supported on iOS, a backdrop blur on web, and a lightweight translucent gloss on other devices. The toggle persists, defaults off, and respects reduced transparency on iOS. Turning it off keeps the same layout with solid surfaces.

No background checks, notifications or automatic retries run. The official-site link opens the official site separately and does not verify this demo. Live integration, privacy approval, encrypted sensitive storage, durable history and release builds are still pending.

See [ROADMAP.md](ROADMAP.md), [implementation status and limitations](docs/IMPLEMENTATION_STATUS.md), [manual testing](docs/TESTING.md), and the [TA-API privacy gate](docs/TA_API_INTEGRATION.md).
