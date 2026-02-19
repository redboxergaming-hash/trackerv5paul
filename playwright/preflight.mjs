import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

function boolEnv(name) {
  const value = process.env[name];
  return value != null && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

async function fileExists(path) {
  if (!path) return false;
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function printStatusTable(rows) {
  const nameWidth = Math.max('Browser'.length, ...rows.map((row) => row.name.length));
  const statusWidth = Math.max('Status'.length, ...rows.map((row) => row.status.length));

  const header = `${'Browser'.padEnd(nameWidth)}  ${'Status'.padEnd(statusWidth)}  Path`;
  const divider = `${'-'.repeat(nameWidth)}  ${'-'.repeat(statusWidth)}  ${'-'.repeat(4)}`;
  console.log(header);
  console.log(divider);
  rows.forEach((row) => {
    console.log(`${row.name.padEnd(nameWidth)}  ${row.status.padEnd(statusWidth)}  ${row.path || '(unresolved)'}`);
  });
}

function buildSummary({ ok, reason, rows, browsersPath, skipDownload, ci }) {
  return {
    ok,
    reason,
    requiredBrowsers: rows.map((row) => row.name),
    rows,
    env: {
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: skipDownload,
      CI: ci
    },
    installHint: 'npx playwright install --with-deps chromium webkit firefox',
    cachingHint:
      'Cache ~/.cache/ms-playwright or your custom PLAYWRIGHT_BROWSERS_PATH directory in CI to avoid repeated downloads.'
  };
}

export async function playwrightPreflight({ requiredBrowsers = ['chromium', 'webkit', 'firefox'], quiet = false } = {}) {
  const skipDownload = boolEnv('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD');
  const ci = String(process.env.CI || '').toLowerCase() === 'true';
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '(default Playwright cache)';

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    return {
      ok: false,
      reason: 'playwright-missing',
      message: `Playwright package is missing. Run: npm ci${skipDownload ? '' : ' && npx playwright install --with-deps'}`,
      rows: [],
      summary: buildSummary({ ok: false, reason: 'playwright-missing', rows: [], browsersPath, skipDownload, ci })
    };
  }

  const rows = [];
  for (const name of requiredBrowsers) {
    const browserType = playwright[name];
    if (!browserType) {
      rows.push({ name, status: 'MISSING', path: '(unsupported browser type)' });
      continue;
    }

    let resolvedPath = '';
    try {
      resolvedPath = browserType.executablePath();
    } catch {
      resolvedPath = '';
    }

    const found = await fileExists(resolvedPath);
    rows.push({ name, status: found ? 'FOUND' : 'MISSING', path: resolvedPath || '(unresolved)' });
  }

  if (!quiet) {
    console.log('Playwright preflight');
    console.log(`- PLAYWRIGHT_BROWSERS_PATH: ${browsersPath}`);
    console.log(`- PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: ${skipDownload ? '1' : '0'}`);
    console.log(`- CI: ${ci ? 'true' : 'false'}`);
    printStatusTable(rows);
  }

  const missing = rows.filter((row) => row.status !== 'FOUND');
  if (!missing.length) {
    if (!quiet) console.log('Preflight OK: required browser binaries are present.');
    return {
      ok: true,
      reason: 'ready',
      rows,
      message: 'All required browser binaries are present.',
      summary: buildSummary({ ok: true, reason: 'ready', rows, browsersPath, skipDownload, ci })
    };
  }

  const installHint = skipDownload
    ? 'Browser download is disabled (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1). Unset it and run: npx playwright install --with-deps chromium webkit firefox'
    : 'Install missing browsers with: npx playwright install --with-deps chromium webkit firefox';

  const message = `Missing Playwright browser binaries: ${missing.map((row) => row.name).join(', ')}. ${installHint}`;
  if (!quiet) {
    console.warn(message);
    if (ci) {
      console.warn(
        'CI tip: cache ~/.cache/ms-playwright (or PLAYWRIGHT_BROWSERS_PATH) and run preflight before smoke tests.'
      );
    }
  }

  return {
    ok: false,
    reason: 'browser-binaries-missing',
    rows,
    message,
    summary: buildSummary({ ok: false, reason: 'browser-binaries-missing', rows, browsersPath, skipDownload, ci })
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await playwrightPreflight();
  if (result.ok) {
    process.exit(0);
  }

  if (result.reason === 'browser-binaries-missing') {
    process.exit(2);
  }

  process.exit(1);
}
