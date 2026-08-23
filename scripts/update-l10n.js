// Resolve @remixwarp/scratch-l10n to the latest commit on the main branch and
// pin it in package.json as an immutable archive URL.
// Usage: node scripts/update-l10n.js
// Used locally and in the Cloudflare Pages build step.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const dep = pkg.dependencies && pkg.dependencies['@remixwarp/scratch-l10n'];
if (!dep) {
  console.error('update-l10n: @remixwarp/scratch-l10n not found in dependencies');
  process.exit(1);
}

let commit;
try {
  commit = execSync('git ls-remote https://github.com/remixwarp/scratch-l10n.git main', {
    encoding: 'utf8',
    timeout: 30000
  }).trim().split(/\s+/)[0];
} catch (e) {
  console.error('update-l10n: failed to query GitHub:', e.message);
  process.exit(1);
}

if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error('update-l10n: unexpected git ls-remote output:', JSON.stringify(commit));
  process.exit(1);
}

const next = `https://github.com/remixwarp/scratch-l10n/archive/${commit}.tar.gz`;
if (dep === next) {
  console.log(`update-l10n: already up to date (${commit})`);
} else {
  pkg.dependencies['@remixwarp/scratch-l10n'] = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`update-l10n: pinned @remixwarp/scratch-l10n -> ${commit}`);
}
