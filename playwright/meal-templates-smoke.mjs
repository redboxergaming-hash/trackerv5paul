import { playwrightPreflight } from './preflight.mjs';
import { chromiumLaunchOptions } from './config.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/index.html';
const outDir = process.env.MEAL_ARTIFACT_DIR || `artifacts/meal-templates/${process.env.MEAL_ARTIFACT_TAG || 'local-run'}`;
const strictMode = process.env.SMOKE_STRICT === '1';

mkdirSync(outDir, { recursive: true });

function writeDiagnostics(payload) {
  writeFileSync(`${outDir}/diagnostics.json`, `${JSON.stringify(payload, null, 2)}\n`);
}

const preflight = await playwrightPreflight({ requiredBrowsers: ['chromium'] });
if (!preflight.ok) {
  const diagnostics = {
    skipped: true,
    strictMode,
    reason: preflight.reason,
    message: preflight.message,
    install: {
      command: 'npx playwright install --with-deps chromium webkit firefox',
      note: 'If download is blocked, keep PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 and treat smoke as skipped.'
    },
    summary: preflight.summary
  };
  writeDiagnostics(diagnostics);

  if (strictMode) {
    console.error(`SMOKE_STRICT=1 -> failing: ${preflight.message}`);
    process.exit(1);
  }

  console.warn(`SKIPPED: browsers missing (${preflight.reason}).`);
  process.exit(0);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch(chromiumLaunchOptions());
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.click('button[data-route="add"]');

  await page.click('[data-action="new-meal-template"]');
  await page.screenshot({ path: `${outDir}/meal-modal-empty.png`, full_page: true });

  await page.fill('#mealTemplateName', 'Breakfast Standard');
  await page.click('#mealTemplateAddItemBtn');
  await page.fill('#mealTemplateSearchInput', 'banana');
  await page.click('#mealTemplateSearchResults button[data-action="select-meal-item"]');
  await page.fill('#mealTemplateSearchInput', 'oats');
  await page.click('#mealTemplateSearchResults button[data-action="select-meal-item"]');

  await page.fill('#mealTemplateItems input[data-action="meal-item-grams"][data-index="0"]', '120');
  await page.fill('#mealTemplateItems input[data-action="meal-item-grams"][data-index="1"]', '60');

  await page.screenshot({ path: `${outDir}/meal-modal-filled.png`, full_page: true });

  await page.click('#saveMealTemplateBtn');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/add-entry-meals.png`, full_page: true });

  await page.click('#mealTemplatesRow button[data-action="log-meal-template"][data-template-id]');
  await page.waitForTimeout(350);

  await page.click('button[data-route="dashboard"]');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/dashboard-after-one-tap.png`, full_page: true });

  const tableRows = await page.locator('#entriesTableContainer tbody tr').count();
  if (tableRows < 2) {
    throw new Error(`Expected at least 2 dashboard entry rows after one-tap meal log, found ${tableRows}`);
  }

  writeFileSync(`${outDir}/result.txt`, `ok\nrows=${tableRows}\n`);
} catch (error) {
  writeDiagnostics({
    skipped: false,
    strictMode,
    reason: 'smoke-runtime-error',
    message: String(error?.stack || error),
    summary: preflight.summary
  });
  throw error;
} finally {
  await browser.close();
}
