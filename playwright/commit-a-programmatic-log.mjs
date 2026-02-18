import { mkdirSync, writeFileSync } from 'node:fs';
import { playwrightPreflight } from './preflight.mjs';
import { chromiumLaunchOptions } from './config.mjs';

const outDir = 'artifacts/meal-templates/commit-a';
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
    install: 'npm run pw:setup && node playwright/commit-a-programmatic-log.mjs',
    summary: preflight.summary,
    trace: `${outDir}/trace.zip (not generated because browser could not launch)`
  });
  console.warn('SKIPPED: browser unavailable for commit-a programmatic logging screenshot.');
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
    const persons = await storage.getPersons();
    if (!persons.length) await storage.seedSampleData();
    const finalPersons = await storage.getPersons();
    const personId = finalPersons[0]?.id;
    const today = new Date().toISOString().slice(0, 10);
    const template = await storage.upsertMealTemplate({
      name: 'Commit A Programmatic Meal',
      items: [
        {
          foodKey: 'generic:banana',
          label: 'Banana',
          per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          gramsDefault: 120
        },
        {
          foodKey: 'generic:oats',
          label: 'Oats (dry)',
          per100g: { kcal: 389, protein: 17, carbs: 66, fat: 7 },
          gramsDefault: 60
        }
      ]
    });

    await storage.logMealTemplate({
      personId,
      date: today,
      time: '08:00',
      templateId: template.id
    });
  });

  await page.click('button[data-route="dashboard"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/dashboard-after-programmatic-log.png`, full_page: true });
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
