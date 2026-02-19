# Macro Tracker PWA

Privacy-first calorie and macro tracker built as a static Web App / PWA for iPhone Safari install.

## Status
This repository currently contains **Commit 8** scope:
- Persons CRUD with cascade deletes
- Daily dashboard totals
- Manual add with favorites/recent
- Export / Import / Delete-all tools
- PWA manifest + service worker offline shell
- Barcode scanning + Open Food Facts integration with local cache
- Photo workflow (manual via ChatGPT prompt copy)

## Architecture overview (Commit 8)
- **Frontend**: vanilla JavaScript (ES modules), no framework.
- **Storage**: IndexedDB (`src/storage.js`) for persons, entries, products cache, favorites, recents, and meta.
- **Barcode stack**:
  - `src/scanner.js` for camera scanning via ZXing-js.
  - `src/offClient.js` for Open Food Facts product lookup and nutrition normalization.
- **Photo workflow**:
  - local image capture/select for preview only.
  - user-driven ChatGPT app workflow via copied prompt (no automated AI recognition).
- **PWA layer**:
  - `manifest.json` for install metadata.
  - `service-worker.js` for offline shell caching and runtime strategies.

## Photo workflow (Commit 8)
Photo tab includes:
- take/select photo from camera or gallery
- local preview in app
- **Copy ChatGPT Prompt** button with exact prompt text
- instructions:
  1. Open ChatGPT app
  2. Upload photo
  3. Paste prompt
  4. Return and log manually

Manual logging supports source label:
- `Photo (manual via ChatGPT)`

## Barcode flow (Commit 7)
1. Open **Scan** tab and start camera scanning.
2. On EAN/UPC detection, app checks local `productsCache`.
3. If online, app fetches OFF product data:
   - `product_name`, `brands`, `image_front_small_url`
   - per-100g kcal (or converted from kJ), protein, carbs, fat
4. Normalized per-100g nutrition is cached locally.
5. User can log product via portion picker with source label:
   - `Barcode (Open Food Facts)`

Offline behavior:
- Cached barcode works offline.
- If barcode not cached and offline, app shows:
  - `Needs internet for first lookup.`

## Local run
Because this is an ES module app, run from a static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Basic tests
Run helper unit tests:

```bash
node --test math.test.js
```

## Playwright smoke checks

For Linux/CI runners:

```bash
npx playwright install --with-deps
```

Run offline smoke validation (WebKit authoritative + Chromium best-effort fallback):

```bash
node playwright/smoke-offline.mjs
```


## Local smoke validation

```bash
npm install
npm run playwright:install
npm run smoke:offline
```

Linux CI/container runners can use:

```bash
npm run playwright:install:deps
```

Notes:
- WebKit is authoritative for iPhone/Safari behavior.
- Chromium smoke uses hardened launch flags for container stability.


## Playwright Setup

Use a deterministic setup command for local dev/CI:

```bash
npm run pw:setup
```

What it does:
- runs `npm ci`
- checks browser availability via `npm run pw:preflight`
- installs browsers (`chromium`, `webkit`, `firefox`) when downloads are allowed
- keeps smoke tests skippable when download is blocked

Local commands:

```bash
npm ci
npx playwright install --with-deps
npm run pw:preflight
npm run meal:smoke
```

If downloads are blocked:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm run pw:setup
npm run meal:smoke
```

In this mode, smoke scripts write diagnostics and skip by default. Set `SMOKE_STRICT=1` to hard-fail when browsers are missing.

CI caching guidance:
- Cache `~/.cache/ms-playwright` (default)
- Or set/cache `PLAYWRIGHT_BROWSERS_PATH` directory
- Run `npm run pw:preflight` before smoke jobs to fail fast on missing binaries

Meal-template artifact paths:
- `.runtime-artifacts/meal-templates/commit-1-storage/add-entry-meals.png`
- `.runtime-artifacts/meal-templates/commit-1-storage/meal-modal-empty.png`
- `.runtime-artifacts/meal-templates/commit-1-storage/meal-modal-filled.png`
- `.runtime-artifacts/meal-templates/commit-1-storage/dashboard-after-one-tap.png`
- `.runtime-artifacts/meal-templates/commit-2-ui/add-entry-meals.png`
- `.runtime-artifacts/meal-templates/commit-2-ui/meal-modal-empty.png`
- `.runtime-artifacts/meal-templates/commit-2-ui/meal-modal-filled.png`
- `.runtime-artifacts/meal-templates/commit-2-ui/dashboard-after-one-tap.png`

## Restricted environments (CDN 403)

In some locked-down CI/container environments, Playwright browser downloads can be blocked (for example `403 Domain forbidden`).

In that case:
- `npm run playwright:install` prints guidance and soft-fails for recognized blocked-download errors.
- `npm run smoke:offline` auto-skips only when browser binaries are missing.
- Other app checks/tests continue to run normally.

To run smoke tests on a local machine with download access:

```bash
npm install
npx playwright install
npm run smoke:offline
```

WebKit remains the primary/authoritative target for iPhone Safari behavior.
