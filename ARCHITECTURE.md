# Architecture

## Current repository state

The repository now has a Phase 6 React + TypeScript + Vite app shell with local-first data models, Dexie-backed IndexedDB persistence, service-loaded screens, manual transaction CRUD, manual local currency conversion settings, a tested deterministic receipt text parser core, a Receipts screen parser preview for pasted text, persisted receipt drafts, receipt draft review/edit, reviewed-draft confirmation into final receipt data plus one linked transaction, and recurring expense CRUD.

Existing files:

- `AGENTS.md`
- `finance_ai_tracker_codex_plan_ru.md`
- project planning docs;
- Vite app scaffold;
- PWA manifest and SVG app icon placeholders;
- dashboard, transaction, receipt, recurring, category, and settings screens reading through the finance data service;
- manual transaction create, edit, delete, validation, filtering, and sorting;
- deterministic receipt text parser module and parser service wrapper;
- pasted receipt text UI with parser preview;
- persisted receipt draft storage kept separate from confirmed receipts and dashboard analytics.
- Settings controls for display currency and manual USD/RUB/EUR/GBP rates.
- receipt draft review/edit UI for saved drafts.
- explicit reviewed-draft confirmation that creates one final receipt, final receipt items, and one receipt-linked transaction.
- recurring expense create, edit, delete, list, validation, and display-only monthly estimate.

Still missing by design until later phases:

- bank matching or reconciliation for receipt-linked transactions;
- full item-level dashboard analytics and search/trends;
- backup/import/export and local data reset UI;

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

Phase 6 uses this layout:

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
    currencySettings.test.ts
    currencySettings.ts
    financeViews.ts
    financeViews.test.ts
    models.ts
    recurringValidation.ts
    recurringValidation.test.ts
    transactionValidation.ts
    transactionValidation.test.ts
  pages/
    DashboardPage.tsx
    TransactionsPage.tsx
    ReceiptsPage.test.tsx
    ReceiptsPage.tsx
    RecurringPage.test.tsx
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

Recurring expense writes use the same boundary and intentionally do not create transactions:

```text
RecurringPage
  -> financeDataService recurring expense action
  -> financeRepository recurring expense write
  -> Dexie recurringExpenses table
  -> loadFinanceData
  -> rebuilt FinanceOverview
  -> Recurring screen and Dashboard recurring estimate rerender
```

## Local persistence

The local database is `finaitr-local`.

Dexie tables:

- `accounts`
- `categories`
- `transactions`
- `receipts`
- `receiptItems`
- `receiptDrafts`
- `receiptDraftItems`
- `recurringExpenses`
- `appMeta`

`appMeta` stores the seed version and local currency settings. Phase 2 seeds the database once with local demo data and uses `bulkPut` so future phases can add write flows without components knowing the storage details. Currency settings are read from `appMeta` when present and fall back to the local default seed when missing.

If IndexedDB is unavailable or a load fails, `financeDataService` returns the seed snapshot with `storageMode: "seed_fallback"`. This keeps tests and constrained browser environments renderable without replacing IndexedDB as the app's primary local persistence layer.

Dev/test browser data reset note: the local app database is the browser IndexedDB database named `finaitr-local`. Until Phase 8 adds an in-app backup/reset workflow, development verification data can be cleared outside the product UI through browser storage tools or a dev console call to `indexedDB.deleteDatabase("finaitr-local")`, followed by an app reload. Do not commit browser IndexedDB contents or runtime verification data.

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

These helpers convert transactions, recurring expenses, and receipt item totals into the configured display currency before aggregation. Conversion is display-only: source records keep their original `amount` and `currency`, and `buildFinanceOverview` must not rewrite transaction, receipt, receipt draft, or recurring records.

The Dashboard monthly spend remains transaction-based. The recurring monthly total is a separate active-recurring estimate and must not be added into transaction spend until a future phase explicitly creates normal transactions from recurring expenses.

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

## Recurring expenses

Phase 6 supports recurring expense CRUD through `RecurringPage`.

Create/edit fields:

- name;
- merchant or description;
- amount;
- currency;
- account;
- category;
- frequency: weekly, monthly, or yearly;
- next due date;
- status: active or inactive;
- note;
- tags.

Validation lives in `src/domain/recurringValidation.ts` and requires:

- name;
- positive amount;
- currency;
- account;
- valid frequency;
- valid ISO next due date.

The recurring list is sorted by next due date and shows each source amount/currency alongside a display-currency monthly equivalent. Active recurring expenses are normalized to a monthly estimate with weekly values multiplied by `52 / 12` and yearly values divided by `12`.

Recurring CRUD writes only to `recurringExpenses`. It does not create transactions, schedule background jobs, send notifications, detect subscriptions, or affect Dashboard transaction spend.

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
- `transactionId`
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
- `flags`
- `confidence`

### ReceiptDraft

- `id`
- `date`
- `merchant`
- `total`
- `currency`
- `rawText`
- `status`: `draft`, `reviewed`, `confirmed`
- `source`: `pasted_text`, `manual_upload_mock`
- `confidence`
- `warnings`
- `confirmedReceiptId`
- `linkedTransactionId`
- `createdAt`
- `updatedAt`

### ReceiptDraftItem

- `id`
- `draftId`
- `rawLine`
- `rawName`
- `normalizedName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `categoryId`
- `tags`
- `confidence`
- `flags`
- `kind`: `item`, `discount`, `fee`, `tax`, `total`, `unclear`

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
- `note`
- `status`: `active`, `paused`, `cancelled`
- `tags`

### CurrencySettings

- `displayCurrency`: `USD`, `RUB`, `EUR`, or `GBP`
- `ratesToRub`: local manual rates using RUB as the pivot currency
- `source`
- `updatedAt`

The default rates are local manual seed values from Bank of Russia official rates for 2026-06-03:

- USD: 72.5597 RUB
- RUB: 1 RUB
- EUR: 84.6096 RUB
- GBP: 97.4985 RUB

No live exchange-rate fetcher or online currency provider is part of the MVP.

Manual FX settings affect presentation and aggregate views only. They do not overwrite original transaction amounts, receipt totals, receipt draft totals, or recurring expense amounts. Receipt drafts preserve their parsed receipt currency until a later review/confirmation phase explicitly promotes them.

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

Parser output does not affect dashboard analytics. Phase 5A allows a parsed preview to be saved as a persisted draft, but receipt review, confirmation, transaction linking, and item-level dashboard effects are deferred to later phases.

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

Parsed receipt preview state starts inside `ReceiptsPage`. In Phase 5A, the user can explicitly save that preview as a local receipt draft. No transaction is created, and Dashboard analytics continue to use only existing persisted transaction/receipt analytics data.

## Receipt Draft Persistence

Phase 5A persists parsed receipt drafts in separate Dexie tables:

- `receiptDrafts`
- `receiptDraftItems`

These tables are intentionally separate from `receipts` and `receiptItems`. This keeps saved drafts visible on the Receipts screen without changing Dashboard metrics, pending receipt counts, top products, or transaction totals before the review/confirm phase.

The write flow is:

```text
ReceiptsPage
  -> financeDataService save/delete draft action
  -> financeRepository draft write/delete
  -> Dexie receiptDrafts and receiptDraftItems tables
  -> loadFinanceData
  -> Receipts screen rerenders with saved drafts
```

Receipt draft records store:

- merchant;
- date;
- total;
- currency;
- raw pasted text;
- status: `draft`, `reviewed`, or `confirmed`;
- source;
- confidence;
- parser warnings;
- created and updated timestamps.

Receipt draft item records store:

- raw line;
- raw item name;
- normalized item name;
- quantity;
- unit price;
- total price;
- category suggestion;
- tags;
- confidence;
- flags;
- parser line kind.

Phase 5B uses `draft` and `reviewed` statuses during review. Phase 5C-A uses `confirmed` only after explicit confirmation creates final receipt records and a linked transaction.

## Receipt Draft Review UI

Phase 5B adds a draft-only review/edit flow on `src/pages/ReceiptsPage.tsx`.

The user can open a saved receipt draft from the Saved drafts list and edit:

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

Raw receipt text, raw item line, and raw item name remain read-only evidence. The review form can save draft edits or mark the draft as `reviewed`. Both actions write only to `receiptDrafts` and `receiptDraftItems` through `financeDataService` and `financeRepository`.

The write flow is:

```text
ReceiptsPage review form
  -> financeDataService update draft action
  -> financeRepository update draft write
  -> Dexie receiptDrafts and receiptDraftItems tables
  -> loadFinanceData
  -> Receipts screen rerenders with edited/reviewed draft
```

Item sum and receipt total are shown during review, with a warning when they do not match. Saving or marking reviewed still writes only to `receiptDrafts` and `receiptDraftItems`; reviewed drafts do not affect Dashboard until the user explicitly confirms them.

## Receipt Confirmation

Phase 5C-A adds explicit confirmation for reviewed receipt drafts only.

The confirmation write flow is:

```text
ReceiptsPage reviewed draft confirm controls
  -> financeDataService confirm draft action
  -> financeRepository confirmReceiptDraft
  -> Dexie transaction across accounts, categories, transactions, receipts, receiptItems, receiptDrafts, and receiptDraftItems
  -> loadFinanceData
  -> Dashboard and Receipts rerender from the refreshed snapshot
```

Confirmation creates:

- one final `Receipt` with `status: confirmed` and `transactionId`;
- final `ReceiptItem` records linked to that final receipt;
- one `Transaction` with `source: receipt` and `receiptId`;
- draft linkage fields `confirmedReceiptId` and `linkedTransactionId`, with draft `status: confirmed`.

The transaction uses the reviewed receipt date, merchant, total amount, receipt currency, selected account, and selected transaction category. The UI defaults the transaction category to groceries/food when available, otherwise the first expense category. The account must be selected before confirmation.

Confirmed draft idempotency is enforced in the repository. A draft already marked `confirmed` returns its existing linked receipt, receipt items, and transaction instead of creating duplicates. Normal draft save/update paths reject `confirmed` status so confirmation cannot be bypassed.

Dashboard spend, category, and merchant totals update through the created transaction. Receipt items are persisted for receipt/product detail and must not independently add to Dashboard spend totals.

## Analytics rules

Dashboard analytics must support:

- transaction-level spend;
- receipt item-level spend;
- combined spend without double-counting receipt-linked transactions.
- a separate recurring expense estimate that does not change transaction spend.

When a receipt is confirmed and linked to a transaction, category and item analytics should use receipt items for item-level detail while transaction totals remain a fallback for non-receipt expenses.

## Provider boundaries

Future integrations must use interfaces first:

- `OcrProvider`: image or file to text;
- `ReceiptExtractionProvider`: text to structured draft receipt;
- `CategoryClassifier`: item text to category/tags;
- source adapters for future bank, Google Drive, CSV, crypto, and brokerage data.

The first MVP uses deterministic local logic and mock providers only.
