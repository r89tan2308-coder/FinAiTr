# Progress

## 2026-06-03: Phase 0 started

### Completed

- Inspected the repository.
- Read `AGENTS.md`.
- Read `finance_ai_tracker_codex_plan_ru.md`.
- Confirmed that `docs/finance_ai_tracker_codex_plan_ru.md` does not exist and the plan file is at the repo root.
- Confirmed the repository has no app scaffold yet.
- Confirmed required project docs were missing before Phase 0.
- Added Phase 0 planning docs:
  - `PRODUCT_SPEC.md`
  - `ARCHITECTURE.md`
  - `PLAN.md`
  - `IMPLEMENT.md`
  - `PROGRESS.md`
  - `DECISIONS.md`

### Repository state found

- Existing files before Phase 0:
  - `AGENTS.md`
  - `finance_ai_tracker_codex_plan_ru.md`
- No `package.json`.
- No `src`.
- No Git repository metadata in this folder.

### Validation commands and results

```powershell
Get-ChildItem -Force
```

Result: succeeded. Listed only `AGENTS.md` and `finance_ai_tracker_codex_plan_ru.md` before Phase 0 docs were added.

```powershell
rg --files
```

Result: succeeded. Listed only `finance_ai_tracker_codex_plan_ru.md` and `AGENTS.md` before Phase 0 docs were added.

```powershell
git status --short --branch
```

Result: failed because this folder is not a Git repository.

```powershell
Test-Path PLAN.md
Test-Path PROGRESS.md
Test-Path ARCHITECTURE.md
Test-Path DECISIONS.md
```

Result: all returned `False` before Phase 0 docs were added.

```powershell
rg --files
```

Result: succeeded after Phase 0 docs were added. Listed:

- `PROGRESS.md`
- `PRODUCT_SPEC.md`
- `PLAN.md`
- `IMPLEMENT.md`
- `finance_ai_tracker_codex_plan_ru.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

```powershell
Get-ChildItem -Force
```

Result: succeeded after Phase 0 docs were added. Confirmed all six Phase 0 docs exist at the repository root.

```powershell
Get-Content -Raw PLAN.md
Get-Content -Raw DECISIONS.md
```

Result: succeeded. Confirmed first-MVP scope is limited to manual transactions, pasted receipt text parsing, receipt review, recurring expenses, and dashboard analytics.

```powershell
Test-Path package.json
Test-Path src
```

Result: both returned `False`; application scaffolding has not started.

```powershell
git status --short --branch
```

Result: failed because this folder is still not a Git repository.

### Validation not applicable yet

The following commands are not available yet because the app has not been scaffolded and there is no `package.json`:

```powershell
npm install
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

### Next step

Phase 1: scaffold the React + TypeScript + Vite mobile-first PWA shell with placeholder pages and validation scripts.

## 2026-06-03: Phase 1 completed

### Completed

- Created a React + TypeScript + Vite app scaffold.
- Added npm scripts for dev, typecheck, lint, test, build, and preview.
- Added a mobile-first app shell with top header, desktop side navigation, and mobile bottom navigation.
- Added placeholder screens using mock data only:
  - Dashboard
  - Transactions
  - Receipts
  - Recurring
  - Categories
  - Settings
- Added PWA metadata:
  - `public/manifest.webmanifest`
  - `public/favicon.svg`
  - `public/app-icon.svg`
- Added ESLint flat config.
- Added Vitest + Testing Library smoke test for app navigation.
- Added `.gitignore` for dependency, build, and temporary log output.
- Adjusted mobile bottom navigation labels to avoid truncation at 390 px width.
- Updated `ARCHITECTURE.md` with the implemented Phase 1 source layout.
- Updated `DECISIONS.md` with Phase 1 navigation and styling decisions.

### Files added

- `package.json`
- `package-lock.json`
- `.gitignore`
- `index.html`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.js`
- `eslint.config.js`
- `public/favicon.svg`
- `public/app-icon.svg`
- `public/manifest.webmanifest`
- `src/main.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`
- `src/app/App.tsx`
- `src/app/App.test.tsx`
- `src/app/routes.ts`
- `src/components/AppShell.tsx`
- `src/components/MetricTile.tsx`
- `src/components/PageSection.tsx`
- `src/components/ProgressBar.tsx`
- `src/data/mockData.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/TransactionsPage.tsx`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/RecurringPage.tsx`
- `src/pages/CategoriesPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/test/setup.ts`

### Validation commands and results

```powershell
npm install
```

Result: succeeded. Installed project dependencies and created `package-lock.json`. npm reported 5 audit findings in the full dependency tree.

```powershell
npm run typecheck
```

Initial result: failed because `@testing-library/user-event` was used but not declared, and the first combined Vite/Vitest config typed the `test` block incorrectly.

Fixes:

- Added `@testing-library/user-event`.
- Split test config into `vitest.config.js`.
- Kept `vite.config.ts` focused on Vite build config.

Final result: succeeded.

```powershell
npm run lint
```

Result: succeeded.

```powershell
npm run test -- --run
```

Initial result inside sandbox: failed with `spawn EPERM` while Vitest tried to start its local transform worker.

Final result with approved escalation: succeeded. 1 test file passed, 1 test passed.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

Result after the mobile navigation label adjustment: all succeeded. `npm run test -- --run` passed 1 test file and 1 test. npm printed a warning that `--run` is an unknown npm CLI config in this npm version, but the Vitest run completed successfully.

```powershell
npm audit --omit=dev
```

Result: succeeded. Found 0 production dependency vulnerabilities. The 5 npm audit findings reported by `npm install` are in dev tooling.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities in the installed dependency tree.

```powershell
npm run dev -- --port 5173
```

Initial sandboxed dev-server attempt failed with `spawn EPERM` while Vite tried to start esbuild.

Final result with approved escalation through `Start-Process`: succeeded. Port `5173` was already occupied, so Vite started at `http://127.0.0.1:5174/`.

Browser verification:

- Opened `http://127.0.0.1:5174/` in the in-app browser.
- Confirmed the Dashboard heading rendered.
- Confirmed Receipts navigation was present.
- Tested a 390 x 844 mobile viewport.
- Navigated to Receipts.
- Confirmed the Receipts heading and Receipt inbox rendered.
- Confirmed mobile bottom navigation labels `Home`, `Spend`, and `Bills` rendered without truncation.

### Scope notes

- No real bank API integration was added.
- No bank credentials are stored.
- No Google Drive integration was added.
- No OCR API or OCR key was added.
- No crypto or brokerage integration was added.
- No payment execution was added.
- All screen data is mock-only.

### Next step

Phase 2: add local-first domain models and repository/service boundaries for accounts, transactions, receipts, receipt items, categories, and recurring expenses.

## 2026-06-03: Phase 2 completed

### Completed

- Added Dexie for local IndexedDB persistence.
- Added TypeScript domain models for:
  - accounts
  - transactions
  - receipts
  - receipt items
  - categories
  - recurring expenses
- Replaced direct component mock imports with seed-shaped domain data in `src/data/seedData.ts`.
- Added `FinanceSnapshot` as the app-level data bundle.
- Added Dexie database schema in `src/persistence/db.ts`.
- Added `financeRepository` for seeding and reading local data.
- Added `financeDataService` as the UI-facing data service.
- Added seed fallback behavior for test/non-browser environments.
- Refactored screens to consume service-loaded data:
  - Dashboard derives metrics from `FinanceOverview`.
  - Transactions uses local transactions and category names.
  - Receipts uses local receipts and receipt item counts.
  - Recurring uses local recurring expenses.
  - Categories uses local categories and category spending.
  - Settings reports storage mode and record count.
- Added domain helper tests for finance overview calculations and recurring monthly normalization.
- Updated `ARCHITECTURE.md`.
- Updated `DECISIONS.md`.

### Files added

- `src/domain/models.ts`
- `src/domain/financeViews.ts`
- `src/domain/financeViews.test.ts`
- `src/data/seedData.ts`
- `src/persistence/db.ts`
- `src/persistence/repositories/financeRepository.ts`
- `src/services/financeDataService.ts`

### Files removed

- `src/data/mockData.ts`

### Files updated

- `package.json`
- `package-lock.json`
- `src/app/App.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/TransactionsPage.tsx`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/RecurringPage.tsx`
- `src/pages/CategoriesPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/styles.css`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
npm install dexie
```

Result: succeeded. Installed Dexie and updated `package-lock.json`. npm install printed an audit summary, but `npm audit` later reported 0 vulnerabilities.

```powershell
npm run typecheck
```

Initial result: failed because the first Dexie transaction call passed too many table arguments for the installed TypeScript overload.

Fix:

- Switched `financeDb.transaction` to Dexie's array-of-tables form.

Final result: succeeded.

```powershell
npm run lint
```

Result: succeeded.

```powershell
npm run test -- --run
```

Result: succeeded. 2 test files passed, 4 tests passed. npm printed the same warning that `--run` is an unknown npm CLI config in this npm version, but Vitest completed successfully.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

Final rerun after documentation cleanup: all succeeded. 2 test files passed, 4 tests passed.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

Browser verification:

- Opened `http://127.0.0.1:5174/` in the in-app browser.
- Confirmed Dashboard rendered.
- Confirmed seeded June spend `$145.49` rendered.
- Navigated to Settings.
- Confirmed Settings rendered.
- Confirmed storage mode displayed `IndexedDB`.

### Scope notes

- No manual transaction CRUD was added.
- No receipt parser was added.
- No receipt review flow was added.
- No real bank API integration was added.
- No bank credentials are stored.
- No Google Drive integration was added.
- No OCR API or OCR key was added.
- No crypto or brokerage integration was added.
- No payment execution was added.

### Next step

Phase 3: add manual transaction create, edit, delete, filtering, validation, and dashboard refresh through the existing service/repository boundary.

## 2026-06-03: Phase 3 completed

### Completed

- Added manual transaction create, edit, and delete repository methods.
- Added transaction write actions to `financeDataService`.
- Kept write flow inside the service/repository boundary:
  - UI calls service action.
  - Service calls repository write.
  - Repository writes to Dexie/IndexedDB.
  - Service reloads the finance snapshot.
  - Dashboard and screens rerender from the refreshed snapshot.
- Added transaction form validation:
  - date is required;
  - amount must be greater than zero;
  - currency is required;
  - account is required;
  - merchant or note is required.
- Added manual transaction form to Transactions:
  - date
  - amount
  - currency
  - merchant
  - account
  - category
  - note
  - tags
- Added transaction editing.
- Added delete confirmation.
- Added transaction filters:
  - text search
  - exact date
  - category
- Added transaction sorting:
  - newest
  - oldest
  - amount high
  - amount low
- Added loading, action error, validation error, and empty-filter states.
- Added `fake-indexeddb` for repository tests.
- Added tests for transaction validation.
- Added repository CRUD test covering create, update, delete, and dashboard recalculation from persisted data.
- Verified in browser that create changes Dashboard total, edit persists after refresh, and delete removes the row.
- Updated `ARCHITECTURE.md`.
- Updated `DECISIONS.md`.

### Files added

- `src/domain/transactionValidation.ts`
- `src/domain/transactionValidation.test.ts`
- `src/persistence/repositories/financeRepository.test.ts`

### Files updated

- `package.json`
- `package-lock.json`
- `src/app/App.tsx`
- `src/pages/TransactionsPage.tsx`
- `src/persistence/repositories/financeRepository.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`
- `src/test/setup.ts`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
npm install -D fake-indexeddb
```

Result: succeeded. Added test-only IndexedDB implementation for Vitest repository tests.

```powershell
npm run typecheck
```

Result: succeeded.

```powershell
npm run lint
```

Result: succeeded.

```powershell
npm run test -- --run
```

Initial result: failed because the repository test reset deleted the Dexie database and left the shared instance closed.

Fix:

- Reopened `financeDb` after `financeDb.delete()` in the repository test setup.

Final result: succeeded. 4 test files passed, 8 tests passed. npm printed the existing `--run` warning, but Vitest completed successfully.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

Browser verification:

- Opened `http://127.0.0.1:5174/`.
- Navigated to Transactions.
- Created a manual transaction dated `2026-06-15`.
- Confirmed Dashboard monthly spend changed from `$145.49` to `$153.26`.
- Edited the transaction amount and merchant.
- Reloaded the app.
- Confirmed the edited transaction remained visible after refresh, proving IndexedDB persistence.
- Deleted the edited transaction through the confirm step.
- Confirmed the edited transaction row was removed.
- Rechecked Account and Category form controls by accessible label.

### Scope notes

- No receipt parser was added.
- No receipt review flow was added.
- No OCR was added.
- No Google Drive integration was added.
- No real bank API integration was added.
- No bank credentials are stored.
- No crypto or brokerage integration was added.
- No auth or cloud sync was added.
- The current `Transaction` model has no direct expense/income type field, so Phase 3 does not expose a separate transaction type control.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The folder is still not initialized as a Git repository, so `git add` and `git commit` are not available until Git is initialized.

### Next step

Phase 4: implement pasted receipt text parsing with deterministic local parsing, category/tag guessing, parser warnings, fixtures, and tests. Do not add OCR or LLM provider calls.

## 2026-06-03: Phase 4A completed

### Completed

- Added deterministic receipt text parser core.
- Added parser output types for:
  - parsed receipt draft;
  - parsed receipt item;
  - line kind;
  - item flags;
  - parser options.
- Parser input is pasted raw receipt text.
- Parser output includes:
  - preserved raw text;
  - merchant name when detectable;
  - receipt date when detectable;
  - detected currency or safe default `USD`;
  - total amount when detectable;
  - line items with raw line, raw name, normalized name, quantity, unit price, total price, category suggestion, tags, confidence, kind, and flags;
  - parser warnings.
- Added local heuristic category guessing for groceries, dairy, alcohol, medicine, games, software, and gym.
- Unknown products are categorized as `uncategorized`.
- Discounts, taxes, and fees are preserved as parsed lines.
- Unclear lines are preserved as warnings.
- Mismatched item sum and receipt total produces a warning.
- Added parser fixtures:
  - simple grocery receipt;
  - receipt with discount, tax, and unclear line;
  - receipt where total does not match item sum;
  - receipt with unknown/uncategorized item.
- Added parser tests for all required scenarios.
- Added small service wrapper `parsePastedReceiptText`.
- Added service wrapper test.
- Updated `ARCHITECTURE.md`.
- Updated `DECISIONS.md`.

### Files added

- `src/receipt-parser/types.ts`
- `src/receipt-parser/categoryGuessing.ts`
- `src/receipt-parser/parser.ts`
- `src/receipt-parser/fixtures.ts`
- `src/receipt-parser/parser.test.ts`
- `src/services/receiptParserService.ts`
- `src/services/receiptParserService.test.ts`

### Files updated

- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
npm run test -- --run src/receipt-parser/parser.test.ts
```

Initial parser-focused result after heuristic fixes: succeeded. 1 test file passed, 4 tests passed. npm printed warnings about CLI argument parsing and the existing `--run` warning, but Vitest completed successfully.

```powershell
npm run typecheck
```

Result: succeeded.

```powershell
npm run lint
```

Initial result: failed because `parseReceiptLine` kept an unused `currency` parameter.

Fix:

- Removed the unused parser parameter.

Final result: succeeded.

```powershell
npm run test -- --run
```

Initial result: failed in parser tests due to three heuristic issues:

- merchant line was preserved as an unclear warning;
- `fee` matched inside `Coffee`;
- discount and tax lines were treated as metadata and skipped.

Fixes:

- Skipped detected merchant/date metadata before line parsing.
- Changed keyword matching to word-boundary style matching.
- Allowed discount, tax, and fee lines to be parsed even when their names contain metadata keywords.
- Lowered uncategorized confidence so unknown products are flagged for review.

Final result: succeeded. 6 test files passed, 13 tests passed. npm printed the existing `--run` warning, but Vitest completed successfully.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Scope notes

- No receipt parser UI was added.
- No receipt drafts are persisted yet.
- No parsed receipt data affects Dashboard yet.
- No transactions are auto-created from receipts.
- No receipt review flow was added.
- No OCR was added.
- No image upload was added.
- No Google Drive integration was added.
- No real AI/LLM API calls were added.
- No real bank API integration was added.
- No bank credentials are stored.
- No crypto or brokerage integration was added.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The parser is heuristic MVP logic. It handles the tested formats but is not a general OCR/AI extractor.
- The folder is still not initialized as a Git repository, so `git add` and `git commit` are not available until Git is initialized.

### Next step

Phase 4B: add pasted receipt text intake UI that calls `parsePastedReceiptText`, displays parsed draft data, warnings, confidence, and item flags, but still does not confirm receipts or affect dashboard analytics until the review/confirm phase.

## 2026-06-03: Phase 4B completed

### Completed

- Added pasted receipt text intake to the Receipts screen.
- Added a `Parse receipt` action that calls `parsePastedReceiptText` from `receiptParserService`.
- Added a local `Use sample` helper using the existing parser fixture.
- Added a `Clear` action that resets pasted text, parser errors, and preview state.
- Removed the old inert `Add receipt` toolbar control so Phase 4B does not imply receipt persistence.
- Added empty, loading, and error states for parser preview.
- Added structured parsed receipt preview for:
  - merchant;
  - date;
  - currency;
  - total;
  - receipt confidence;
  - parser warnings;
  - line items.
- Added mobile item cards showing:
  - raw item name;
  - normalized item name;
  - quantity;
  - unit price;
  - total price;
  - category suggestion;
  - confidence;
  - flags;
  - tags;
  - raw line.
- Kept parsed receipt preview data in component state only.
- Added receipt screen behavior tests for empty validation, sample parsing, mismatch warnings, and clearing preview state.
- Verified in browser at a 390 x 844 viewport that preview cards render, no horizontal overflow exists, and Dashboard remains unaffected.
- Updated `ARCHITECTURE.md`.
- Updated `DECISIONS.md`.

### Files added

- `src/pages/ReceiptsPage.test.tsx`

### Files updated

- `src/pages/ReceiptsPage.tsx`
- `src/styles.css`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
npm run typecheck
```

Result: succeeded.

```powershell
npm run lint
```

Result: succeeded.

```powershell
npm run test -- --run
```

Initial result: failed in the new Receipts screen tests because the test DOM was not cleaned between renders and two assertions expected unique text where multiple matching UI nodes were valid.

Fixes:

- Added `cleanup()` after each test in `src/pages/ReceiptsPage.test.tsx`.
- Changed duplicate-text assertions to accept multiple valid matches for repeated category and merchant labels.

Final result: succeeded. 7 test files passed, 17 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version, but Vitest completed successfully.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

Final rerun after removing the inert `Add receipt` control:

- `npm run typecheck`: succeeded.
- `npm run lint`: succeeded.
- `npm run test -- --run`: succeeded. 7 test files passed, 17 tests passed. npm printed the existing `--run` warning.
- `npm run build`: succeeded.
- `npm audit`: succeeded. Found 0 vulnerabilities.

### Browser verification

- Confirmed the dev server responds at `http://127.0.0.1:5174/`.
- Opened the app in the in-app browser.
- Set a temporary 390 x 844 viewport.
- Navigated to Receipts.
- Clicked `Use sample`.
- Clicked `Parse receipt`.
- Confirmed parser preview displayed:
  - `GREEN MARKET`;
  - `No parser warnings.`;
  - 3 parsed item cards;
  - `Cottage cheese`.
- Rechecked the mobile toolbar after cleanup and confirmed only `Parse receipt`, `Use sample`, and `Clear` are available.
- Confirmed there was no horizontal overflow at 390 px width.
- Navigated back to Dashboard after parsing.
- Confirmed monthly spend still displayed `$145.49`.
- Confirmed the parsed sample merchant was not shown on Dashboard.
- Reset the temporary viewport override.

### Scope notes

- No OCR was added.
- No image upload was added.
- No Google Drive integration was added.
- No real AI/LLM API calls were added.
- No real bank API integration was added.
- No bank credentials are stored.
- No crypto or brokerage integration was added.
- No parsed receipt draft persistence was added.
- No transaction is created from parsed receipts.
- Parsed receipt preview data does not affect Dashboard analytics.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The parser preview is non-persistent by design. Refreshing or navigating away from Receipts loses the pasted preview until Phase 5 adds a review/confirm flow.
- The folder is still not initialized as a Git repository, so `git add` and `git commit` are not available until Git is initialized.

### Next step

Phase 5: add receipt review and confirmation so parsed drafts can be edited by the user, then explicitly confirmed before persistence, transaction linking, or dashboard item analytics.
