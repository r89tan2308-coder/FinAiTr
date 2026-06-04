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

Track subscriptions and repeating charges.

### Scope

- Add recurring expense list.
- Add create, edit, pause, and cancel.
- Support weekly, monthly, and yearly frequencies.
- Calculate next due date.
- Show upcoming charges.
- Optionally support "mark paid" only if it remains small and creates a normal transaction.

### Acceptance criteria

- User can manage recurring expenses.
- Next due date is calculated.
- Upcoming charges list works.
- Monthly recurring total is available to dashboard.
- Helper tests cover due-date calculations.
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
- Monthly trend.
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

## Phase 8: Core MVP polish and backup

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
- Real bank transaction aggregation.
- Crypto tracking.
- Brokerage or investment tracking.
- Live multi-currency market rates.
- Backend sync.
- Multi-user auth.
- Payment execution.

These items require explicit planning updates before implementation.
