# Verification

Only invented school credentials and synthetic grade fixtures may be used in automated tests. Never run simulated redirect-exfiltration tests against the real school service.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx expo export --platform android --output-dir .expo/security-verification
```

The last command is a **native JavaScript bundle** compatibility check, not an Android APK or runtime networking test. In particular it checks whether `cheerio/slim` and the shared HTML parser bundle successfully for Android.

Automated tests cover grade parsing and normalization, official-host URL allowlists, form POST encoding, synthetic cookies, unexpected redirects, cancellation, bounded responses and dependency backports.

## Still required before distributing an APK

1. Build and launch the **release** Android app on a physical phone or emulator.
2. Use a test variant pointed at a controlled HTTPS mock only, with invented credentials and grade HTML.
3. Simulate redirects (301/302/303/307/308), cross-host destinations, cookie rotation, malformed payloads, HTML layout changes, network loss and aborts.
4. Confirm with a controlled receiving server that no redirect forwards the password POST to another host. Inspect the native networking layer, not just the JavaScript result.
5. Verify ordinary synthetic login and refresh, exact course list/assessment parsing, Privacy Mode labels, account changes, session expiry and sign-out.
6. Independently confirm actual TeachAssist authentication behavior under the service's rules using an account authorized for this purpose.

Passing unit tests is not equivalent to passing native transport tests. Do not represent the app as production-security certified.
