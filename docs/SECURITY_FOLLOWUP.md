# Security follow-up (2026-10-23)

The previous server-proxy architecture was replaced with native direct-to-TeachAssist HTTPS communication. Server-only denial-of-service findings F-01/F-02, server Redis requirements and endpoint hosting no longer apply to the application, because the proxy and school API route were removed.

Remaining responsibilities:

- Protect `main` with GitHub pull requests, required passing checks and no force pushes or deletion. Ensure the **Protect main** ruleset targets `main` only, not all branches.
- Keep postinstall node-forge patch verification and monitor dependency advisories.
- Confirm Android's native Fetch actually handles redirects and cookies safely. JavaScript checks are not enough to exclude a body being replayed before the response is delivered.
- Maintain grade Privacy Mode and screenshots.
- Keep the nine-digit student-number check, memory-only session state, and direct official HTTPS host allowlist.

No real TeachAssist account, infrastructure or school network was attacked. Do not interpret the source review or mocked tests as penetration-test proof.
