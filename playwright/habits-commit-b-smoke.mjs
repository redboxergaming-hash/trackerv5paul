import { mkdirSync, writeFileSync } from 'node:fs';
import { playwrightPreflight } from './preflight.mjs';
import { chromiumLaunchOptions } from './config.mjs';

const outDir = '.runtime-artifacts/habits/commit-b';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/index.html';

mkdirSync(outDir, { recursive: true });

function writeDiagnostics(payload) {
  writeFileSync(`${outDir}/diagnostics.json`, `${JSON.stringify(payload, null, 2)}\n`);
}

const preflight = await playwrightPreflight({ requiredBrowsers: ['chromium'] });
if (!preflight.ok) {
  writeDiagnostics({
    skipped: true,
    reason: preflight.reason,
    message: preflight.message,
    install: ['npm run pw:setup', 'node playwright/habits-commit-b-smoke.mjs'],
    summary: preflight.summary,
    trace: `${outDir}/trace.zip (not generated because browser launch was skipped)`
  });
  console.warn('SKIPPED: browser unavailable for habits commit-b screenshots.');
  process.exit(0);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch(chromiumLaunchOptions());
const context = await browser.newContext();
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.evaluate(async () => {
    const storage = await import('./storage.js');
    let persons = await storage.getPersons();
    if (!persons.length) {
      await storage.seedSampleData();
      persons = await storage.getPersons();
    }
    const personId = persons[0]?.id;
    await storage.deleteAllData();
    await storage.seedSampleData();

    // cleanup habits for deterministic baseline
    const db = await storage.openDb();
    const tx = db.transaction(['waterLogs', 'exerciseLogs'], 'readwrite');
    tx.objectStore('waterLogs').clear();
    tx.objectStore('exerciseLogs').clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('button[data-route="dashboard"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/dashboard-habits-empty.png`, full_page: true });

  await page.click('#dashboardSummary button[data-action="add-water-500"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/dashboard-habits-after-water.png`, full_page: true });

  await page.click('#dashboardSummary button[data-action="add-exercise-20"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/dashboard-habits-after-exercise.png`, full_page: true });

  await page.click('#dashboardSummary button[data-action="add-water-500"]');
  await page.click('#dashboardSummary button[data-action="add-exercise-10"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/dashboard-habits-both.png`, full_page: true });

  await context.tracing.stop({ path: `${outDir}/trace.zip` });
} catch (error) {
  await context.tracing.stop({ path: `${outDir}/trace.zip` });
  writeDiagnostics({
    skipped: false,
    reason: 'runtime-error',
    message: String(error?.stack || error)
  });
  throw error;
} finally {
  await browser.close();
}
