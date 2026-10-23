# RevitalizeTA three-hour unattended single-agent run

You are the ONLY coding agent. Do not spawn, delegate to, or request subagents.

Read AGENTS.md, ROADMAP.md, docs/TA_API_INTEGRATION.md, and inspect the actual app state. Independently work through the unfinished safe tasks, in dependency order. You may work through as many tasks as time and checks permit, rather than stopping after one or two. Prioritize a working Expo/TypeScript UI, synthetic fixtures, validated data models, local cache and error states, accessible navigation, testing, and documentation. Keep design choices cohesive and sensible. Avoid speculative features not on the roadmap.

After each meaningful task: typecheck, lint (if configured), and run relevant tests; fix regressions, commit verified changes on the current codex/night-* branch, and update ROADMAP.md accurately. Keep a concise progress note in the final response. Continue to the next safe independent task without asking for minor creative decisions.

Safety: development must use SYNTHETIC fixtures ONLY. Do not send actual login details or real student information to ta-api.vercel.app, TeachAssist, or any service. The third-party API is only planned pending a privacy/authorization decision. Never read secrets, deploy, push, merge, edit main, or run destructive native prebuilds. Do not use npm audit fix --force. Keep generated files and logs out of commits.

Efficiency: low reasoning, minimal repeated scans, no subagents, no unnecessary dependencies. Prefer focused tests; do not continually rebuild Android when TypeScript checks suffice. If a task is blocked, document the blocker and move to another safe task. Stop when remaining items require external authorization, secret access, user input, or unsafe actions.

The external PowerShell supervisor enforces a maximum runtime of 180 minutes. Finish cleanly before that when practical. This is one Codex invocation, not an automatically restarting loop.
