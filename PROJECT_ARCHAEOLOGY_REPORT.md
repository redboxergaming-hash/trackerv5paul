# Project Archaeology Report

## 1) Quick Scan (Repo-Überblick)

### Top-Level Dateien/Ordner
- `.git` — Git-Metadaten und Historie.
- `analyticschart.js` — Canvas-Rendering für Analytics-Linienchart (Kalorien, Scale, Trend).
- `app.js` — Haupt-Orchestrierung der Anwendung (State, Event-Wiring, Feature-Flows).
- `artifacts/` — Laufzeit-/Agent-Artefakte (z. B. Verifikationsnotizen).
- `genericfoods.js` — Eingebaute Nahrungsmittel-Datenbasis mit Makros und Kategorien.
- `icon.svg` — PWA App-Icon.
- `index.html` — Single-Page-App Markup mit allen Screens/Tabs/Dialogen.
- `manifest.json` — PWA-Manifest (standalone, portrait, icons, start_url).
- `math.js` — Mathe-Helfer für Numeric-Safety und Makro-Skalierung.
- `math.test.js` — Node-Testfile für `math.js`.
- `node_modules/` — installierte Dependencies (Playwright etc.).
- `offclient.js` — Open-Food-Facts API-Lookup + Normalisierung pro 100g.
- `package-lock.json` — npm Lockfile.
- `package.json` — npm Scripts + Dev-Dependency (`playwright`).
- `playwright/` — Smoke-Tests, Browser-Preflight und CI-Launch-Config.
- `readme.md` — Projektbeschreibung, Run- und Smoke-Test-Anleitung.
- `scanner.js` — Kamera-Barcode-Scanning über ZXing (CDN ESM).
- `scripts/` — Utility-Script für Playwright-Installation mit 403-Fallback.
- `service-worker.js` — Offline-Caching-Strategien (app shell + OFF API).
- `storage.js` — IndexedDB-Schicht inkl. Schema, CRUD, Export/Import, Trendberechnung.
- `styles.css` — UI-Styling, Theme-Variablen, Layout, responsive Komponenten.
- `ui.js` — Rendering-Funktionen und DOM-Form-Reader/Writer.

### Tech-Stack / Build / Tests / Deployment-Hinweise
- **Sprache/Laufzeit:** Vanilla JavaScript (ES Modules) im Browser + Node.js für Tests/Skripte.
- **Frameworks:** Kein Frontend-Framework; direkte DOM-Manipulation.
- **Persistenz:** IndexedDB.
- **PWA:** Manifest + Service Worker.
- **Externe APIs:** Open Food Facts via `fetch`.
- **Barcode:** ZXing Browser-Modul über jsDelivr CDN.
- **Build-Tooling:** Kein Bundler/Transpiler vorhanden; statisches Hosting reicht.
- **Test-Setup:** Node Test Runner für Unit-Tests (`math.test.js`) + Playwright-Smoke-Skript.
- **Deployment-Hinweis:** Als statische Website betreibbar (README nennt `python3 -m http.server 8080`).

### Wichtigste Commands (`package.json`)
- `npm test` → führt `node --test math.test.js` aus.
- `npm run smoke:offline` → startet `node playwright/smoke-offline.mjs`.
- `npm run playwright:install` → wrapper um `npx playwright install` mit Soft-Fail bei blockierten Browser-Downloads.
- `npm run playwright:install:deps` → wie oben mit `--with-deps chromium webkit`.

---

## 2) Produkt- & UX-Beschreibung (User-Perspektive)

### Navigation / Screens
Tabbar (8 Tabs):
1. Persons
2. Dashboard
3. Add Entry
4. Scan
5. Photo
6. Analytics
7. Nutrition
8. Settings

Jeder Tab schaltet ein `<section id="screen-...">` via `active`-Klasse.

### Sichtbare UI-Struktur
- **Topbar:** App-Titel + `Install`-Button.
- **iOS Install Banner:** sticky Hinweis mit Dismiss-Button (persistiert via `localStorage`).
- **Main-Screens:**
  - **Persons:** Karten mit Tagesstand je Person.
  - **Dashboard:** Person-/Datums-Auswahl, Kalorien-Hero, Makro-Karten, Streak, Eintragstabelle.
  - **Add Entry:** Person/Zeit, Favorites, Recents, Suche, Kategorien, Suchergebnisse, Custom-Form.
  - **Scan:** Video-Vorschau, Start/Stop, Status, Scan-Result Card.
  - **Photo:** Bildauswahl + Preview + Copy-Prompt + Anleitung.
  - **Analytics:** Gewicht speichern, KPI-Karten (3d/7d), Range-Toggle, Canvas-Chart, letzte 7 Logs.
  - **Nutrition:** Person/Datum + Mikronährstoff-Progress-Liste.
  - **Settings:** Person CRUD + Datenmanagement (Export/Import/Delete all/Seed).
- **Dialogs:**
  - Portion-Dialog (Preset-Buttons + Gramm-Eingabe + Log/Cancel)
  - Install-Dialog (A2HS-Hinweis)

### Interaktionen / Flows
- **Tab-Klick:** toggelt aktive Screen-Section.
- **Person-/Date-Picker:** triggern Re-Render und Data-Reload.
- **Add Entry:**
  - Suche in kombiniertem Pool (Favorites/Recents/Generic),
  - Klick auf Food → Portion-Dialog,
  - Gramm validieren (>0),
  - `addEntry` speichern, danach vollständiges Reload.
- **Custom Food:** verlangt Name + nichtnegative Makro/Kcal-Werte.
- **Favorites:** Stern toggelt `favorites` Store pro Person/Food.
- **Scan:**
  - Kamera starten,
  - Barcode erkannt → Cache prüfen → OFF fetch (wenn online),
  - Produktkarte rendern,
  - „Log via portion picker“ öffnet Portion-Dialog.
- **Photo:** Bild lokal anzeigen; Prompt in Clipboard kopieren.
- **Analytics:** Gewicht validieren (>0), speichern, Trend/Insights/Chart aktualisieren.
- **Import/Export:** JSON Export als Download; Import validiert erforderliche Arrays.
- **Delete all / Delete person:** mit Confirm-Dialogen.

### Zustände
- **Empty:**
  - Keine Personen, keine Einträge, keine Weight Logs, keine Nutrition-Daten.
- **Success:**
  - Statusmeldungen bei Add/Export/Import/Delete/Weight Save.
- **Error:**
  - Alerts bei invaliden Formwerten;
  - Scan-Status bei Offline/Lookup-Fehler;
  - console.error in Catch-Blöcken.
- **Loading:**
  - Kein expliziter Spinner; asynchrones Laden passiert „still“.

### Layout / Visual / Responsive
- Mobile-first, sticky topbar + fixed bottom tabbar.
- `max-width: 900px`, safe-area Insets (`env(safe-area-inset-*)`).
- CSS-Variablen für Light/Dark Theme via `prefers-color-scheme`.
- Dashboard nutzt responsive Grids (`auto-fit` minmax).

---

## 3) Funktionskatalog

| Feature | User-Value | Hauptablauf (kurz) | Dateien/Module | Daten In/Out | Edge-Cases / Fehlerfälle |
|---|---|---|---|---|---|
| Personenverwaltung | Mehrere Nutzerprofile auf einem Gerät | Person anlegen/editieren/löschen; Tagesziele setzen | `index.html`, `ui.js`, `app.js`, `storage.js` | In: Name, kcalGoal, optionale Makros. Out: `persons` Datensätze | Leerer Name; kcal < 800; Cascade Delete entfernt abhängige Daten |
| Tagesdashboard | Schneller Überblick über Verbrauch vs. Ziel | Person+Datum wählen → Totals + Makro-Karten + Tabelle | `app.js`, `ui.js`, `storage.js` | In: entries für Datum. Out: aggregierte Totals/Prozente | Keine Person, keine Entries |
| Food Logging (Generic/Favorites/Recents) | Schnelles Loggen häufig genutzter Foods | Suche/Kategorie → Food wählen → Portion wählen → speichern | `genericfoods.js`, `app.js`, `ui.js`, `storage.js` | In: food + grams. Out: `entries`, `recents`, lastPortion meta | grams <= 0; fehlende Person |
| Quick Custom Add | Beliebige Nahrungsmittel erfassen | Name + Makros/100g + Quelle → Portion → loggen | `index.html`, `app.js` | In: custom nutrition. Out: entry mit source label | negative/NaN Werte |
| Favoriten | Wiederkehrende Foods priorisieren | Stern toggeln in Listen | `ui.js`, `app.js`, `storage.js` | In: personId+foodId. Out: `favorites` row | Race/Mehrfachklick nicht speziell debounced |
| Barcode Scan + OFF | Produktdaten aus Barcode übernehmen | Scan → Cache check → OFF lookup → Produktkarte → loggen | `scanner.js`, `offclient.js`, `app.js`, `storage.js` | In: barcode. Out: normalisiertes Produkt + Cache | Kamera permission; OFF down; offline ohne cache |
| Photo-Workflow (manuell) | Foto-basiertes Logging unterstützt ohne integrierte KI | Foto wählen → Preview → Prompt kopieren → manuell loggen | `index.html`, `app.js` | In: image file. Out: DataURL preview, clipboard text | Clipboard denied |
| Analytics (Gewicht + Trends) | Gewichtsentwicklung + Kalorienänderungen sehen | Gewicht speichern → Trend neu berechnen → KPIs + Chart | `app.js`, `storage.js`, `analyticschart.js`, `ui.js` | In: person/date/scaleWeight. Out: weightLogs + derived metrics | invalid weight/date; wenig Daten -> „Not enough data“ |
| Nutrition Overview (Mikronährstoffe) | Aggregierte Mikroaufnahme pro Tag sichtbar | Entries summieren gegen optionale Targets | `app.js`, `ui.js` | In: entry micronutrients + person targets. Out: rows mit amount/percent | keine Mikrodaten vorhanden |
| Daten-Export/Import/Reset | Portabilität und Recovery | Export JSON; Import validieren; delete-all/seed | `app.js`, `storage.js` | In/Out: komplette Stores in JSON | falsches JSON shape; Datenverlust bei delete/import |
| PWA Offline Shell | Grundfunktionen offline nutzbar | SW installiert App-Shell + cacheFirst/networkFirst | `service-worker.js`, `manifest.json`, `app.js` | Cached assets + OFF responses | Cache-Stale möglich; fetch failures |

---

## 4) Architektur & Datenfluss

### Text-Diagramm
`UI (index.html + styles.css)`
→ `Event Handler & App State (app.js)`
→ `Render Layer (ui.js)`
→ `Services (offclient.js / scanner.js / analyticschart.js)`
→ `Persistence (storage.js -> IndexedDB stores)`
→ `PWA Cache Layer (service-worker.js)`
→ `External API (Open Food Facts)`

### State-Management
- Zentraler `state`-Objekt in `app.js` (route, selectedPersonId, selectedDate, suggestions, caches, analyticsRange, etc.).
- Änderungen erfolgen über Event-Handler; anschließend meist `await loadAndRender()` als Full-Rehydration.
- Kein globales reactive framework; imperative DOM updates.

### Routing / Navigation
- Kein URL-Routing.
- Tab-basierte In-Page-Navigation via `initRoutes` (`.tab` -> `.screen.active`).

### API-Schicht / Server
- Kein eigener Backend-Server.
- Externe API: Open Food Facts `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`.
- Validierung: HTTP status + `data.status === 1` + `data.product`.

### Persistenz / Schema
IndexedDB Datenbank `macroTrackerDB` (Version 4), Stores:
- `persons` (key `id`)
- `entries` (key `id`, Indexe: byPersonDate, byPersonDateTime, byPerson)
- `productsCache` (key `barcode`)
- `favorites` (key `id`, Indexe byPerson/byPersonLabel)
- `recents` (key `id`, Indexe byPersonUsedAt/byPersonFood)
- `weightLogs` (key autoIncrement `id`, unique Index byPersonDate)
- `meta` (key `key`)

Zusatzlogik:
- `addEntry` schreibt optional in `recents` + lastPortion in `meta`.
- `addWeightLog` upsertet pro Tag/Person und berechnet 7-Tage-Trend neu.
- Import/Export arbeitet store-übergreifend.

### Auth
- Nicht vorhanden.

### Logging / Telemetry
- Kein Telemetry-System.
- Nur `console.log/error/warn` in App/Smoke-Skripten.

---

## 5) Code-Tour: 10 wichtigste Dateien

### 1. `app.js`
- **Zweck:** Haupt-Controller für State, Eventing, Feature-Orchestrierung.
- **Wichtig:** `loadAndRender`, `wireEvents`, `handleBarcodeDetected`, `handleSaveWeightLog`, `handleCustomFoodSubmit`, `logActiveFood`.
- **How it works:**
  - Initialisiert SW, bindet Events, seedet Sample-Daten bei leerer DB.
  - Hält globalen UI-State.
  - Verknüpft Storage-CRUD mit UI-Renderfunktionen.
  - Aggregiert Analytics/Nutrition-Daten.
  - Führt zahlreiche try/catch-Statuspfade für UX-Fehlermeldungen.
- **Schwachstellen:** Datei sehr groß (monolithisch), viele Verantwortlichkeiten, kaum modulare Trennung.

### 2. `storage.js`
- **Zweck:** Datenzugriff auf IndexedDB inkl. Schema, Migrationslogik, CRUD, Import/Export.
- **Wichtig:** `openDb`, `addEntry`, `addWeightLog`, `getEntriesForPersonDate`, `toggleFavorite`, `exportAllData`, `importAllData`.
- **How it works:**
  - Erstellt Stores/Indexe on upgrade.
  - Kapselt IDB Requests in Promise-Helfer.
  - Pflegt Referenzdaten (favorites/recents/meta).
  - Berechnet Trendgewicht über gleitendes 7-Tage-Fenster.
- **Schwachstellen:** keine Transaktions-Retrys; wenig Input-Schema-Validierung für Import jenseits Basic-Shape.

### 3. `ui.js`
- **Zweck:** Alle DOM-Renderings und Formularleser.
- **Wichtig:** `renderDashboard`, `renderSuggestions`, `renderScanResult`, `renderAnalyticsInsights`, `readPersonForm`.
- **How it works:**
  - Baut HTML-Strings und injiziert in Container.
  - Kapselt Status-/Picker-/Dialog-Operationen.
  - Unterstützt verschiedene Dashboard-Makroansichten.
- **Schwachstellen:** `innerHTML` mit dynamischen Werten ohne Escaping (XSS-Risiko bei externen Daten).

### 4. `index.html`
- **Zweck:** SPA-Grundstruktur mit allen Screens, Formularen, Dialogen.
- **Wichtig:** Tabbar, Screen-Sections, IDs für Query/Events.
- **How it works:**
  - Alle Views sind gleichzeitig im DOM.
  - Sichtbarkeit über CSS-Klassen.
  - `app.js` als einziges entry module.
- **Schwachstellen:** Große statische Datei; Accessibility/ARIA teils vorhanden, aber nicht vollständig systematisch.

### 5. `service-worker.js`
- **Zweck:** Offline-App-Shell und API-Caching.
- **Wichtig:** Install/Activate/Fetch Handler, `networkFirst`, `cacheFirst`.
- **How it works:**
  - Precacht wesentliche statische Assets.
  - Nutzt network-first für OFF Requests.
  - Nutzt cache-first für same-origin GETs.
- **Schwachstellen:** Kein Cache-Expiry/Versionierung pro Ressourcentyp außer globalem SW_VERSION.

### 6. `offclient.js`
- **Zweck:** OFF-API-Lookup und Nährwertnormalisierung.
- **Wichtig:** `lookupOpenFoodFacts`, `normalizePer100g`.
- **How it works:**
  - Holt Produktjson per Barcode.
  - Mappt kcal/kJ sowie Makros/Mikros in internes per100g-Schema.
- **Schwachstellen:** Kein Timeout/AbortController; kein Rate-limit/retry.

### 7. `scanner.js`
- **Zweck:** Kamera-Barcodescan (ZXing via CDN).
- **Wichtig:** `startBarcodeScanner`, `stopBarcodeScanner`.
- **How it works:**
  - Dynamischer Import von ZXing.
  - Decode-Callback mit Debounce-artigem `handlingResult`.
- **Schwachstellen:** Abhängigkeit von externem CDN zur Laufzeit; Offline/Firewall-anfällig.

### 8. `analyticschart.js`
- **Zweck:** Zeichnet Analytics-Linien auf Canvas.
- **Wichtig:** `drawWeeklyAnalyticsChart`.
- **How it works:**
  - Berechnet Bounds je Serie.
  - Zeichnet drei Linien (Calories/Scale/Trend).
  - Rendert Datumsticks und Legendenlabels.
- **Schwachstellen:** Keine Interaktion/Tooltips; fixe Höhe; keine High-DPI-Skalierung explizit.

### 9. `genericfoods.js`
- **Zweck:** Built-in Food-Katalog.
- **Wichtig:** `genericFoods` Export.
- **How it works:**
  - Definiert Basiseinträge + Kategorie-Mapping.
  - Ergänzt jedes Item um `category`.
- **Schwachstellen:** Statische Datenpflege in Code; potenzielle Mapping-Lücken/Inkonsistenzen.

### 10. `playwright/smoke-offline.mjs`
- **Zweck:** E2E-Smoketest für Offline-Analytics-Verhalten.
- **Wichtig:** `runWebkitChecks`, `runChromiumOfflineCheck`.
- **How it works:**
  - Öffnet App, schreibt Weight Logs (auch offline), prüft resultierendes UI-Element.
  - WebKit als autoritative iOS-Näherung.
- **Schwachstellen:** Nur begrenzte Flows; assertions primär indirekt über console output.

---

## 6) Qualität: Tests, Security, Performance, Reliability

### Tests
- Vorhanden:
  - Unit-Tests nur für `math.js` (4 Testfälle).
  - Playwright-Smoke für offline Weight-Logging.
- Grobe Abdeckung:
  - Core-Domain-/UI-/Storage-Logik weitgehend ungetestet.
- Fehlend:
  - Tests für `storage.js` (Import/Export, Cascade, Trend).
  - UI-Rendering/Interaction-Tests.
  - OFF/Scanner Mock-Tests.

### Security
- Risiken:
  - **XSS-Risiko:** viele `innerHTML`-Renderings mit dynamischen Strings (z. B. Produktname/brand von externer API).
  - Kein Auth (bei lokaler App erwartbar), aber somit auch keine Multi-User-Isolation.
  - Kein CSP erkennbar.
- Positiv:
  - Keine Secrets im Repo sichtbar.
  - Eingaben teilweise numerisch validiert.

### Performance
- Mögliche Bottlenecks:
  - Häufiges Full-Reload (`loadAndRender`) nach vielen Interaktionen.
  - Viele sequenzielle IndexedDB-Reads in Schleifen.
  - String-basierte Full-DOM-Replacement via `innerHTML`.
- Optimierungen:
  - Selektive Re-Render statt global.
  - Caching/Memoizing für wiederholte Tagesabfragen.
  - Debounce für Eingabe-/Filterpfade bei großen Datenmengen.

### Reliability
- Vorhanden:
  - Fehlerbehandlung mit Alerts/Statusmeldungen in wichtigen Flows.
  - OFF cache fallback + Offline-Hinweise.
  - Playwright Preflight erkennt fehlende Browser-Binaries.
- Fehlend:
  - Netzwerk-Timeouts/Retry im OFF-Client.
  - Striktere Import-Validierung (Schema/Typen/Timestamps).

---

## 7) TODOs & Improvements (priorisiert)

### P0
1. **XSS-Härtung in Render-Layer**
   - Impact: hoch (Sicherheit + Vertrauen).
   - Änderung: Escape/DOM-Node-basiertes Rendering statt direktem `innerHTML` bei externen/benutzereingaben.
   - Wo: `ui.js` (nahezu alle `render*` Funktionen), Teile `app.js` (Statusmeldungen/Labels).
   - Aufwand: **M**; Risiko: **M** (UI-Refactor).

2. **Modularisierung von `app.js`**
   - Impact: hoch (Wartbarkeit/Onboarding/Testbarkeit).
   - Änderung: Aufspalten in Module: `features/analytics`, `features/add`, `features/scan`, `bootstrap`.
   - Wo: `app.js` komplett.
   - Aufwand: **L**; Risiko: **M**.

3. **Import-Validation robust machen**
   - Impact: hoch (Datenintegrität).
   - Änderung: JSON-Schema-artige Checks (Typen, Pflichtfelder, Wertebereiche).
   - Wo: `app.js:handleImportDataFile`, `storage.js:importAllData`.
   - Aufwand: **M**; Risiko: **Niedrig-Mittel**.

### P1
4. **Storage-/Domain-Tests erweitern**
   - Impact: mittel-hoch.
   - Änderung: Tests für addEntry, favorites, recents, weight trend, import/export.
   - Wo: neue `*.test.js` neben `storage.js`/`app`-nahen Utilities.
   - Aufwand: **M**; Risiko: **Niedrig**.

5. **OFF-Client mit Timeout + Retry**
   - Impact: mittel (Zuverlässigkeit bei Netzproblemen).
   - Änderung: `AbortController`, begrenzte Retries, differenzierte Fehlermeldungen.
   - Wo: `offclient.js`, Fehlerpfade in `app.js`.
   - Aufwand: **S-M**; Risiko: **Niedrig**.

6. **Incremental Rendering statt Full Re-Render**
   - Impact: mittel (Performance/UI-Reaktivität).
   - Änderung: Teilbereiche gezielt neu rendern.
   - Wo: `app.js` (`loadAndRender` Aufrufer), `ui.js`.
   - Aufwand: **L**; Risiko: **M**.

### P2
7. **Telemetry/Debug-Observability optional**
   - Impact: mittel (Support/Diagnose).
   - Änderung: strukturiertes Client-Event-Logging optional togglebar.
   - Wo: `app.js`, ggf. neues Modul.
   - Aufwand: **S-M**; Risiko: **Niedrig**.

8. **Static Food Catalog aus JSON auslagern**
   - Impact: mittel (Pflege).
   - Änderung: Daten in JSON + Validierung beim Laden.
   - Wo: `genericfoods.js`.
   - Aufwand: **S**; Risiko: **Niedrig**.

### Quick Wins
- `console.error` konsolidieren in helper + userfreundlichere Fehlertexte.
- Accessibility-Feinschliff (z. B. Labels/ARIA für dynamische Bereiche).
- `README`-Pfade aktualisieren (`src/...` Referenzen stimmen nicht mit Root-Dateien überein).

---

## 8) FINAL OUTPUT: PROJECT BRIEF FOR ANOTHER AI

[PROJECT BRIEF]
Name: Macro Tracker PWA
One-liner: Privacy-first, frameworklose PWA zum Tracken von Kalorien, Makros, Gewicht und (teilweise) Mikronährstoffen pro Person auf einem Gerät.
Zielgruppe: Einzelpersonen/Haushalte, die auf iPhone/Safari oder generell im Browser Ernährungs-Tracking lokal nutzen wollen.
Kernproblem: Einfaches, offline-fähiges Ernährungs- und Fortschrittstracking ohne Backend und ohne Cloud-Zwang.
Wichtigste Features (Bulletpoints):
- Multi-Person-Profilverwaltung (kcal-Ziel + optionale Makroziele)
- Daily Dashboard mit Kalorienfortschritt, Makroansichten, Logging-Streak
- Food Logging über Built-in-Lebensmittel, Recents, Favorites und Custom-Einträge
- Barcode-Scan (ZXing) + Open Food Facts Lookup mit lokalem Produktcache
- Photo-Workflow (manuell): Bildvorschau + ChatGPT-Prompt kopieren
- Analytics: Gewichtseinträge, 3/7-Tages-Änderungen, Canvas-Chart inkl. Trendgewicht
- Nutrition Overview: Summierte Mikronährstoffe gegen optionale Ziele
- Datenmanagement: Export/Import JSON, Delete-all, Seed-Daten
- PWA mit Service Worker Offline-Shell und Caching
User-Flows (nummeriert):
1) App öffnen → ggf. Sample-Daten vorhanden → Person im Persons/Dashboard sehen.
2) In Settings Person anlegen/ändern/löschen.
3) In Add Entry Food suchen/auswählen → Portion wählen → Eintrag speichern.
4) Optional per Barcode scannen → Produktdaten laden/cachen → per Portion loggen.
5) Optional Foto aufnehmen/auswählen → Prompt kopieren → manuelles Logging.
6) In Analytics Gewicht speichern → KPIs + Chart + letzte Logs prüfen.
7) In Nutrition Tages-Mikronährstoffübersicht prüfen.
8) Daten exportieren/importieren oder zurücksetzen.
Tech-Stack:
- Vanilla JS (ES Modules), HTML, CSS
- IndexedDB (Client-only storage)
- Service Worker + Web App Manifest (PWA)
- Open Food Facts API (extern)
- ZXing Browser (CDN import)
- Node.js test runner + Playwright smoke scripts
Repo-Struktur (Bulletpoints):
- `index.html`: Alle Screens/Tabs/Dialoge
- `app.js`: Main controller/state/event orchestration
- `ui.js`: Render-/Form-Helpers
- `storage.js`: IndexedDB schema + CRUD + import/export
- `offclient.js`: OFF API client + nutrition normalization
- `scanner.js`: camera barcode scanning
- `analyticschart.js`: canvas chart rendering
- `service-worker.js` + `manifest.json`: PWA/offline
- `genericfoods.js`: built-in food catalog
- `playwright/`, `scripts/`, `math.test.js`: testing/tooling
Wichtige Module (Bulletpoints):
- State + orchestration: `app.js`
- Rendering: `ui.js`
- Persistence: `storage.js`
- External data integration: `offclient.js`
- Device integration: `scanner.js`
- Offline runtime: `service-worker.js`
Datenmodelle / Storage:
- DB: `macroTrackerDB` (IndexedDB v4)
- Stores: `persons`, `entries`, `productsCache`, `favorites`, `recents`, `weightLogs`, `meta`
- Entry fields: personId, date/time, foodId/name, grams, kcal/p/c/f, optionale Mikronährstoffe, source
- WeightLog fields: personId, date, scaleWeight, trendWeight
- Import/Export JSON über alle Stores
APIs/Endpoints:
- `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Keine eigenen Backend-Endpoints
Build & Run:
- `npm install`
- Statischer Server, z. B. `python3 -m http.server 8080`
- Öffnen: `http://localhost:8080`
Tests:
- Unit: `npm test` (math helpers)
- Smoke: `npm run smoke:offline` (Playwright; WebKit primär)
Known Issues / Tech Debt:
- Monolithisches `app.js`
- Geringe Testabdeckung außerhalb math/smoke
- Viele `innerHTML`-Renderings mit potenziellem XSS-Risiko
- OFF client ohne timeout/retry
- README enthält teils veraltete `src/...`-Pfadangaben
Constraints (z.B. iOS16, Node-Version, etc.):
- Ausgelegt auf statisches Hosting und Browser-Features (IndexedDB, SW)
- iPhone/Safari/PWA-Install berücksichtigt (iOS standalone UX)
- Barcode-Scan hängt von Kamera-Rechten und CDN-Zugriff ab
- Playwright Browser-Binaries können in restriktiven Umgebungen blockiert sein
Improvement Backlog (P0/P1/P2):
- P0: XSS-Härtung im Rendering; `app.js` modularisieren; Import-Validierung vertiefen
- P1: Tests für storage/domain erweitern; OFF timeout/retry; inkrementelles Rendering
- P2: optionale Telemetry; generic food data aus Code in JSON auslagern
Open Questions (wenn Repo nicht genug Info liefert):
- Unklar/Annahme: Gibt es produktive Hosting-/Release-Pipeline? (CI/CD-Dateien fehlen)
- Unklar/Annahme: Soll Multi-Device-Sync unterstützt werden? (kein Backend vorhanden)
- Unklar/Annahme: Gewünschte Datenschutz-/Compliance-Anforderungen (keine Policy-Dateien vorhanden)
[/PROJECT BRIEF]
