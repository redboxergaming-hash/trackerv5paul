import { spawn } from 'node:child_process';
import { playwrightPreflight } from '../playwright/preflight.mjs';

function boolEnv(name) {
  const value = process.env[name];
  return value != null && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const skipDownload = boolEnv('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD');
const ci = String(process.env.CI || '').toLowerCase() === 'true';

const installDepsCode = await run('npm', ['ci']);
if (installDepsCode !== 0) {
  process.exit(installDepsCode);
}

const before = await playwrightPreflight({ quiet: true });
if (before.ok) {
  console.log('Playwright setup: browsers already installed.');
  process.exit(0);
}

if (skipDownload) {
  console.warn('Playwright setup: skipping browser install because PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1.');
  console.warn('Smoke tests may skip. To install browsers, unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD and run npm run pw:install.');
  if (ci) {
    console.warn('CI tip: cache ~/.cache/ms-playwright or PLAYWRIGHT_BROWSERS_PATH so preinstalled binaries can be reused.');
  }
  process.exit(0);
}

console.log('Playwright setup: installing browser binaries...');
const installCode = await run('npx', ['playwright', 'install', '--with-deps', 'chromium', 'webkit', 'firefox']);
if (installCode !== 0) {
  console.warn('Playwright setup: browser installation failed or blocked (e.g. CDN restrictions).');
  console.warn('Smoke tests remain skippable by default. For hard-fail use SMOKE_STRICT=1 when running smoke scripts.');
  if (ci) {
    console.warn('CI tip: cache ~/.cache/ms-playwright or PLAYWRIGHT_BROWSERS_PATH and ensure outbound access for downloads.');
  }
  process.exit(0);
}

const after = await playwrightPreflight({ quiet: true });
if (!after.ok) {
  console.warn('Playwright setup: install completed but required browsers are still missing.');
  process.exit(0);
}

console.log('Playwright setup: ready.');
