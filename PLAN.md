# Implementation Plan

## Scope rule

The first MVP is limited to:

- manual transactions;
- pasted receipt text parsing;
- receipt review and confirmation;
- recurring expenses;
- dashboard analytics;
- manual local currency conversion settings for USD, RUB, EUR, and GBP;
- local JSON backup/restore/reset, local CSV export, local transaction CSV import preview/confirm, and local recurring expense CSV import preview/confirm.

Real bank APIs, Google Drive, OCR APIs, crypto, brokerage, payment execution, live exchange-rate fetching, and credentials are out of scope.

## Validation baseline

When the app scaffold exists, run the available commands after each phase:

```powershell
npm install
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

If a script does not exist yet, document that in `PROGRESS.md`. If a validation command fails, fix it before moving to the next phase.

## Phase 0: Product and architecture setup

### Goal

Create the planning documents that constrain the project before product code starts.

### Scope

- Add `PRODUCT_SPEC.md`.
- Add `ARCHITECTURE.md`.
- Add `PLAN.md`.
- Add `IMPLEMENT.md`.
- Add `PROGRESS.md`.
- Add `DECISIONS.md`.
- Do not implement app code.

### Acceptance criteria

- Required docs exist.
- MVP scope and non-goals are explicit.
- Recommended stack is documented.
- Validation commands are documented.
- `PROGRESS.md` records Phase 0 work and command results.

## Phase 1: App skeleton and mobile PWA shell

### Goal

Create a runnable React + TypeScript + Vite app with mobile-first navigation.

### Scope

- Scaffold Vite React TypeScript app.
- Add app shell and mobile-first layout.
- Add placeholder pages:
  - Dashboard
  - Transactions
  - Receipts
  - Recurring
  - Categories
  - Settings
- Add mock data only.
- Add PWA manifest placeholders if practical.
- Add scripts for typecheck, lint, test, and build.

### Acceptance criteria

- `npm install` succeeds.
- `npm run build` succeeds.
- App runs with `npm run dev`.
- Navigation works on mobile widths.
- No real integrations are added.
- `PROGRESS.md` is updated.

## Phase 2: Local data model and persistence

### Goal

Add local-first data models and repository/service boundaries.

### Scope

- Add TypeScript domain models.
- Add IndexedDB/Dexie local persistence.
- Add repositories or services for:
  - accounts;
  - transactions;
  - receipts;
  - receipt items;
  - categories;
  - recurring expenses.
- Seed useful local demo data.
- Refactor pages to read data from services instead of component constants.

### Acceptance criteria

- Data types exist.
- App reads through service/repository APIs.
- Dashboard still renders from local data.
- Typecheck and build pass.
- Helper tests exist where practical.
- `ARCHITECTURE.md` and `PROGRESS.md` are updated.

## Phase 3: Manual transactions

### Goal

Make the app useful without receipts or banks.

### Scope

- Add transaction form.
- Support date, amount, currency, merchant, account, category, tags, and note.
- Add transaction list.
- Add edit and delete.
- Add filters by date, category, merchant, and text.
- Add validation and empty states.

### Acceptance criteria

- User can create, edit, and delete a manual transaction.
- Dashboard updates after transaction changes.
- Filters work.
- Mobile form is usable.
- Tests, typecheck, and build pass.
- `PROGRESS.md` is updated.

## Phase 4: Receipt text parser

### Goal

Convert pasted OCR-like receipt text into a draft receipt.

### Scope

- Add pasted text intake UI.
- Add deterministic parser.
- Detect merchant, date, total, currency where possible.
- Extract item-like lines.
- Handle decimal comma, decimal dot, extra spaces, total lines, discounts, and unknown lines.
- Guess categories and tags for groceries, dairy, alcohol, medicine, games, software, subscriptions, gym, and health.
- Show confidence and warnings.
- Add at least three messy receipt fixtures and tests.

### Acceptance criteria

- User can paste receipt text.
- Draft receipt is created with item lines.
- Categories and tags are guessed.
- Parser warnings are visible.
- Tests, typecheck, and build pass.
- `PROGRESS.md` is updated.

## Phase 5: Receipt review and confirmation

### Goal

Add human-in-the-loop review before receipt data affects analytics.

### Scope

- Add receipt review screen.
- Allow editing merchant, date, total, currency.
- Allow editing item name, category, tags, quantity, unit price, and total price.
- Allow adding and removing item lines.
- Show mismatch warning when item totals differ from receipt total.
- Confirm receipt.
- On confirmation, persist receipt, mark it confirmed, and create or link a transaction.

### Acceptance criteria

- Draft receipt can be edited.
- User can confirm receipt.
- Confirmed receipt creates or links a transaction.
- Dashboard updates through the created or linked transaction.
- Confirmed receipt items are persisted for review/detail; item-level dashboard analytics are deferred to Phase 7.
- Mismatch warning works.
- Typecheck and build pass.
- `PROGRESS.md` is updated.

## Phase 6: Recurring expenses

### Goal

Track subscriptions and repeating charges as local planning records.

### Scope

- Add recurring expense list.
- Add create, edit, delete, and active/inactive status.
- Support name, merchant/description, amount, currency, account, category, frequency, next due date, note, and tags.
- Support weekly, monthly, and yearly frequencies.
- Show upcoming charges sorted by next due date.
- Show a monthly recurring estimate in the selected display currency.
- Preserve original amount and currency; currency conversion remains display-only.
- Do not create transactions from recurring expenses in this phase.
- Do not add scheduling, notifications, auto-pay, or subscription detection.

### Acceptance criteria

- User can manage recurring expenses.
- Validation covers required fields, positive amount, valid date, and valid frequency.
- Upcoming charges list works.
- Monthly recurring total is available to Dashboard as a separate estimate.
- Dashboard transaction spend is not changed by recurring CRUD.
- Tests cover create, edit, delete, persistence, validation, display-currency conversion, and no transaction-spend impact.
- Tests, typecheck, and build pass.
- `PROGRESS.md` is updated.

## Phase 7: Dashboard analytics MVP

### Goal

Deliver the main value of item-level finance analytics.

### Scope

- Total spend this month.
- Spend by category.
- Spend by merchant.
- Top products/items.
- Product search analytics.
- Monthly trend analytics based on transactions only.
- Recurring expenses total.
- Recent confirmed receipts.
- Avoid double-counting receipt-linked transactions.

### Acceptance criteria

- Dashboard uses real local data.
- Charts and tables update after manual transactions and confirmed receipts.
- Item-level category totals work.
- Product search works.
- Receipt-linked transactions are not double-counted.
- Analytics helper tests pass.
- Typecheck and build pass.
- `PROGRESS.md` is updated.

### Phase 7C: Future AI receipt ingestion architecture

#### Goal

Align the architecture and roadmap for future AI-assisted receipt ingestion without changing current product behavior.

#### Scope

- Clearly separate deterministic Dashboard analytics from AI receipt ingestion.
- Define future receipt text source providers:
  - manual paste;
  - Gmail;
  - Google Drive;
  - Google Docs.
- Define a future receipt text source provider boundary.
- Define a future AI receipt extraction provider boundary.
- Define the receipt extraction contract and expected JSON schema for extracted draft receipts and items.
- Add a reusable prompt template for receipt extraction.
- Confirm that AI ingestion creates receipt drafts only.
- Keep human review and explicit confirmation required before a transaction is created or Dashboard totals change.
- Add placeholder TypeScript interfaces/types only when they are small and do not affect runtime behavior.

#### Acceptance criteria

- Product, plan, architecture, decisions, and progress docs describe AI ingestion as a future intake layer.
- Docs state that current analytics remain deterministic local views.
- Future provider contracts exist for manual paste, Gmail, Google Drive, and Google Docs sources.
- Future AI extraction output maps to the existing receipt draft/review/confirm flow.
- No real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR, AI API, bank API, live FX, crypto, or brokerage integration is added.
- Receipt confirmation, item analytics, recurring expenses, and FX behavior are unchanged.
- Typecheck, lint, tests, build, and audit pass.
- `PROGRESS.md` is updated.

### Phase 7D: Monthly trend analytics and Dashboard polish

#### Goal

Add readable monthly Dashboard trend analytics without changing accounting semantics.

#### Scope

- Add transaction-only monthly spend trend analytics.
- Split income trend values when transactions use categories with `type: income`.
- Show compact category breakdown per trend month when spend categories exist.
- Keep recurring expenses as a separate monthly estimate.
- Keep confirmed receipt item analytics as detail-only breakdowns, not extra spending.
- Use the selected display currency through local manual FX conversion.
- Improve mobile readability and empty states for Dashboard trend and category sections.

#### Acceptance criteria

- Monthly trends are derived from transactions only.
- Income category transactions appear in income trend values and do not inflate trend spend.
- Receipt items and recurring expenses do not affect monthly trend spend totals.
- Dashboard shows a clear empty state when no transaction trend data exists.
- Existing transaction, receipt confirmation, item analytics, recurring, FX, backup/restore, and AI ingestion semantics are unchanged.
- Tests cover aggregation, display-currency conversion, empty states, and no double-counting from receipt items or recurring expenses.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated.
## Phase 8: Mock AI intake and core MVP polish

### Phase 8A: Manual AI extraction simulator

#### Goal

Use the Phase 7C receipt-ingestion contracts in a local-only manual simulator without adding real external integrations.

#### Scope

- Add a Receipts screen input for raw email-like or document-like receipt text.
- Use a mock/local extraction provider only.
- Produce extraction output shaped like the Phase 7C receipt extraction contract.
- Convert the extraction result into the existing receipt draft and draft item records.
- Preserve useful source metadata, such as source type, title, sender, received date, provider, model, and extraction time.
- Keep saved output in `receiptDrafts` and `receiptDraftItems` only.
- Keep human review and explicit confirmation required before any final receipt, transaction, or Dashboard impact.
- Add tests for mock extraction, draft persistence, metadata, validation errors, and unchanged Dashboard data before confirmation.

#### Acceptance criteria

- Raw email/document-like receipt text can create a saved draft through the mock AI extraction simulator.
- The saved draft opens in the existing receipt review flow.
- Source metadata is persisted with the draft.
- No transaction, final receipt, final receipt item, recurring expense, FX setting, or Dashboard total changes before explicit confirmation.
- No real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR, AI API, bank API, live FX, crypto, or brokerage integration is added.
- Typecheck, lint, tests, build, and audit pass.
- `PROGRESS.md` is updated.

### Phase 8B: Local JSON backup export and safe reset

### Goal

Add local data ownership tools before any deferred integrations.

### Scope

- Settings UI for local JSON backup export.
- Versioned JSON backup with app name/version, schema version, export timestamp, seed version, settings, accounts, categories, transactions, receipts, receipt items, receipt drafts, receipt draft items, recurring expenses, local FX settings, and app metadata.
- Browser-only JSON download with no backend.
- Clear all local data with strong confirmation.
- Reset restores the current seed/baseline state and refreshes app pages through the existing service/repository boundary.
- No JSON import/restore in this phase.
- No CSV import/export in this phase.

### Acceptance criteria

- User can export a local backup JSON file.
- User can clear local data with confirmation.
- Reset restores baseline seed data.
- Dashboard and pages reload from the refreshed snapshot after reset.
- No secrets are committed.
- Typecheck, lint, tests, build, and audit pass.
- `PROGRESS.md` is updated.

### Phase 8C: Local JSON import and restore

### Goal

Allow a user to restore local app-owned data from a previously exported FinAiTr JSON backup.

### Scope

- Settings UI for selecting a local JSON backup file.
- Validate backup `schemaVersion`, app metadata, required table arrays, and required settings before writing.
- Show a clear restore preview with record counts and warnings.
- Require strong confirmation before replacing local data.
- Restore only app-owned IndexedDB data through the existing service/repository boundary.
- Refresh Dashboard and pages after restore.
- Reject malformed, unsupported, or unsafe backup files without mutating current data.
- Preserve original transaction, receipt, receipt item, draft, recurring, and FX amounts/currencies from the backup.
- No CSV import/export in this phase.
- No external integrations in this phase.

### Acceptance criteria

- User can import a valid Phase 8B JSON backup.
- Invalid or unsupported backups are rejected without data loss.
- Restore requires explicit confirmation.
- Restored data reloads Dashboard and pages from the imported snapshot.
- Original amounts/currencies and source metadata are preserved.
- Tests cover validation, no-mutation rejection, successful restore, baseline replacement, and UI confirmation safety.
- Typecheck, lint, tests, build, and audit pass.
- `PROGRESS.md` is updated.

### Phase 8D-A: Local CSV export

### Goal

Add read-only browser CSV exports for the main local MVP datasets without adding CSV import or external integrations.

### Scope

- Settings UI for local CSV exports.
- Export transactions to CSV.
- Export confirmed receipt items to CSV.
- Export recurring expenses to CSV.
- Use browser-only downloads with no backend.
- Preserve original amount and currency fields.
- Include display-currency columns where useful for reporting.
- Include human-readable account/category values and useful receipt source metadata.
- Keep exports read-only and inside the existing service/repository boundary.
- No CSV import in this phase.
- No external integrations in this phase.

### Acceptance criteria

- User can export transactions CSV from Settings.
- User can export confirmed receipt items CSV from Settings.
- User can export recurring expenses CSV from Settings.
- CSV headers are stable.
- CSV escaping covers commas, quotes, and newlines.
- Empty datasets export headers only.
- Exporting CSV does not mutate local app data.
- JSON backup/restore/reset semantics are unchanged.
- Receipt confirmation, item analytics, recurring, FX, and Dashboard monthly spend semantics are unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated.

### Phase 8D-B1: Transaction CSV import preview and confirm

### Goal

Add a safe local transaction CSV import flow after export-only behavior is stable.

### Scope

- Transactions CSV import only.
- Browser-local CSV parsing with no backend or external service.
- Preview before any write to IndexedDB.
- Required row validation for date, amount, currency, merchant or description, account, and category.
- Row-level errors and warnings.
- Likely duplicate warnings based on date, amount, currency, merchant/description, and account.
- Explicit confirmation before writing importable rows.
- Write path stays inside Settings -> financeDataService -> financeRepository -> Dexie.
- Preserve original imported amount and currency; FX remains display-only.

### Out of scope

- Receipt item CSV import.
- Final receipt or receipt draft CSV import.
- Recurring expense CSV import.
- CSV bank matching or reconciliation.
- External integrations, backend services, OCR, AI APIs, live FX, bank APIs, crypto, or brokerage flows.

### Acceptance criteria

- User can select a transactions CSV in Settings and see a preview before writes.
- Invalid files and invalid rows are rejected before mutation.
- Row-level errors identify malformed required fields.
- Duplicate-like rows show warnings, not silent imports.
- Import requires the strong confirmation phrase.
- Confirmed valid rows persist as local `csv_import` transactions.
- Dashboard and Transactions update only after confirmation.
- CSV export, JSON backup/restore/reset, receipt confirmation, item analytics, recurring, and FX semantics are unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated with exact validation results and next phase.

### Phase 8D-B2: Recurring expense CSV import preview and confirm

### Goal

Add safe local recurring expense CSV import after transaction CSV import is stable.

### Scope

- Recurring expenses CSV import only.
- Browser-local CSV parsing with no backend or external service.
- Preview before any write to IndexedDB.
- Required row validation for name, amount, currency, frequency, next due date, and account.
- Optional category resolution by id or name when supplied.
- Row-level errors and warnings.
- Likely duplicate warnings based on name, merchant/description, amount, currency, frequency, and next due date.
- Explicit confirmation before writing importable rows.
- Write path stays inside Settings -> financeDataService -> financeRepository -> Dexie.
- Preserve original imported amount and currency; FX remains display-only.
- Imported recurring expenses may affect only the separate recurring monthly estimate after confirmation.
- Imported recurring expenses must not create transactions or change Dashboard monthly transaction spend.

### Out of scope

- Transaction CSV import changes.
- Receipt item CSV import.
- Final receipt or receipt draft CSV import.
- Auto-creating transactions from recurring expenses.
- CSV bank matching or reconciliation.
- External integrations, backend services, OCR, AI APIs, live FX, bank APIs, crypto, or brokerage flows.

### Acceptance criteria

- User can select a recurring expenses CSV in Settings and see a preview before writes.
- Invalid files and invalid rows are rejected before mutation.
- Row-level errors identify malformed required fields.
- Duplicate-like rows show warnings, not silent imports.
- Import requires the strong confirmation phrase.
- Confirmed valid rows persist as local `rec-csv-*` recurring expenses.
- Recurring monthly estimate updates only after confirmation.
- Dashboard monthly transaction spend and Transactions data are unchanged by recurring CSV import.
- CSV export, transaction CSV import, JSON backup/restore/reset, receipt confirmation, item analytics, recurring CRUD, and FX semantics are unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated with exact validation results and next phase.

### Phase 8D-B3: CSV import hardening and deferred import decisions

### Goal

Review CSV import behavior after transaction and recurring imports are both stable before considering any broader import surface.

### Scope

- Stabilize transaction and recurring CSV import UX and docs.
- Keep receipt item, final receipt, and receipt draft import deferred until a separate product decision.
- Decide whether any bank/reconciliation mapping belongs in a later post-MVP phase.

## Deferred until after first MVP

- Real OCR provider.
- Real Google Drive adapter.
- Real Gmail adapter.
- Real Google Docs adapter.
- Real AI receipt extraction API calls.
- Real bank transaction aggregation.
- Crypto tracking.
- Brokerage or investment tracking.
- Live multi-currency market rates.
- Backend sync.
- Multi-user auth.
- Payment execution.

These items require explicit planning updates before implementation.
