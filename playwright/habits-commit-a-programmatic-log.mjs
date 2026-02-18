import { mkdirSync, writeFileSync } from 'node:fs';
import { playwrightPreflight } from './preflight.mjs';
import { chromiumLaunchOptions } from './config.mjs';

const outDir = 'artifacts/habits/commit-a';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/index.html';

mkdirSync(outDir, { recursive: true });

function saveDiagnostics(payload) {
  writeFileSync(`${outDir}/diagnostics.json`, `${JSON.stringify(payload, null, 2)}\n`);
}

const preflight = await playwrightPreflight({ requiredBrowsers: ['chromium'] });
if (!preflight.ok) {
  saveDiagnostics({
    skipped: true,
    reason: preflight.reason,
    message: preflight.message,
    install: ['npm run pw:setup', 'node playwright/habits-commit-a-programmatic-log.mjs'],
    summary: preflight.summary,
    trace: `${outDir}/trace.zip (not generated because browser launch was skipped)`
  });
  console.warn('SKIPPED: browser unavailable for habits commit-a screenshot.');
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
    const today = new Date().toISOString().slice(0, 10);

    await storage.addWaterLog({ personId, date: today, amountMl: 1000 });
    await storage.addExerciseLog({ personId, date: today, minutes: 20 });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('button[data-route="dashboard"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/dashboard-after-programmatic-logs.png`, full_page: true });

  await context.tracing.stop({ path: `${outDir}/trace.zip` });
} catch (error) {
  await context.tracing.stop({ path: `${outDir}/trace.zip` });
  saveDiagnostics({
    skipped: false,
    reason: 'runtime-error',
    message: String(error?.stack || error)
  });
  throw error;
} finally {
  await browser.close();
}
