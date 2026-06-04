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

## 2026-06-03: Phase 5A completed

### Completed

- Confirmed the folder is now a Git repository on branch `master`.
- Added dedicated local-first receipt draft models:
  - `ReceiptDraft`
  - `ReceiptDraftItem`
  - `ReceiptDraftStatus`
  - draft item flags and line kind types.
- Added separate Dexie v2 tables:
  - `receiptDrafts`
  - `receiptDraftItems`
- Added repository methods for:
  - saving receipt drafts;
  - listing receipt draft records;
  - getting a receipt draft by id;
  - deleting a receipt draft and its draft items.
- Added service methods for:
  - saving a parsed receipt draft and reloading app data;
  - listing receipt drafts;
  - getting a receipt draft by id;
  - deleting a receipt draft and reloading app data.
- Updated App wiring so receipt draft actions go through `financeDataService`.
- Updated Receipts screen so parsed preview can be saved as a persisted draft.
- Added a simple saved drafts list on Receipts.
- Added two-step delete confirmation for saved drafts.
- Kept saved receipt drafts separate from `receipts`, `receiptItems`, transactions, and Dashboard analytics.
- Added persistence tests proving drafts save/list/get/delete through repository and service boundaries.
- Added Receipts screen tests for save and delete UI behavior.
- Updated `ARCHITECTURE.md`.
- Updated `DECISIONS.md`.

### Files updated

- `src/domain/models.ts`
- `src/data/seedData.ts`
- `src/persistence/db.ts`
- `src/persistence/repositories/financeRepository.ts`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/services/financeDataService.ts`
- `src/app/App.tsx`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/ReceiptsPage.test.tsx`
- `src/styles.css`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
npm run typecheck
```

Initial result: failed because `ReceiptsPage.test.tsx` still rendered `ReceiptsPage` without the new draft props.

Fix:

- Updated the test helper to pass `receiptDrafts`, `receiptDraftItems`, `onSaveDraft`, and `onDeleteDraft`.
- Added typed draft fixtures and typed mock callbacks.

Final result: succeeded.

```powershell
npm run lint
```

Initial result: failed because a typed mock callback parameter in `ReceiptsPage.test.tsx` was unused.

Fix:

- Used the mock parameter as part of the mock result.

Final result: succeeded.

```powershell
npm run test -- --run
```

Result: succeeded. 7 test files passed, 21 tests passed. npm printed the existing `--run` warning.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Confirmed the dev server responded at `http://127.0.0.1:5174/`.
- Opened the app in the in-app browser.
- Set a temporary 390 x 844 viewport.
- Captured Dashboard monthly spend before saving a draft: `$145.49`.
- Navigated to Receipts.
- Used `Use sample`, then `Parse receipt`, then `Save draft`.
- Confirmed `Draft saved.` appeared.
- Confirmed saved draft list contained `GREEN MARKET`.
- Confirmed saved draft row count changed from `0` to `1`.
- Reloaded the page.
- Navigated back to Receipts.
- Confirmed the saved draft persisted after reload with row count still `1`.
- Navigated to Dashboard.
- Confirmed monthly spend remained `$145.49`.
- Returned to Receipts.
- Deleted the saved draft through `Delete draft` then `Confirm delete`.
- Confirmed `Draft deleted.` appeared and saved draft row count returned to `0`.
- Confirmed no horizontal overflow at 390 px width.
- Reset the temporary viewport override.

### Scope notes

- No transactions are created from receipt drafts.
- Receipt drafts do not affect Dashboard.
- Receipt drafts are not written into `receipts` or `receiptItems`.
- No OCR was added.
- No image upload was added.
- No Google Drive integration was added.
- No real AI/LLM API calls were added.
- No real bank API integration was added.
- No bank credentials are stored.
- No crypto or brokerage integration was added.
- The parser was not rewritten.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Phase 5A persists drafts but does not provide a review/edit screen yet.
- Draft status values include `reviewed` and `confirmed` for forward compatibility, but the current UI only creates `draft` records.

### Next step

Phase 5B: add receipt draft review/edit UI, then explicit confirmation that promotes a reviewed draft into confirmed receipt data and links or creates a transaction without double-counting.

## 2026-06-03: Manual local currency conversion added

### Completed

- Added manual local currency settings for USD, RUB, EUR, and GBP.
- Seeded default local rates to RUB from Bank of Russia official rates for 2026-06-03:
  - USD: 72.5597 RUB
  - RUB: 1
  - EUR: 84.6096 RUB
  - GBP: 97.4985 RUB
- Added `CurrencySettings` to the local finance snapshot.
- Stored persisted currency settings in Dexie `appMeta`.
- Added Settings controls for:
  - display currency;
  - USD to RUB rate;
  - EUR to RUB rate;
  - GBP to RUB rate.
- Updated Dashboard, Transactions, Receipts, Recurring, and Categories to display amounts in the selected display currency.
- Updated transaction amount sorting to compare converted display amounts.
- Kept live exchange-rate fetching and online FX providers out of scope.
- Updated `PLAN.md`, `ARCHITECTURE.md`, and `DECISIONS.md` for the manual FX scope.

### Files added

- `src/domain/currencySettings.ts`
- `src/domain/currencySettings.test.ts`

### Files updated

- `PLAN.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/data/seedData.ts`
- `src/domain/financeViews.ts`
- `src/domain/financeViews.test.ts`
- `src/domain/models.ts`
- `src/pages/CategoriesPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ReceiptsPage.test.tsx`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/RecurringPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/TransactionsPage.tsx`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/persistence/repositories/financeRepository.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`

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

Initial result: failed because two tests expected conversion after aggregating USD totals, while the implementation converts and rounds each record before summing. The test expectations were corrected to match the mixed-currency aggregation rule.

Final result: succeeded. 8 test files passed, 26 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Confirmed the existing dev server responded at `http://127.0.0.1:5174/`.
- Opened the app in the in-app browser.
- Confirmed Dashboard default display currency was RUB:
  - This month: `10 556,72 ₽`
  - Recurring: `5 006,62 ₽`
- Navigated to Settings.
- Confirmed Settings showed the Currency section, display currency control, seeded USD/EUR/GBP rates, and the Bank of Russia source note.
- Changed display currency to USD and saved.
- Confirmed Settings showed `Currency settings saved.`.
- Navigated back to Dashboard and confirmed:
  - This month: `$145.49`
  - Recurring: `$69.00`
- Navigated to Transactions and confirmed transaction currency options are `USD`, `RUB`, `EUR`, and `GBP`.
- Reset display currency to RUB after verification.

### Scope notes

- No live exchange-rate fetching was added.
- No online currency provider was added.
- No bank, Google Drive, OCR, crypto, brokerage, or payment integration was added.
- No credentials or API keys were added.

## 2026-06-04: Phase 5A and manual currency stabilization completed

### Completed

- Reviewed the manual multi-currency implementation for consistency.
- Confirmed currency conversion remains display-only:
  - original transaction `amount` and `currency` are persisted unchanged;
  - Dashboard totals are converted derived values only;
  - recent transaction records still expose their source amount and currency.
- Confirmed receipt drafts remain isolated:
  - saved drafts preserve their parsed receipt currency;
  - drafts do not create transactions;
  - drafts do not mutate `receipts` or `receiptItems`;
  - drafts do not affect Dashboard overview totals.
- Confirmed Settings display currency is persisted through Dexie `appMeta` and survives snapshot reload.
- Clarified in `ARCHITECTURE.md` and `DECISIONS.md` that local FX rates are manual/static MVP rates and conversion must not overwrite source records.
- Updated `.gitignore` to ignore `*.err`, `vite-*.err`, and `vite-*.log`.
- Removed `vite-dev-escalated.err` from git tracking while leaving any local ignored runtime copy alone.
- Added tests for transaction source-currency preservation and display-only dashboard conversion.
- Adjusted receipt draft persistence coverage to prove draft currency preservation while Dashboard remains unchanged.

### Files updated

- `.gitignore`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/domain/financeViews.test.ts`
- `src/persistence/repositories/financeRepository.test.ts`

### Runtime log cleanup

- `vite-dev-escalated.err` is staged for removal from the repository.
- `.gitignore` now prevents future runtime `.err` and Vite log files from being added by `git add .`.

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

Result: succeeded. 8 test files passed, 28 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Readiness

Phase 5A receipt draft persistence and manual multi-currency support are stable enough to start Phase 5B. Phase 5B should begin with receipt draft review/edit UI and explicit confirmation, without adding OCR, image upload, Google Drive, live FX, or external provider integrations.

## 2026-06-04: Phase 5B receipt draft review/edit UI completed

### Completed

- Added a draft-only review/edit flow on the Receipts screen.
- Saved drafts can be opened from the Saved drafts list with `Review draft`.
- Review form supports editing:
  - merchant;
  - receipt date;
  - receipt currency;
  - receipt total;
  - item normalized name;
  - item quantity;
  - item unit price;
  - item total price;
  - item category suggestion;
  - item flags.
- Raw receipt text, raw item line, and raw item name stay read-only.
- Added item sum vs receipt total display.
- Added mismatch warning when item sum differs from receipt total.
- Added `Save changes` for persisting draft edits.
- Added `Mark reviewed` for persisting `reviewed` status.
- Added repository and service update paths for existing receipt drafts.
- Kept updates scoped to `receiptDrafts` and `receiptDraftItems`.
- Confirmed reviewed drafts still do not create transactions, do not write to final `receipts` or `receiptItems`, and do not affect Dashboard.
- Updated `ARCHITECTURE.md` and `DECISIONS.md`.

### Files updated

- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/ReceiptsPage.test.tsx`
- `src/persistence/repositories/financeRepository.ts`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`

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

Result: succeeded. 8 test files passed, 33 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Started Vite at `http://127.0.0.1:5174/` after the first sandboxed dev-server attempt failed with `spawn EPERM`.
- Set a temporary mobile viewport override.
- Captured Dashboard monthly spend before reviewing a draft: `10 556,72 ₽`.
- Opened Receipts.
- Confirmed the Draft review section rendered and prompted to open a saved draft.
- Ensured a saved draft existed by using the existing parser sample flow when needed.
- Opened a saved draft with `Review draft`.
- Confirmed the review UI showed raw receipt evidence, item sum, normalized-name fields, and `Mark reviewed`.
- Edited merchant, receipt currency, receipt total, first item normalized name, first item total price, and first item flags.
- Saved changes and confirmed `Draft changes saved.` appeared.
- Marked the draft reviewed and confirmed `Draft marked reviewed.` appeared.
- Reloaded the app, returned to Receipts, and confirmed the edited merchant and `Reviewed` status persisted.
- Confirmed no horizontal overflow in the mobile viewport.
- Returned to Dashboard and confirmed monthly spend stayed `10 556,72 ₽`.
- Reset the temporary viewport override.

### Scope notes

- No transactions are created from receipt drafts.
- Reviewed drafts do not affect Dashboard.
- Reviewed drafts are not written into `receipts` or `receiptItems`.
- No OCR was added.
- No image upload was added.
- No Google Drive integration was added.
- No real AI/LLM API calls were added.
- No bank API integration was added.
- No crypto or brokerage integration was added.
- No live FX API or FX auto-refresh was added.
- The parser was not rewritten.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Phase 5B reviews and edits drafts only. Confirmation/promotion into final receipt data remains intentionally unimplemented.

### Next recommended phase

Phase 5C: explicit receipt confirmation/promotion from reviewed draft into final `receipts` and `receiptItems`, plus transaction creation/linking and double-counting protection tests.

## 2026-06-04: Phase 5C-A reviewed receipt confirmation completed

### Completed

- Added explicit confirmation for reviewed receipt drafts only.
- Confirmation creates, in one repository-level Dexie transaction:
  - one final `Receipt`;
  - final `ReceiptItem` records;
  - one linked `Transaction` for the receipt total.
- Added final receipt linkage:
  - `Receipt.transactionId`;
  - `Transaction.receiptId`;
  - `ReceiptDraft.confirmedReceiptId`;
  - `ReceiptDraft.linkedTransactionId`.
- Added final receipt item `flags` so reviewed parser flags are preserved after confirmation.
- Added repository idempotency:
  - unreviewed drafts cannot be confirmed;
  - normal draft save/update cannot set `confirmed`;
  - already confirmed drafts return their existing linked receipt, items, and transaction instead of creating duplicates.
- Added service-layer confirmation with snapshot reload so Dashboard updates from persisted data.
- Added Receipts review UI confirmation controls:
  - `Confirm receipt` appears only for reviewed drafts;
  - account selection is required;
  - transaction category defaults to groceries/food when available;
  - warning explains that confirmation creates a transaction and affects Dashboard;
  - confirmed drafts show a linked transaction summary;
  - confirmed drafts hide the confirm action after click and after reload.
- Confirmed Dashboard spend updates through the created transaction, while receipt items do not independently add Dashboard spend totals.
- Kept hard non-goals out of scope:
  - no bank matching or reconciliation;
  - no OCR or image upload;
  - no Google Drive;
  - no AI/LLM API calls;
  - no bank APIs;
  - no crypto or brokerage integrations;
  - no live FX API or FX auto-refresh.
- Updated `ARCHITECTURE.md` and `DECISIONS.md`.

### Files updated

- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/data/seedData.ts`
- `src/domain/models.ts`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/ReceiptsPage.test.tsx`
- `src/persistence/repositories/financeRepository.ts`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`

### Validation commands and results

```powershell
npm run typecheck
```

Result: succeeded.

```powershell
npm run lint
```

Initial result: failed because the new ReceiptsPage confirm mock had an unused parameter.

Fix:

- Used the confirmation input inside the mock linked transaction.

Final result: succeeded.

```powershell
npm run test -- --run
```

Initial result: failed because two repository assertions assumed Dexie would preserve missing `undefined` fields and receipt draft item ordering.

Fixes:

- Checked missing linkage fields with `toBeUndefined()`.
- Matched the confirmed final receipt item by normalized name instead of array position.

Final result: succeeded. 8 test files passed, 39 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Confirmed the dev server responded at `http://127.0.0.1:5174/`.
- Opened the app in the in-app browser.
- Set a temporary 390 x 844 viewport override.
- Navigated to Receipts.
- Created a new draft from the sample pasted receipt flow.
- Opened the saved draft for review.
- Changed the merchant to a temporary unique browser verification value.
- Marked the draft reviewed.
- Confirmed the warning text appeared before confirmation.
- Selected `Everyday card` and `Groceries` for the linked transaction.
- Confirmed the receipt.
- Verified the UI showed `Confirmed receipt` and a linked transaction summary.
- Verified `Confirm receipt` was no longer visible after confirmation.
- Reloaded the app.
- Returned to Receipts and confirmed the temporary browser verification merchant persisted with `Confirmed` status.
- Opened the confirmed draft after reload and verified:
  - linked transaction summary was still shown;
  - `Confirm receipt` was still hidden.
- Navigated to Dashboard and verified the temporary browser verification merchant appeared from the created receipt transaction.
- Reset the temporary viewport override.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The MVP still has no final receipt or receipt-linked transaction delete/undo flow. The browser verification therefore leaves one local confirmed demo receipt/transaction in this browser's IndexedDB.

### Next recommended phase

Phase 6: recurring expense CRUD through the existing service/repository boundary, keeping external integrations deferred.

## 2026-06-04: Phase 5C-A stabilization checkpoint

### Completed

- Reviewed the dirty working tree after Phase 5C-A.
- Confirmed the only untracked source files are the manual currency settings module and tests intended for this checkpoint.
- Confirmed the staged deletion of `vite-dev-escalated.err` removes a runtime log from version control.
- Confirmed no concrete browser verification merchant value remains in source/docs after cleanup.
- Aligned `PLAN.md` with the Phase 5C-A rule that Dashboard spend updates through the linked transaction while item-level dashboard analytics remain deferred to Phase 7.
- Added an architecture dev/test reset note for the local IndexedDB database `finaitr-local`; no product reset UI was added because the in-app backup/reset workflow belongs to Phase 8.
- Rechecked receipt confirmation coverage:
  - unreviewed drafts cannot be confirmed;
  - reviewed drafts can be confirmed through the service boundary;
  - confirmation creates one transaction;
  - confirmation creates final receipt and final receipt items;
  - final receipt links to the transaction;
  - Dashboard monthly spend updates after confirmation through the created transaction;
  - duplicate confirmation does not create duplicate records;
  - original amount and currency are preserved;
  - safe default transaction category is selected when no category is provided.
- Confirmed no OCR, image upload, Google Drive, AI/LLM, bank API, crypto/brokerage, live FX, bank matching, item-level Dashboard totals, or subscription automation was added during stabilization.

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Initial stabilization rerun result: failed because the duplicate-confirmation test compared final receipt item ids in Dexie read order.

Fix:

- Changed the assertion to compare sorted final receipt item ids, keeping the idempotency check order-independent.

Final result: succeeded. 8 test files passed, 39 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The browser used for manual verification may still contain local IndexedDB verification data. That data is not stored in the repository and can be cleared through browser storage tools or `indexedDB.deleteDatabase("finaitr-local")` during development.

### Next recommended phase

Phase 6: recurring expense CRUD through the existing service/repository boundary, keeping all deferred integrations out of scope.

## 2026-06-04: Phase 6 recurring expense CRUD completed

### Completed

- Added recurring expense create, edit, delete, list, validation, and persistence.
- Kept recurring writes inside the existing boundary:
  - `RecurringPage`
  - `financeDataService`
  - `financeRepository`
  - Dexie `recurringExpenses`
  - refreshed `FinanceSnapshot`
- Added recurring form fields:
  - name;
  - merchant/description;
  - amount;
  - currency;
  - account;
  - category;
  - frequency;
  - next due date;
  - active/inactive status;
  - note;
  - tags.
- Added delete confirmation.
- Added recurring validation for required name, positive amount, currency, account, valid frequency, and valid ISO date.
- Added a Dashboard/Recurring monthly estimate for active recurring expenses only.
- Preserved original recurring amount and currency; conversion remains display-only.
- Confirmed recurring expense CRUD does not create transactions and does not change Dashboard transaction spend.
- Added note/tags to seeded recurring expenses and the recurring model.
- Updated `ARCHITECTURE.md`, `DECISIONS.md`, and `PLAN.md`.

### Files added

- `src/domain/recurringValidation.ts`
- `src/domain/recurringValidation.test.ts`
- `src/pages/RecurringPage.test.tsx`

### Files updated

- `PLAN.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/data/seedData.ts`
- `src/domain/financeViews.test.ts`
- `src/domain/models.ts`
- `src/pages/RecurringPage.tsx`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/persistence/repositories/financeRepository.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`

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

Initial result: failed because one UI test compared `Intl` currency output with non-breaking spaces through Testing Library's default text normalizer.

Fix:

- Changed the recurring page currency assertions to compare exact `textContent`.

Final result: succeeded. 10 test files passed, 49 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Started Vite at `http://127.0.0.1:5175/` after the first sandboxed dev-server attempt failed with `spawn EPERM`.
- Opened the app in the in-app browser.
- Navigated to Recurring.
- Confirmed the recurring form, list, source currency amounts, and display-currency monthly estimate rendered.
- Confirmed validation appears when the required next due date is missing.
- Edited `OpenAI` from active to inactive and confirmed:
  - `Recurring expense updated.` appeared;
  - the row changed to `Inactive`;
  - the recurring estimate decreased;
  - reload preserved the change.
- Deleted `Adobe` through `Delete Adobe` then `Confirm delete` and confirmed:
  - the row was removed;
  - reload preserved the deletion.
- Navigated to Dashboard after recurring changes and confirmed:
  - transaction monthly spend remained `10 556,72 ₽`;
  - the separate recurring metric updated to `3 555,43 ₽`.

### Scope notes

- No transactions are created from recurring expenses.
- No scheduling/background jobs were added.
- No notifications were added.
- No bank APIs, OCR, Google Drive, AI/LLM calls, crypto/brokerage, live FX, or subscription detection was added.
- Receipt confirmation behavior was not changed.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Non-blocking test note: in-app browser automation could not complete the full create form because the browser runtime could not fill the native date input reliably; create behavior is covered by `RecurringPage` UI tests and repository/service persistence tests.
- The browser used for manual verification contains local IndexedDB verification edits to recurring seed data. That data is not stored in the repository and can be cleared through browser storage tools or `indexedDB.deleteDatabase("finaitr-local")` during development.

### Next recommended phase

Phase 7: dashboard analytics MVP, including item-level analytics/search/trends and explicit double-counting protection around receipt-linked transactions.

## 2026-06-04: Phase 7A confirmed receipt item analytics completed

### Completed

- Added item-level analytics derived from final confirmed receipts only.
- Aggregated confirmed receipt items by:
  - normalized item name;
  - item category.
- Added totals, item counts, average item price, top items, and top item categories.
- Added current-month and all-time item analytics periods.
- Current-month filtering uses final receipt date when available; all-time includes all confirmed final receipts.
- Display amounts use existing manual FX conversion through the linked final receipt currency.
- Preserved original `ReceiptItem.totalPrice` and linked `Receipt.currency`; conversion is display-only.
- Added a mobile-friendly Dashboard `Item analytics` section.
- Clearly labeled item analytics as a confirmed receipt breakdown, not extra spending.
- Confirmed Dashboard monthly spend remains transaction-based and does not double-count receipt items.
- Kept hard non-goals out of scope:
  - no receipt confirmation behavior changes;
  - no OCR, image upload, Google Drive, AI/LLM calls, bank APIs, crypto/brokerage, live FX, bank matching, or auto-created transactions;
  - no recurring expense behavior changes.
- Updated `ARCHITECTURE.md` and `DECISIONS.md`.

### Files added

- `src/pages/DashboardPage.test.tsx`

### Files updated

- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/domain/financeViews.ts`
- `src/domain/financeViews.test.ts`
- `src/pages/DashboardPage.tsx`
- `src/styles.css`

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 54 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Browser verification

- Started Vite at `http://127.0.0.1:5174/` after the first sandboxed dev-server attempt failed with `spawn EPERM`.
- Opened Dashboard in the in-app browser.
- Confirmed the `Item analytics` section rendered.
- Confirmed the section label states it is a confirmed receipt item breakdown and not extra spending.
- Confirmed top items and top item categories rendered.
- Confirmed the `This month` and `All time` period controls rendered.
- Switched to `All time` and confirmed the selected state changed.
- Stopped the Vite listener on port `5174` after verification.

Browser note: this browser's IndexedDB contains local verification receipt data from previous phases, so browser-visible totals can differ from seed-only test totals. Repository state and tests remain deterministic.

### Next recommended phase

Phase 7B: continue Dashboard analytics with product search, monthly trend, and broader double-counting coverage without adding external integrations.

## 2026-06-04: Phase 6 stabilization checkpoint

### Completed

- Reviewed the Phase 6 working tree and confirmed it contains the expected recurring CRUD implementation and docs/tests only.
- Rechecked recurring write paths:
  - create, update, and delete write only to `recurringExpenses`;
  - recurring service actions reload the shared finance snapshot;
  - recurring CRUD does not write to `transactions`.
- Rechecked analytics separation:
  - Dashboard monthly spend is still derived from transactions;
  - active recurring expenses feed only `recurringMonthlyTotal`;
  - paused recurring expenses are excluded from the recurring estimate.
- Rechecked currency behavior:
  - recurring records preserve original `amount` and `currency`;
  - display currency conversion is applied only when deriving overview/list amounts.
- Confirmed docs include the non-blocking browser date input automation limitation and keep Phase 7 as the next recommended phase.

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 10 test files passed, 49 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Next recommended phase

Phase 7: dashboard analytics MVP, including item-level analytics/search/trends and explicit double-counting protection around receipt-linked transactions.

## 2026-06-04: Phase 7A stabilization checkpoint

### Completed

- Reviewed the Phase 7A working tree and confirmed it contains item-level Dashboard analytics, focused tests, CSS, and docs only.
- Confirmed item analytics are derived from final `ReceiptItem` records linked to final `Receipt` records with `status: confirmed`.
- Confirmed drafts, reviewed drafts, needs-review receipts, rejected receipts, and receipt draft items are excluded from Phase 7A analytics.
- Confirmed Dashboard monthly spend, category spend, and merchant spend remain transaction-based and are not increased by receipt item totals.
- Confirmed display currency conversion remains display-only:
  - receipt item source amounts stay in `ReceiptItem.totalPrice`;
  - source currency remains on the linked final `Receipt.currency`;
  - transaction amounts and currencies are not rewritten.
- Confirmed the `This month` and `All time` item analytics filters are implemented, documented, and covered by tests.
- Added this stabilization entry so the latest `PROGRESS.md` recommendation now points to Phase 7B.
- Kept hard non-goals out of scope:
  - no CSV import/export;
  - no OCR, image upload, Google Drive, AI/LLM calls, bank APIs, crypto/brokerage, live FX, bank matching, or auto-created transactions;
  - no receipt confirmation or recurring expense behavior changes.

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 54 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The browser used for manual verification may still contain local IndexedDB receipt verification data from earlier phases. That data is not stored in the repository and can be cleared through browser storage tools or `indexedDB.deleteDatabase("finaitr-local")` during development.

### Next recommended phase

Phase 7B: continue Dashboard analytics with product search, monthly trend, and broader double-counting coverage without adding external integrations.

## 2026-06-04: Phase 7B item analytics search, filters, and detail completed

### Completed

- Added Dashboard item analytics search by normalized item name and raw item name.
- Added item category filtering for confirmed receipt item analytics.
- Added a read-only item detail panel showing the confirmed receipt item rows behind a selected item total.
- Detail rows show:
  - final receipt date;
  - merchant when available;
  - raw item name;
  - normalized item name;
  - item category;
  - original amount and receipt currency;
  - display amount in the selected display currency.
- Kept `This month` and `All time` period filtering.
- Added separate empty states for:
  - no confirmed receipts with items for the selected period;
  - no item analytics matching a search;
  - no confirmed receipt items matching a selected category.
- Kept Dashboard monthly spend, category spend, and merchant spend transaction-based.
- Kept manual FX display-only; original receipt item totals, final receipt currencies, and transaction amounts are preserved.
- Kept item analytics derived from final confirmed receipts only.
- Kept hard non-goals out of scope:
  - no CSV or JSON import/export;
  - no OCR, image upload, Google Drive, AI/LLM calls, bank APIs, crypto/brokerage, live FX, bank matching, or auto-created transactions;
  - no receipt confirmation or recurring expense behavior changes.
- Updated `ARCHITECTURE.md` and `DECISIONS.md`.

### Files updated

- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/domain/financeViews.ts`
- `src/domain/financeViews.test.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/DashboardPage.test.tsx`
- `src/styles.css`

### Validation commands and results

```powershell
npm run test -- --run src/domain/financeViews.test.ts src/pages/DashboardPage.test.tsx
```

Initial focused result: failed because the Dashboard test suite needed explicit cleanup after rendering multiple Dashboard instances, several item names now appear in both aggregate rows and detail rows, and one monthly spend assertion needed exact `textContent` matching for non-breaking spaces.

Fixes:

- Added explicit cleanup to the Dashboard test suite.
- Changed repeated item-name assertions to use `getAllByText`.
- Changed the monthly spend assertion to compare exact `textContent`.

Final focused result: succeeded. 2 test files passed, 19 tests passed. npm printed warnings about CLI argument parsing and the existing `--run` warning.

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 62 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Runtime verification

- Started Vite at `http://127.0.0.1:5176/`.
- Confirmed the dev server log reported Vite ready on `http://127.0.0.1:5176/`.
- Confirmed `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5176/` returned HTTP 200.
- The Windows port-owner check failed with `Access denied`, but the Vite log and HTTP 200 response confirmed the server was reachable.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- The browser used for earlier manual verification may still contain local IndexedDB receipt verification data. That data is not stored in the repository and can be cleared through browser storage tools or `indexedDB.deleteDatabase("finaitr-local")` during development.
- The Vite dev server for this phase is running at `http://127.0.0.1:5176/`.

### Next recommended phase

Phase 7C: align architecture and roadmap for future AI receipt ingestion from manual paste, Gmail, Google Drive, and Google Docs without adding real integrations or changing current product behavior.

## 2026-06-04: Phase 7B stabilization checkpoint

### Completed

- Reviewed the Phase 7B working tree and confirmed it contains only item analytics search/filter/drilldown changes, focused tests, CSS, and docs.
- Rechecked confirmed-only analytics:
  - source detail rows are created only from final `Receipt` records with `status: confirmed`;
  - search and category filtering operate on those derived detail rows;
  - receipt drafts, reviewed drafts, needs-review receipts, rejected receipts, and receipt draft items remain excluded.
- Rechecked spending separation:
  - Dashboard monthly spend, category spend, and merchant spend remain transaction-based;
  - item analytics totals remain a confirmed receipt item breakdown and do not add to spending totals.
- Rechecked display-only FX:
  - source item amounts stay in `ReceiptItem.totalPrice`;
  - source currency remains on linked final `Receipt.currency`;
  - detail rows include original amount/currency plus display amount without rewriting source records.
- Rechecked empty-state coverage for no confirmed receipt items, no search results, and no category matches.
- Confirmed docs describe Phase 7B and keep Phase 7C as the next recommended phase.
- Confirmed no new product features were added during stabilization.
- Kept hard non-goals out of scope:
  - no Phase 7C monthly trend implementation;
  - no CSV or JSON import/export;
  - no OCR, image upload, Google Drive, AI/LLM calls, bank APIs, crypto/brokerage, live FX, bank matching, or auto-created transactions;
  - no receipt confirmation or recurring expense behavior changes.

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 62 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Git prints CRLF normalization warnings on this Windows working tree.
- The Vite dev server from Phase 7B verification may still be running at `http://127.0.0.1:5176/`.

### Next recommended phase

Phase 7C: align architecture and roadmap for future AI receipt ingestion from manual paste, Gmail, Google Drive, and Google Docs without adding real integrations or changing current product behavior.

## 2026-06-04: Phase 7C AI receipt ingestion architecture aligned

### Completed

- Updated product, plan, architecture, and decision docs to separate current deterministic analytics from future AI receipt ingestion.
- Defined future receipt text source providers:
  - manual paste;
  - Gmail;
  - Google Drive;
  - Google Docs.
- Added small contract-only TypeScript placeholders for future ingestion:
  - `ReceiptTextSourceProvider`;
  - `ReceiptExtractionProvider`;
  - source candidate/reference types;
  - AI-extracted receipt draft/item types.
- Added a reusable receipt extraction prompt template.
- Added the expected JSON schema for AI-extracted receipt drafts and items.
- Documented that future AI extraction creates receipt drafts only and must not create transactions, final receipts, Dashboard totals, recurring expenses, or FX changes.
- Documented that human review and explicit receipt confirmation remain required before Dashboard impact.
- Confirmed current product behavior is unchanged:
  - no app UI wiring was added for ingestion contracts;
  - no service or repository write path changed;
  - receipt confirmation behavior is unchanged;
  - confirmed receipt item analytics remain deterministic and confirmed-only;
  - recurring expense behavior is unchanged;
  - manual FX remains display-only.
- Kept hard non-goals out of scope:
  - no real Gmail, Google Drive, or Google Docs integration;
  - no OAuth, backend, scheduled sync, OCR API, AI API, bank API, live FX, crypto, brokerage, bank matching, or payment execution;
  - no direct transaction creation from AI extraction;
  - no auto-confirmation of receipt drafts.

### Files added

- `src/receipt-ingestion/types.ts`
- `src/receipt-ingestion/receiptExtractionContract.ts`

### Files updated

- `PRODUCT_SPEC.md`
- `PLAN.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 62 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Git prints CRLF normalization warnings on this Windows working tree.
- Phase 7C is intentionally contract-only. Future Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR, and AI providers still require explicit implementation phases.

### Next recommended phase

Phase 7D: add monthly trend analytics and broader Dashboard analytics polish while keeping AI ingestion contract-only and without adding external integrations.

## 2026-06-04: Phase 7C stabilization checkpoint

### Completed

- Reviewed the Phase 7C working tree and confirmed it contains documentation updates plus contract-only receipt ingestion files.
- Rechecked the new contracts:
  - `ReceiptTextSourceProvider` covers manual paste, Gmail, Google Drive, and Google Docs text candidates;
  - `ReceiptExtractionProvider` returns structured AI-extracted receipt draft data;
  - the prompt template tells extraction providers to return JSON only and create receipt drafts only;
  - the JSON schema excludes transaction, account, Dashboard, recurring, bank, and FX fields.
- Confirmed the new `src/receipt-ingestion` exports are not imported by current runtime app code.
- Confirmed current product behavior is unchanged:
  - receipt confirmation still runs through the existing review/confirm service and repository path;
  - item analytics still use confirmed final receipt items only;
  - Dashboard spending remains transaction-based;
  - recurring expenses remain local estimates and do not create transactions;
  - manual FX remains display-only.
- Confirmed docs consistently describe AI ingestion as future draft-only intake with required human review and explicit confirmation before Dashboard impact.
- Kept hard non-goals out of scope:
  - no real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR API, AI API, live provider, bank API, live FX, crypto, brokerage, bank matching, or payment execution;
  - no Phase 8A work;
  - no receipt confirmation, item analytics, recurring expense, or FX behavior changes.

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 11 test files passed, 62 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Git prints CRLF normalization warnings on this Windows working tree.
- Phase 7C remains contract-only. Future Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR, and AI providers still require explicit implementation phases.

### Next recommended phase

Phase 7D: add monthly trend analytics and broader Dashboard analytics polish while keeping AI ingestion contract-only and without adding external integrations.

## 2026-06-04: Phase 8A manual AI extraction simulator implemented

### Completed

- Added a local-only manual AI extraction simulator that uses the Phase 7C receipt-ingestion contracts without calling any real AI, Gmail, Drive, Docs, OCR, backend, or OAuth provider.
- Added email-like and document-like mock receipt fixtures for simulator tests and UI sample input.
- Added source metadata support for receipt drafts and final receipts:
  - source kind;
  - source id;
  - source title;
  - sender;
  - received/fetched/extracted timestamps;
  - mock provider and model names.
- Added `ai_extraction_mock` as a persisted receipt source for simulated extraction output.
- Wired the Receipts page to accept raw email/document-like receipt text, run the local simulator, save the result as a receipt draft, and open the saved draft in the existing review flow.
- Kept simulated extraction draft-only:
  - writes only `receiptDrafts` and `receiptDraftItems`;
  - does not create transactions;
  - does not create final receipts or final receipt items;
  - does not change Dashboard totals before explicit receipt confirmation;
  - does not change recurring expenses or FX settings.
- Preserved the existing service/repository write boundary through `financeDataService` and `financeRepository`.
- Added tests for:
  - mock extraction contract-shaped output;
  - header stripping and metadata extraction;
  - validation errors for empty/metadata-only input;
  - draft creation and persisted source metadata;
  - unchanged Dashboard/transaction/final receipt data before confirmation;
  - Receipts UI validation and opening the saved AI draft in the existing review flow.
- Updated product, plan, architecture, decision, and progress docs to describe Phase 8A as a local simulator, not a real external integration.

### Changed files

- `PRODUCT_SPEC.md`
- `PLAN.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `PROGRESS.md`
- `src/app/App.tsx`
- `src/domain/models.ts`
- `src/pages/ReceiptsPage.tsx`
- `src/pages/ReceiptsPage.test.tsx`
- `src/persistence/repositories/financeRepository.ts`
- `src/persistence/repositories/financeRepository.test.ts`
- `src/receipt-ingestion/fixtures.ts`
- `src/receipt-ingestion/manualAiExtractionSimulator.ts`
- `src/receipt-ingestion/manualAiExtractionSimulator.test.ts`
- `src/receipt-ingestion/types.ts`
- `src/services/financeDataService.ts`
- `src/styles.css`

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

```powershell
npm run typecheck
```

Result: succeeded.

```powershell
npm run lint
```

Result: succeeded after fixing one unused callback parameter in the new Receipts page test.

```powershell
npm run test -- --run
```

Result: succeeded. 12 test files passed, 69 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- The manual AI extraction simulator is heuristic and local-only. It reuses deterministic parser logic and is not a real AI extractor.
- Real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR API, AI API, bank API, crypto/brokerage, live FX, bank matching, and payment execution remain out of scope.
- Dashboard impact still requires human review and explicit receipt confirmation.
- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Git prints CRLF normalization warnings on this Windows working tree.

### Next recommended phase

Phase 7D: add monthly trend analytics and broader Dashboard analytics polish, then continue to Phase 8B local backup/import/export and reset once the remaining Dashboard MVP analytics are stable.

## 2026-06-04: Phase 8A stabilization checkpoint

### Completed

- Reviewed the Phase 8A working tree and confirmed the manual AI extraction simulator is local-only.
- Confirmed the simulator write path stays inside the existing service/repository boundary:
  - `simulateAiReceiptExtractionAndSaveDraftAndReload`;
  - `saveReceiptDraft`;
  - `receiptDrafts`;
  - `receiptDraftItems`.
- Confirmed simulated extraction does not write transactions, final receipts, final receipt items, recurring expenses, Dashboard state, or FX settings before explicit review and confirmation.
- Confirmed Dashboard impact still happens only through `confirmReceiptDraft`, which creates one receipt-linked transaction after human review.
- Confirmed existing receipt parser, receipt review/edit, confirmation idempotency, confirmed item analytics, recurring expense, and display-only FX behavior remain unchanged.
- Fixed the architecture core data model docs so `Receipt` and `ReceiptDraft` list `ai_extraction_mock` and optional source metadata.
- Added one repository stabilization test proving AI source metadata is normalized and copied onto the final receipt only when a reviewed draft is explicitly confirmed.
- Confirmed product, plan, architecture, decision, and progress docs describe Phase 8A as a mock/local simulator, not a real external integration.
- Did not start Phase 7D or Phase 8B work.

### Changed files

- `ARCHITECTURE.md`
- `PROGRESS.md`
- `src/persistence/repositories/financeRepository.test.ts`

### Validation commands and results

```powershell
git diff --check
```

Result: succeeded. Git printed line-ending normalization warnings only.

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

Result: succeeded. 12 test files passed, 70 tests passed. npm printed the existing warning that `--run` is an unknown npm CLI config in this npm version.

```powershell
npm run build
```

Result: succeeded. Vite built production assets into `dist`.

```powershell
npm audit
```

Result: succeeded. Found 0 vulnerabilities.

### Known issues

- The manual AI extraction simulator remains heuristic and local-only. It reuses deterministic parser logic and is not a real AI extractor.
- Real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR API, AI API, bank API, crypto/brokerage, live FX, bank matching, and payment execution remain out of scope.
- Dashboard impact still requires human review and explicit receipt confirmation.
- `npm run test -- --run` succeeds, but npm prints a warning that `--run` is an unknown npm CLI config in this npm version.
- Git prints CRLF normalization warnings on this Windows working tree.

### Next recommended phase

Phase 7D: add monthly trend analytics and broader Dashboard analytics polish. Do not begin Phase 8B local backup/import/export/reset until the remaining Dashboard MVP analytics are stable.
