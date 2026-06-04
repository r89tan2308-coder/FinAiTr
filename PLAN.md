# Implementation Plan

## Scope rule

The first MVP is limited to:

- manual transactions;
- pasted receipt text parsing;
- receipt review and confirmation;
- recurring expenses;
- dashboard analytics;
- manual local currency conversion settings for USD, RUB, EUR, and GBP.

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
- Monthly trend in a later analytics sub-phase.
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

### Phase 7D: Monthly trend and analytics polish

#### Goal

Finish the remaining Dashboard analytics MVP items after the AI ingestion architecture is documented.

#### Scope

- Monthly trend analytics from local transactions.
- Broader Dashboard analytics polish.
- Continued double-counting protection around receipt-linked transactions.
- No external integrations.

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

### Phase 8B: Core MVP polish and backup

### Goal

Stabilize the local-first MVP before any deferred integrations.

### Scope

- Mobile UX polish.
- PWA installability improvements.
- Loading, empty, and error states.
- JSON export/import for local backup.
- Clear all local data with strong confirmation.
- Security and data ownership notes.

### Acceptance criteria

- App works well at 360 to 430 px widths.
- PWA manifest exists.
- User can export and import local backup JSON.
- User can clear local data with confirmation.
- No secrets are committed.
- Typecheck and build pass.
- `PROGRESS.md` is updated.

## Deferred until after first MVP

- CSV import/export.
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
