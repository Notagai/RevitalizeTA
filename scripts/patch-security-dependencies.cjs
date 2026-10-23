/* Scoped backport of digitalbazaar/forge PR #1152 (MIT), reviewed in SEC_FIXES.md.
 * Keep the installed version accurate: npm audit still reports the upstream version.
 * This script is deterministic, idempotent, and refuses unknown source layouts. */
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('node-forge/package.json');
if (manifest.version !== '1.4.0') throw new Error('Review the forge security backport for the installed version');
const target = path.join(path.dirname(require.resolve('node-forge/package.json')), 'lib', 'rsa.js');
const original = fs.readFileSync(target, 'utf8');
const marker = '// RevitalizeTA: reject extra nested DigestAlgorithm elements (CVE-2026-85393).';
if (original.includes(marker)) process.exit(0);
const before = '            obj.value.length !== 2) {';
const after = `${marker}\n            obj.value.length !== 2 ||\n            obj.value[0].value.length !== (Object.prototype.hasOwnProperty.call(capture, 'parameters') ? 2 : 1)) {`;
if (original.split(before).length !== 2) throw new Error('Unexpected forge source: security patch was not applied');
fs.writeFileSync(target, original.replace(before, after));
process.stdout.write('Applied scoped node-forge DigestAlgorithm validation backport.\n');
