const fs = require('node:fs');

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (report.error || !report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
  throw new Error('npm audit did not produce a valid report');
}
const allowed = 'https://github.com/advisories/GHSA-86w9-cpqp-85rv';
const unexpected = [];
let known = 0;
for (const [name, details] of Object.entries(report.vulnerabilities)) {
  for (const via of details.via || []) {
    if (typeof via !== 'object') continue;
    if (name === 'node-forge' && via.url === allowed) {
      known++;
    } else {
      unexpected.push({ name, via: via.url || via.name || via.title });
    }
  }
}
if (unexpected.length || (Object.keys(report.vulnerabilities).length && known === 0)) {
  process.stderr.write('Unexpected dependency advisory: ' + JSON.stringify(unexpected) + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write(known ? 'Only the documented patched-in-postinstall node-forge advisory remains.\n' : 'npm audit clean.\n');
}
