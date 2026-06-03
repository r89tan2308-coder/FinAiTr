# Architecture

## Current repository state

The repository now has a Phase 4B React + TypeScript + Vite app shell with local-first data models, Dexie-backed IndexedDB persistence, service-loaded screens, manual transaction CRUD, a tested deterministic receipt text parser core, and a Receipts screen parser preview for pasted text.

Existing files:

- `AGENTS.md`
- `finance_ai_tracker_codex_plan_ru.md`
- project planning docs;
- Vite app scaffold;
- PWA manifest and SVG app icon placeholders;
- dashboard, transaction, receipt, recurring, category, and settings screens reading through the finance data service;
- manual transaction create, edit, delete, validation, filtering, and sorting;
- deterministic receipt text parser module and parser service wrapper;
- pasted receipt text UI with parser preview kept in component state.

Still missing by design until later phases:

- receipt review flow;
- recurring expense CRUD;
- full dashboard analytics;
- Git repository metadata in this folder.

## Target stack

Implemented Phase 1 stack:

- React + TypeScript + Vite;
- mobile-first PWA;
- plain CSS for styling;
- lucide-react for UI icons;
- Dexie for IndexedDB persistence;
- Vitest, Testing Library, and jsdom for a smoke test;
- ESLint flat config.

Planned later stack additions:

- Recharts for lightweight dashboard charts if dashboard requirements outgrow CSS tables and bars.

No backend is required for the first MVP.

## Architecture principles

- Keep data local-first.
- Keep UI components separate from persistence details.
- Read and write data through service or repository modules.
- Keep external source/provider behavior behind interfaces.
- Use mock implementations for all future integrations.
- Avoid provider credentials in code, config, tests, or docs.

## Implemented source layout

Phase 4B uses this layout:

```text
src/
  app/
    App.tsx
    App.test.tsx
    routes.ts
  components/
    AppShell.tsx
    MetricTile.tsx
    PageSection.tsx
    ProgressBar.tsx
  data/
    seedData.ts
  domain/
    financeViews.ts
    financeViews.test.ts
    models.ts
    transactionValidation.ts
    transactionValidation.test.ts
  pages/
    DashboardPage.tsx
    TransactionsPage.tsx
    ReceiptsPage.test.tsx
    ReceiptsPage.tsx
    RecurringPage.tsx
    CategoriesPage.tsx
    SettingsPage.tsx
  persistence/
    db.ts
    repositories/
      financeRepository.ts
      financeRepository.test.ts
  services/
    financeDataService.ts
    receiptParserService.ts
    receiptParserService.test.ts
  receipt-parser/
    categoryGuessing.ts
    fixtures.ts
    parser.ts
    parser.test.ts
    types.ts
  test/
    setup.ts
  main.tsx
  styles.css
  vite-env.d.ts
public/
  app-icon.svg
  favicon.svg
  manifest.webmanifest
```

Future phases should extend the layout toward:

```text
src/
  domain/
    models.ts
    categories.ts
    analytics.ts
    recurring.ts
  persistence/
    db.ts
    repositories/
  services/
    transactionService.ts
    receiptService.ts
    recurringService.ts
  receipt-parser/
    parser.ts
    categoryGuessing.ts
    fixtures/
  providers/
    ocrProvider.ts
    receiptExtractionProvider.ts
    mocks/
```

Screens now read from `src/services/financeDataService.ts`. That service loads a `FinanceSnapshot` through `src/persistence/repositories/financeRepository.ts`, which seeds and reads IndexedDB through Dexie when available and falls back to seed data in non-browser/test contexts.

Transaction writes also go through this boundary:

```text
TransactionsPage
  -> financeDataService transaction action
  -> financeRepository write
  -> Dexie transactions table
  -> loadFinanceData
  -> rebuilt FinanceOverview
  -> Dashboard and lists rerender
```

## Local persistence

The local database is `finaitr-local`.

Dexie tables:

- `accounts`
- `categories`
- `transactions`
- `receipts`
- `receiptItems`
- `recurringExpenses`
- `appMeta`

`appMeta` stores the seed version. Phase 2 seeds the database once with local demo data and uses `bulkPut` so future phases can add write flows without components knowing the storage details.

If IndexedDB is unavailable or a load fails, `financeDataService` returns the seed snapshot with `storageMode: "seed_fallback"`. This keeps tests and constrained browser environments renderable without replacing IndexedDB as the app's primary local persistence layer.

## Derived views

`src/domain/financeViews.ts` derives screen-ready data from `FinanceSnapshot`:

- monthly transaction spend;
- monthly recurring total;
- pending receipt count;
- category spend;
- merchant spend;
- top receipt products/items;
- recent transactions;
- recent receipts;
- recurring expenses sorted by due date.

These helpers are intentionally lightweight. Phase 6 should expand them into the full analytics layer and add double-counting tests for receipt-linked transactions.

## Manual transactions

Phase 3 supports manual transaction CRUD through `TransactionsPage`.

Create/edit fields:

- date;
- amount;
- currency;
- merchant;
- account;
- category;
- note;
- tags.

Validation lives in `src/domain/transactionValidation.ts` and requires:

- date;
- positive amount;
- currency;
- account;
- merchant or note.

The current transaction model does not include a direct expense/income field. Transaction type behavior is therefore not exposed as a separate control in Phase 3; category type remains available in the category model for future use.

The transaction list supports:

- text search across merchant, note, source, category name, and tags;
- exact date filter;
- category filter;
- newest, oldest, amount high, and amount low sorting;
- inline edit;
- delete with an explicit confirm step.

## Core data model

### Account

- `id`
- `name`
- `type`: `cash`, `debit_card`, `credit_card`, `bank_mock`, `other`
- `currency`
- `openingBalance`
- `currentBalance`
- `isArchived`

### Transaction

- `id`
- `date`
- `amount`
- `currency`
- `merchant`
- `accountId`
- `categoryId`
- `description`
- `source`: `manual`, `receipt`, `csv_mock`, `adjustment`
- `receiptId`
- `tags`
- `createdAt`
- `updatedAt`

### Receipt

- `id`
- `date`
- `merchant`
- `total`
- `currency`
- `rawText`
- `status`: `draft`, `needs_review`, `confirmed`, `rejected`
- `source`: `pasted_text`, `manual_upload_mock`
- `confidence`
- `warnings`
- `createdAt`
- `updatedAt`

### ReceiptItem

- `id`
- `receiptId`
- `rawName`
- `normalizedName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `categoryId`
- `tags`
- `confidence`

### Category

- `id`
- `name`
- `parentId`
- `type`: `expense`, `income`, `transfer`
- `color`
- `icon`

### RecurringExpense

- `id`
- `name`
- `merchant`
- `amount`
- `currency`
- `frequency`: `weekly`, `monthly`, `yearly`
- `nextDueDate`
- `categoryId`
- `accountId`
- `status`: `active`, `paused`, `cancelled`

## Receipt Parser Core

```text
raw pasted text
  -> normalize lines
  -> detect merchant, date, total
  -> detect item-like lines
  -> extract item name, quantity, unit price, total price
  -> guess category and tags
  -> preserve discounts, taxes, fees, and unclear lines for review
  -> produce parsed draft with confidence, item flags, and warnings
```

Phase 4A adds this as pure deterministic local logic in `src/receipt-parser`. It must not call OCR APIs, LLM APIs, Google Drive, bank APIs, or any other external provider.

Parser output is intentionally not persisted yet and does not affect dashboard analytics. Receipt draft persistence, receipt review, confirmation, transaction linking, and item-level dashboard effects are deferred to later phases.

`src/services/receiptParserService.ts` exposes `parsePastedReceiptText(rawText)`, keeping the parser behind a service boundary for future UI and provider orchestration.

Parser behavior:

- preserves original raw receipt text;
- preserves raw item names;
- stores normalized item names separately;
- detects merchant, date, currency, and total when possible;
- defaults currency to `USD` when no currency signal is present;
- parses item totals and simple quantity/unit-price patterns;
- classifies discounts, taxes, and fees as explicit parsed lines instead of discarding them;
- stores unclear text lines as parser warnings;
- flags uncategorized and low-confidence items for review;
- warns when item sum does not match detected receipt total.

The category guesser is heuristic and local-only. Unknown products use `uncategorized`.

## Receipt Parser Preview UI

Phase 4B adds pasted text intake directly on `src/pages/ReceiptsPage.tsx`.

The Receipts screen now supports:

- entering raw receipt text in a mobile-friendly textarea;
- a `Parse receipt` action that calls `parsePastedReceiptText`;
- a `Use sample` helper backed by the local parser fixture;
- a `Clear` action that resets pasted text, parser errors, and parsed preview state;
- empty, loading, and error preview states;
- structured preview cards for merchant, date, currency, total, and confidence;
- parser warnings, including mismatch warnings;
- mobile item cards with raw name, normalized name, quantity, unit price, total price, category suggestion, confidence, flags, tags, and raw line.

Parsed receipt preview state stays inside `ReceiptsPage`. No parsed receipt draft is written to Dexie in Phase 4B, no transaction is created, and Dashboard analytics continue to use only existing persisted local data.

## Analytics rules

Dashboard analytics must support:

- transaction-level spend;
- receipt item-level spend;
- combined spend without double-counting receipt-linked transactions.

When a receipt is confirmed and linked to a transaction, category and item analytics should use receipt items for item-level detail while transaction totals remain a fallback for non-receipt expenses.

## Provider boundaries

Future integrations must use interfaces first:

- `OcrProvider`: image or file to text;
- `ReceiptExtractionProvider`: text to structured draft receipt;
- `CategoryClassifier`: item text to category/tags;
- source adapters for future bank, Google Drive, CSV, crypto, and brokerage data.

The first MVP uses deterministic local logic and mock providers only.
