# RevitalizeTA three-hour unattended single-agent run

You are the ONLY coding agent. Do not spawn, delegate to, or request subagents.

Read AGENTS.md, ROADMAP.md, docs/TA_API_INTEGRATION.md, and inspect the actual app state. Independently work through the unfinished safe tasks, in dependency order. You may work through as many tasks as time and checks permit, rather than stopping after one or two. Prioritize a working Expo/TypeScript UI, synthetic fixtures, validated data models, local cache and error states, accessible navigation, testing, and documentation. Keep design choices cohesive and sensible. Avoid speculative features not on the roadmap.

## Android emulator testing

The launcher checks that one Android emulator is connected and sets ANDROID_HOME and ANDROID_SERIAL. Use `adb devices` and `adb -s $ANDROID_SERIAL shell getprop ro.build.version.release` to recheck connectivity. Run `npx expo run:android` for native changes or initial installation, and `npx expo start` with the installed development build when only JS/TS changes need testing. Avoid redundant native builds.

For meaningful UI changes, attempt Android emulator testing: install/launch the app, drive simple navigation using `adb shell input tap` / `input swipe` if coordinates are known and safe, and inspect sanitized `adb logcat` errors. The configured package ID is com.notagai.revitalizeta (confirm actual installed ID with ADB). You may capture a screenshot using `adb exec-out screencap -p` to a temporary, Git-ignored directory, but do not claim a visual inspection occurred unless you actually have an image-reading capability available and inspected it. Never capture actual student grades or credentials. Do not mistake ADB connectivity alone for a successful app test.

If the Codex execution sandbox blocks host ADB, emulator I/O, network, or subprocess access, report it explicitly; do not bypass the sandbox or claim tests passed. Do not require emulator UI tests on purely non-UI changes where targeted automated tests are sufficient.

After each meaningful task: typecheck, lint (if configured), and run relevant tests; fix regressions, commit verified changes on the current codex/night-* branch, and update ROADMAP.md accurately. Keep a concise progress note in the final response. Continue to the next safe independent task without asking for minor creative decisions.

Safety: development must use SYNTHETIC fixtures ONLY. Do not send actual login details or real student information to ta-api.vercel.app, TeachAssist, or any service. The third-party API is only planned pending a privacy/authorization decision. Never read secrets, deploy, push, merge, edit main, or run destructive native prebuilds. Do not use npm audit fix --force. Keep generated files and logs out of commits.

Efficiency: low reasoning, minimal repeated scans, no subagents, no unnecessary dependencies. Prefer focused tests; do not continually rebuild Android when TypeScript checks suffice. If a task is blocked, document the blocker and move to another safe task. Stop when remaining items require external authorization, secret access, user input, or unsafe actions.

The external PowerShell supervisor enforces a maximum runtime of 180 minutes. Finish cleanly before that when practical. This is one Codex invocation, not an automatically restarting loop.
