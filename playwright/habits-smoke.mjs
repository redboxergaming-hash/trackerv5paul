import { chromium } from 'playwright';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:4173';
const screenshotPath = '.runtime-artifacts/habits/commit-h1/dashboard-after-programmatic-logs.png';

const today = new Date().toISOString().slice(0, 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.evaluate(async ({ date }) => {
    const storage = await import('/storage.js');
    const persons = await storage.getPersons();
    const person = persons[0];
    if (!person?.id) throw new Error('No person available for habits smoke test');

    await storage.addWaterLog({ personId: person.id, date, amountMl: 1000 });
    await storage.addExerciseLog({ personId: person.id, date, minutes: 20 });
  }, { date: today });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await browser.close();
}
