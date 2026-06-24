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

Real bank APIs, Gmail, Google Drive, Google Docs, OCR APIs, crypto, brokerage, payment execution, live exchange-rate fetching, and credentials are out of scope.

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

### Phase 8D-B3: CSV import/export QA and shared safety polish

### Goal

Harden the existing CSV export, transaction import, and recurring import flows before any broader CSV import surface is considered.

### Scope

- Review and polish existing transaction and recurring CSV import preview/confirm behavior.
- Keep transaction and recurring import previews consistent for file errors, row errors, warnings, duplicate warnings, and confirmation safety.
- Keep invalid CSV files and invalid row batches from partially mutating IndexedDB.
- Keep CSV exports read-only for transactions, confirmed receipt items, and recurring expenses.
- Document duplicate detection as warning-only behavior.
- Preserve imported transaction source as `csv_import`.
- Preserve recurring CSV import as recurring-only: no transactions are created.
- Keep Dashboard monthly spend affected only by confirmed transaction imports.
- Keep recurring monthly estimate affected only by confirmed recurring imports.
- Add or improve focused tests for CSV escaping, parse errors, duplicate warnings, confirmation safety, no partial mutation, and read-only exports.
- Keep receipt item, final receipt, receipt draft, account, category, bank matching, and reconciliation imports deferred until a separate product decision.

### Non-goals

- No new CSV import types.
- No receipt item, final receipt, receipt draft, account, or category CSV import.
- No JSON backup/restore behavior changes.
- No receipt confirmation, item analytics, recurring CRUD, FX, Dashboard semantics, or external integration changes.

### Acceptance

- Malformed quoted CSV files return file errors before row import.
- Invalid confirmed import batches do not partially write valid rows before the invalid row.
- Duplicate-like rows remain warnings, not automatic rejections.
- CSV export stays read-only for all supported export kinds.
- Imported transactions continue to create local `csv_import` transactions only after confirmation.
- Imported recurring expenses continue to create local `rec-csv-*` recurring records only after confirmation.
- Recurring imports do not create transactions and do not change Dashboard monthly transaction spend.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated with exact validation results and next phase.

### Phase 8E: AI receipt extraction prompt QA and schema validation

### Goal

Validate AI extraction JSON at runtime before it can become a receipt draft, while keeping the manual simulator local-only and draft-only.

### Scope

- Strengthen the receipt extraction prompt template with strict JSON output rules.
- Validate AI extraction provider results before `saveReceiptDraft` is called.
- Validate merchant, receipt date, currency, total, items, source metadata, warnings, and confidence where applicable.
- Reject malformed extraction results before any IndexedDB mutation.
- Add warnings, not automatic confirmation, for total/item mismatches, unknown categories, unclear items, and low confidence.
- Keep AI extraction output limited to `receiptDrafts` and `receiptDraftItems`.
- Add tests for valid extraction, missing required fields, malformed items, invalid currency or amounts, mismatch warnings, unknown items, low confidence, invalid source metadata, and no partial draft creation.
- Update product, architecture, decision, and progress docs.

### Non-goals

- No real AI API calls.
- No Gmail, Drive, Docs, OAuth, backend, scheduled sync, or OCR integration.
- No receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring, FX, or Dashboard semantic changes.
- No direct transactions, final receipts, final receipt items, recurring expenses, or FX writes from AI extraction.

### Acceptance

- Invalid AI extraction results return validation errors before receipt draft writes.
- Valid AI extraction results still save editable receipt drafts only.
- Total/item mismatches, unknown categories, unclear items, and low confidence are surfaced as review warnings or flags.
- A failed AI extraction validation leaves receipt drafts, draft items, transactions, final receipts, and final receipt items unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated with exact validation results and next phase.

### Phase 8F: MVP stabilization and manual QA pass

#### Goal

Stabilize the current local-first MVP with a documented manual QA checklist and regression coverage before any post-MVP integration planning starts.

#### Scope

- Add or update a QA checklist for manual browser testing.
- Verify the current MVP workflows:
  - manual transaction CRUD;
  - recurring expense CRUD;
  - receipt paste parser -> draft -> review -> confirm;
  - manual AI extraction simulator -> draft -> review -> confirm;
  - item analytics, search, filter, and drilldown;
  - Dashboard monthly trends;
  - JSON export, reset, and restore;
  - CSV export;
  - transaction CSV import preview/confirm;
  - recurring CSV import preview/confirm;
  - display currency and manual FX rates.
- Fix only small bugs found during QA.
- Improve unclear labels, empty states, or validation messages only when low-risk.
- Add focused regression tests for any bugs fixed or coverage gaps found.
- Update architecture, decision, product, QA, and progress docs with results and known limitations.

#### Non-goals

- No new product features.
- No real Gmail, Drive, Docs, OAuth, backend, AI API, OCR, live FX, bank API, crypto, brokerage, bank matching, or payment execution integration.
- No semantic changes for transactions, receipts, recurring expenses, FX, JSON backup/restore, CSV import/export, or Dashboard analytics.
- No bypassing service or repository boundaries.

#### Acceptance

- QA checklist documents the manual browser pass and known limitations.
- Critical flows are verified through browser smoke, automated regression tests, or an explicitly recorded limitation.
- Any bug fixes have focused regression tests.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` is updated with exact validation results and the next recommended phase.

## Phase 9A: Gmail, Drive, and Docs integration planning

### Goal

Define the future Google source integration architecture and guardrails before any real OAuth, API client, backend, or data sync work starts.

### Scope

- Add a dedicated Google integration planning document.
- Define future Gmail, Google Drive, and Google Docs source-provider architecture.
- Define OAuth, consent, security, privacy, logging, and deletion requirements.
- Define minimal Google scopes and why each scope is or is not appropriate for early implementation.
- Decide when a backend is required for OAuth token handling, scheduled sync, and restricted-scope data.
- Define receipt discovery rules for Gmail, Drive, and Docs.
- Define duplicate detection for imported messages, files, documents, and extracted content.
- Define how Google source text flows through extraction validation, receipt drafts, review, and confirmation.
- Define expected failure modes, rate limits, user consent, and data deletion behavior.
- Add future implementation phases for Google integration.
- Update product, architecture, decision, QA, and progress docs where relevant.

### Non-goals

- No OAuth implementation.
- No Google packages or API clients.
- No backend code.
- No real Gmail, Drive, or Docs sync.
- No scheduled sync or background jobs.
- No real AI API calls.
- No runtime product behavior changes.

### Acceptance

- `GOOGLE_INTEGRATION_PLAN.md` documents the future provider architecture, scopes, backend decision, discovery rules, duplicate detection, failure handling, privacy, deletion, and rollout phases.
- `PLAN.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PRODUCT_SPEC.md`, `QA_CHECKLIST.md`, and `PROGRESS.md` reflect Phase 9A as planning-only.
- Docs state that imported Google source text can create validated receipt drafts only, and Dashboard impact still requires human review and explicit receipt confirmation.
- Docs state that Gmail body import and scheduled sync require backend/security planning before implementation.
- Product runtime behavior is unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.

## Phase 9B: Mock Google source provider boundary

### Goal

Add a local-only mock source-provider boundary for future Gmail, Google Drive, and Google Docs receipt ingestion while preserving the existing receipt draft, review, and confirmation semantics.

### Scope

- Add mock/local Gmail, Google Drive, and Google Docs receipt text source providers.
- Keep providers behind `ReceiptTextSourceProvider` and service/repository boundaries.
- Add mock source records with source type, external id, title or sender, received or modified date, raw text, and stable content hash metadata.
- Route selected mock source text through the existing local AI extraction simulator and runtime extraction validation.
- Save validated output as receipt drafts and receipt draft items only.
- Preserve source metadata on created drafts and confirmed receipts.
- Add duplicate detection for already-ingested mock source records using provider kind plus external id and/or content hash.
- Add a small Receipts screen entry point for selecting mock Google sources when consistent with the existing UI.
- Add tests for provider listing, source metadata, duplicate detection, draft creation, invalid extraction rejection, and unchanged Dashboard data before confirmation.
- Update product, architecture, decisions, QA, and progress docs.

### Non-goals

- No real Gmail, Google Drive, or Google Docs API calls.
- No OAuth implementation.
- No Google packages.
- No backend code, scheduled sync, polling, or push notifications.
- No real AI API calls.
- No OCR, live FX, bank APIs, crypto/brokerage, bank matching, or payment execution.
- No changes to receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, or Dashboard semantics.

### Acceptance

- Mock Gmail, Drive, and Docs providers can list local receipt-like source candidates.
- A selected mock source can be ingested into a validated receipt draft through the existing AI extraction path.
- Created drafts preserve source kind, external id, title/sender, received or modified date, source provider name, extraction provider metadata, and content hash.
- Duplicate mock sources are rejected safely before mutation.
- Invalid extraction output is rejected before draft writes.
- Dashboard, Transactions, final Receipts, receipt items, recurring expenses, FX settings, JSON backup/restore, and CSV behavior remain unchanged before receipt confirmation.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.

## Phase 9C: Google OAuth/backend readiness skeleton

### Goal

Add a disabled-by-default readiness boundary for future real Google OAuth and Gmail, Google Drive, and Google Docs source providers without implementing OAuth, calling Google APIs, adding a backend, or storing tokens.

### Scope

- Add `.env.example` placeholders for future Google client id, redirect URI, backend base URL, and feature flags.
- Add a small Google integration config/status model that reads only Vite environment placeholders and does not expose configured values in UI state.
- Add disabled placeholder providers for future real Gmail, Google Drive, and Google Docs source providers.
- Keep placeholder providers from calling network APIs and return no candidates while disabled.
- Add a Settings placeholder that shows `Google integration planned / not connected` with no connect action.
- Keep real Google integration feature flags off by default.
- Add tests for disabled defaults, non-exposure of env values, disabled providers, and no network calls.
- Update product, architecture, decisions, Google integration plan, and progress docs.

### Non-goals

- No OAuth flow or redirect handling.
- No real Gmail, Google Drive, or Google Docs API calls.
- No Google packages or new dependencies.
- No backend implementation.
- No token, refresh token, client secret, grant, cursor, or provider session storage.
- No changes to mock Google source ingestion from Phase 9B.
- No changes to receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, or Dashboard semantics.

### Acceptance

- Future Google environment variable names are documented in `.env.example` and docs with placeholder values only.
- Google integration defaults to disabled and not connected.
- Settings shows a read-only planned/not connected placeholder and no connect action.
- Disabled real-provider placeholders cannot fetch candidates from Google and do not call network APIs.
- Tests prove disabled defaults and no provider network calls.
- Package dependencies remain unchanged.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` states the next recommended phase.

## Phase 9D: OAuth/backend decision record and disabled backend skeleton

### Goal

Decide the safest future Google OAuth/backend architecture and add a disabled no-op backend boundary without implementing OAuth, token storage, Google API calls, scheduled sync, or backend runtime behavior.

### Scope

- Record the backend decision for future Google OAuth, callback handling, authorization response exchange, long-lived provider access, scheduled sync, revocation, and deletion.
- Add disabled backend environment placeholders for future auth, sync, and revocation feature flags.
- Add a minimal TypeScript backend readiness contract, endpoint definitions, and disabled client that cannot call network APIs.
- Define future endpoint names for OAuth start, OAuth callback, provider status, disconnect, source candidate listing/text fetch, and scheduled sync status.
- Document token storage expectations, revocation/disconnect, logging restrictions, user data deletion, and first future Gmail/Drive/Docs scopes.
- Add tests proving the backend/OAuth boundary is disabled by default, does not expose configured placeholder values, does not persist credentials, and does not call `fetch`.
- Update Google integration, architecture, decision, product, QA, and progress docs.

### Non-goals

- No real OAuth flow or redirect handler.
- No Google Identity Services, Google API packages, or API clients.
- No backend server implementation.
- No authorization code exchange, token storage, refresh-token handling, provider sessions, cookies, or secrets.
- No Gmail, Google Drive, Google Docs, backend, or scheduled-sync network calls.
- No changes to mock Google source ingestion, receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, or Dashboard semantics.

### Acceptance

- `DECISIONS.md` states that production Gmail import, broad Drive/Docs access, scheduled sync, refresh-token handling, revocation, and provider-data deletion require a backend.
- `GOOGLE_INTEGRATION_PLAN.md` documents the frontend-only exception for future manual selected-file Drive/Docs import using the narrowest practical selected-file scope.
- `.env.example` includes disabled backend auth, sync, and revocation flags plus placeholder-only client id, redirect URI, and backend URL.
- Backend endpoint definitions and client are disabled/no-op and make no network calls.
- Tests prove disabled defaults, no placeholder value exposure, no network calls, and no credential persistence behavior.
- Typecheck, lint, tests, build, audit, and `git diff --check` pass.
- `PROGRESS.md` states the next recommended phase.
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
