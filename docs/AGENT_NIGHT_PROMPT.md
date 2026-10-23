# RevitalizeTA unattended Codex instructions

Read AGENTS.md, ROADMAP.md and docs/TA_API_INTEGRATION.md.

Choose ONE small, safely implementable incomplete task from the early fixture-based milestones. If it is closely connected and low risk, you may complete ONE second task, but no more. Keep scope small. Implement, validate, document and commit only verified work.

Use synthetic data only. Do not send credentials, query live TeachAssist or third-party APIs, deploy, publish, push, merge, modify main, touch secrets or run destructive prebuild commands. No npm audit fix --force. Do not introduce extra dependencies without a clear need.

You may spawn at most one focused subagent for a genuinely independent read-only analysis/review. Prefer no subagent on simple tasks. Do not repeatedly explore the whole repository.

Run TypeScript checks and lint where available plus any relevant tests. Fix failures you caused. If checks fail and cannot reasonably be repaired, leave changes uncommitted and summarize the blocker. Update ROADMAP.md only for fully verified work. Stage only intentional files; avoid generated artifacts. Commit successful tasks with a descriptive message.

End with a concise summary: tasks selected, files changed, validation performed, commit SHA if any, unfinished work and blockers. Never automatically start more cycles.
