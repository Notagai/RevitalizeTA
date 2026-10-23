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

On Dashboard, choose **Check demo data** to load invented courses. Open a course to inspect marks, category weights and calculation assumptions. Settings lets you simulate changed grades, no courses, offline, expired-session and invalid-response states. Try a failure after a successful check: saved grades and their previous verified timestamp should remain visible. Theme preferences and demo grades persist locally. Grade data can be deleted from Settings after confirmation.

No background checks, notifications or automatic retries run. The official-site link opens the official site separately and does not verify this demo. Live integration, privacy approval, encrypted sensitive storage, durable history and release builds are still pending.

See [ROADMAP.md](ROADMAP.md), [implementation status and limitations](docs/IMPLEMENTATION_STATUS.md), [manual testing](docs/TESTING.md), and the [TA-API privacy gate](docs/TA_API_INTEGRATION.md).
