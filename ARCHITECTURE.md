# Architecture

## Current repository state

The repository now has a Phase 8D-A React + TypeScript + Vite app shell plus Phase 7D Dashboard trend polish with local-first data models, Dexie-backed IndexedDB persistence, service-loaded screens, manual transaction CRUD, manual local currency conversion settings, a tested deterministic receipt text parser core, a Receipts screen parser preview for pasted text, persisted receipt drafts, receipt draft review/edit, reviewed-draft confirmation into final receipt data plus one linked transaction, recurring expense CRUD, transaction-only monthly trend analytics, searchable confirmed receipt item analytics, future receipt ingestion contracts, a local-only manual AI extraction simulator that saves AI-extracted output as receipt drafts only, and Settings tools for local JSON backup export, local JSON import/restore, safe reset to seed data, read-only local CSV exports, and transaction CSV import preview/confirm.

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
- Dashboard transaction-only monthly trend analytics with spend, optional income split, net values, and compact category breakdowns.
- Dashboard item analytics from confirmed final receipt items only, with current-month/all-time filters, item search, category filtering, and source receipt item drilldown.
- future receipt ingestion contracts for manual paste, Gmail, Google Drive, Google Docs, and AI receipt extraction.
- a Phase 8A local manual AI extraction simulator on the Receipts screen that accepts email-like or document-like text, preserves source metadata, and opens the saved draft in the existing review flow.
- Phase 8B Settings tools for versioned local JSON backup export and strong-confirmation local data reset.
- Phase 8C Settings tools for validated local JSON backup import/restore with preview and strong confirmation.
- Phase 8D-A Settings tools for read-only transactions, confirmed receipt items, and recurring expenses CSV export.
- Phase 8D-B1 Settings tools for transactions-only CSV import preview, row validation, duplicate warnings, strong confirmation, and confirmed local writes.

Still missing by design until later phases:

- bank matching or reconciliation for receipt-linked transactions;
- recurring expense CSV import;
- receipt item, final receipt, or receipt draft CSV import;

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

Phase 8D-B1 uses this layout:

```text
src/
  app/
    appInfo.ts
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
    csvExport.test.ts
    csvExport.ts
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
    DashboardPage.test.tsx
    TransactionsPage.tsx
    ReceiptsPage.test.tsx
    ReceiptsPage.tsx
    RecurringPage.test.tsx
    RecurringPage.tsx
    CategoriesPage.tsx
    SettingsPage.test.tsx
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
  receipt-ingestion/
    fixtures.ts
    manualAiExtractionSimulator.test.ts
    manualAiExtractionSimulator.ts
    receiptExtractionContract.ts
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
    gmailReceiptSourceProvider.ts
    googleDocsReceiptSourceProvider.ts
    googleDriveReceiptSourceProvider.ts
    manualPasteReceiptSourceProvider.ts
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

Dev/test browser data reset note: the local app database is the browser IndexedDB database named `finaitr-local`. Phase 8B adds an in-app strong-confirmation reset that clears app-owned tables and restores seed data. Browser storage tools or a dev console call to `indexedDB.deleteDatabase("finaitr-local")` remain acceptable for development cleanup outside product UI. Do not commit browser IndexedDB contents or runtime verification data.

## Local JSON backup, restore, and reset

Phase 8B adds local data ownership export/reset actions to Settings. Phase 8C adds local JSON import/restore for previously exported FinAiTr backups.

Backup export flow:

```text
SettingsPage Export JSON
  -> financeDataService exportLocalJsonBackupForDownload
  -> financeRepository exportLocalJsonBackup
  -> getFinanceSnapshot plus appMeta records
  -> versioned JSON backup object
  -> browser Blob download
```

The backup schema is versioned separately from the Dexie schema:

- `schemaVersion`: local backup format version, currently `1`;
- `app`: app name and version from `src/app/appInfo.ts`;
- `exportedAt`: ISO timestamp;
- `seedVersion`: current seed data version;
- `storageMode`: `indexeddb` or `seed_fallback`;
- `tables.settings.currencySettings`: display currency and manual RUB FX rates;
- `tables.accounts`;
- `tables.categories`;
- `tables.transactions`;
- `tables.receipts`;
- `tables.receiptItems`;
- `tables.receiptDrafts`;
- `tables.receiptDraftItems`;
- `tables.recurringExpenses`;
- `tables.appMeta`.

Source metadata is not stored in a separate table. It is exported inside `receipts` and `receiptDrafts` when present.

Backup export is read-only after normal seed initialization. It must not rewrite transactions, receipts, receipt items, receipt drafts, recurring expenses, or FX settings.

Restore preview flow:

```text
SettingsPage Backup JSON file input
  -> browser File/FileReader text read
  -> financeDataService previewLocalJsonBackupRestoreFromText
  -> JSON.parse
  -> financeRepository buildLocalJsonRestorePreview
  -> schema and record validation
  -> record counts, exportedAt, display currency, and warnings
```

Restore write flow:

```text
SettingsPage Restore backup
  -> exact confirmation phrase
  -> financeDataService restoreLocalJsonBackupAndReload
  -> financeRepository restoreLocalJsonBackup
  -> validate backup again before any write
  -> Dexie transaction clears app-owned tables and appMeta
  -> bulkPut backup accounts/categories/transactions/receipts/items/drafts/recurring
  -> restore appMeta with seedVersion and serialized currencySettings
  -> loadFinanceData
  -> shared App state refreshes Dashboard and pages
```

Restore validation checks the backup is a FinAiTr backup with `schemaVersion: 1`, valid app metadata, valid export timestamp, valid storage mode, required table arrays, valid currency settings, basic record shapes, and no duplicate table primary keys. Invalid JSON, unsupported schema versions, missing tables, malformed records, or duplicate ids are rejected before app-owned data is cleared.

Restore preserves original transaction amounts/currencies, receipt totals/currencies, receipt item totals, receipt draft totals/currencies, recurring amounts/currencies, source metadata, and manual FX settings from the backup. Currency conversion remains display-only after restore because Dashboard and pages rebuild derived views from the restored snapshot.

Safe reset flow:

```text
SettingsPage Reset local data
  -> exact confirmation phrase
  -> financeDataService resetLocalDataAndReload
  -> financeRepository resetLocalDataToSeed
  -> Dexie transaction clears app-owned tables and appMeta
  -> seed accounts/categories/transactions/receipts/receiptItems/recurring/appMeta
  -> loadFinanceData
  -> shared App state refreshes Dashboard and pages
```

Reset restores the current seed/baseline state, including default manual FX settings. It does not import a backup, import CSV, call external services, or alter receipt confirmation, item analytics, recurring expense, or FX semantics. Restore, reset, and CSV export are separate explicit flows.

## Local CSV export

Phase 8D-A adds read-only CSV exports to Settings. CSV export is a browser-only download flow with no backend and no import/write behavior.

CSV export flow:

```text
SettingsPage CSV export button
  -> financeDataService exportLocalCsvForDownload(kind)
  -> financeRepository exportLocalCsv(kind)
  -> getFinanceSnapshot
  -> domain csvExport builder
  -> browser Blob download
```

The supported export kinds are:

- `transactions`: transaction id, date, merchant, description, account id/name, category id/name, source, receipt id, original amount/currency, display amount/currency, tags, and timestamps.
- `confirmed_receipt_items`: final receipt item id, receipt id/date/merchant/source, useful receipt source metadata, item names, category id/name, quantity, prices, original receipt currency, display total/currency, tags, flags, and confidence.
- `recurring_expenses`: recurring id, name, merchant, account id/name, category id/name, status, frequency, next due date, original amount/currency, monthly amount, display monthly amount/currency, tags, note, and timestamps.

CSV formatting lives in `src/domain/csvExport.ts`. The serializer emits stable headers, escapes commas, quotes, CR/LF line breaks, and returns headers only for empty datasets. Export rows are derived from the loaded snapshot and sorted for stable output; source records are not mutated.

CSV export preserves original amounts and currencies. Display-currency columns use the existing local manual FX settings only for reporting. Confirmed receipt item rows use the linked final receipt currency because receipt item records do not have their own currency field.

CSV export does not change JSON backup/restore/reset behavior, receipt confirmation, item analytics, recurring expenses, FX settings, or Dashboard monthly spend semantics. Transaction CSV import is handled by the separate Phase 8D-B1 preview/confirm flow below.

## Local CSV transaction import

Phase 8D-B1 adds transactions-only CSV import to Settings. Import is browser-local, has no backend, and writes nothing until the user confirms a valid preview.

CSV transaction import flow:

```text
SettingsPage transactions CSV file input
  -> financeDataService previewTransactionCsvImportFromText(rawCsv)
  -> getFinanceSnapshot
  -> domain csvTransactionImport preview builder
  -> SettingsPage row preview with errors, warnings, and duplicate warnings
  -> SettingsPage strong confirmation phrase
  -> financeDataService confirmTransactionCsvImportAndReload(preview)
  -> financeRepository importTransactionCsvRows(validRows)
  -> Dexie transactions bulkAdd in an IndexedDB transaction
  -> loadFinanceData refreshes shared Dashboard and Transactions state
```

`src/domain/csvTransactionImport.ts` parses CSV locally, accepts Phase 8D-A transaction export headers plus simple transaction headers, validates required date, amount, currency, merchant or description, account, and category fields, and resolves account/category by id or name against the current snapshot. Invalid rows stay in the preview and block import. Unsupported currencies are warnings because the transaction model stores original currency and display conversion remains derived from manual FX settings.

Likely duplicates are warnings, not errors. The duplicate key uses date, rounded amount, uppercased currency, normalized merchant/description, and account id, and checks both existing transactions and earlier rows in the same CSV file.

Confirmed imports create new local transactions with source `csv_import` and new `tx-csv-*` ids. CSV `transaction_id`, source, receipt id, display amount, display currency, and timestamps are ignored for writes. The import path does not create receipts, receipt items, receipt drafts, recurring expenses, or external provider records.

Preview calls do not mutate IndexedDB. Confirm calls reject previews with file errors or row errors before calling the repository. Repository writes re-check IndexedDB availability, required transaction validity, active account ids, and category ids before `bulkAdd`.

## Derived views

`src/domain/financeViews.ts` derives screen-ready data from `FinanceSnapshot`:

- monthly transaction spend;
- transaction-only six-month trend with spend, income when category type marks income, net values, and category breakdowns;
- monthly recurring total;
- pending receipt count;
- category spend;
- merchant spend;
- confirmed receipt item analytics;
- confirmed receipt item analytics detail rows;
- top confirmed receipt products/items;
- recent transactions;
- recent receipts;
- recurring expenses sorted by due date.

These helpers convert transactions, recurring expenses, and receipt item totals into the configured display currency before aggregation. Conversion is display-only: source records keep their original `amount`, `totalPrice`, and `currency`, and `buildFinanceOverview` must not rewrite transaction, receipt, receipt item, receipt draft, or recurring records.

The Dashboard monthly spend remains transaction-based. The recurring monthly total is a separate active-recurring estimate and must not be added into transaction spend until a future phase explicitly creates normal transactions from recurring expenses.

Monthly trend analytics are also transaction-only. They use the selected display currency, group transactions by month, treat categories with `type: income` as income trend values, ignore transfer categories for spend/income totals, and aggregate expense categories into per-month breakdowns. Confirmed receipt items, receipt draft items, and recurring expenses are excluded from monthly trend spend so the trend cannot double-count receipt-linked transactions or planning-only recurring records.

Confirmed receipt item analytics are a separate breakdown of final receipt data, not extra spending. They are derived from `receipts` with `status: confirmed` and the linked `receiptItems`; draft, reviewed-draft, needs-review, and rejected receipt data is excluded. Current-month item analytics use the final receipt date when available and exclude confirmed receipts without a date from the current-month filter. All-time item analytics include confirmed receipts even when a receipt date is missing. Phase 7B adds filtering and drilldown by deriving source detail rows from the same confirmed final receipt items; filtering does not write to persistence and does not change transaction spend.

## Deterministic analytics vs AI receipt ingestion

Dashboard analytics and AI receipt ingestion are separate architectural concerns.

Deterministic analytics are current product behavior. They read local persisted records and derive display data from:

- manual and receipt-linked `transactions`;
- final `receipts` with `status: confirmed`;
- final `receiptItems` linked to confirmed receipts;
- local `recurringExpenses`;
- local manual `currencySettings`.

Analytics helpers must remain pure derivation code. They do not call source providers, AI providers, OCR providers, Gmail, Google Drive, Google Docs, bank APIs, or live FX APIs. Item analytics must continue to treat receipt items as a confirmed receipt breakdown, not as extra spending.

AI receipt ingestion is an intake layer. Phase 8A implements only a local manual simulator: the user pastes email-like or document-like receipt text, a mock extraction provider returns structured draft data, and the app saves that data to `receiptDrafts` and `receiptDraftItems` only. It must not write final `receipts`, final `receiptItems`, `transactions`, Dashboard analytics state, recurring expenses, or currency settings.

The only path from AI-extracted data to Dashboard impact remains:

```text
receipt source provider
  -> raw receipt text candidate
  -> receipt extraction provider
  -> receipt draft and draft items
  -> human review/edit
  -> explicit receipt confirmation
  -> one final receipt + final receipt items + one linked transaction
  -> Dashboard updates through the linked transaction and confirmed item breakdown
```

This means the current mock simulator and any future Gmail, Google Drive, Google Docs, OCR, or AI extraction providers can improve intake accuracy and coverage without bypassing the existing review/confirm accounting boundary.

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
- `source`: `manual`, `receipt`, `csv_import`, `adjustment`
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
- `source`: `pasted_text`, `manual_upload_mock`, `ai_extraction_mock`
- `sourceMetadata`: optional draft/source metadata for simulated AI extraction and future source adapters
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
- `source`: `pasted_text`, `manual_upload_mock`, `ai_extraction_mock`
- `sourceMetadata`: optional source type, source id, title, sender, url, received/fetched/extracted timestamps, provider name, and model name
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

## Future receipt ingestion providers

Phase 7C added contract-only placeholders in `src/receipt-ingestion`. Phase 8A wires only a local manual simulator into the Receipts screen. Real source adapters remain future work.

Future receipt text sources are represented by `ReceiptTextSourceProvider`:

```ts
export type ReceiptTextSourceKind =
  | "manual_paste"
  | "gmail"
  | "google_drive"
  | "google_docs";

export interface ReceiptTextSourceProvider {
  readonly kind: ReceiptTextSourceKind;
  listCandidates(): Promise<ReceiptTextCandidate[]>;
  getCandidateText(candidateId: string): Promise<ReceiptTextCandidate>;
}
```

Provider responsibilities:

- `manual_paste`: adapt the current pasted text intake into the common ingestion shape when a future orchestration layer exists.
- `gmail`: future adapter for selected receipt-like Gmail messages. Not implemented as a real source adapter in Phase 8A.
- `google_drive`: future adapter for selected Drive files containing receipt text. Not implemented as a real source adapter in Phase 8A.
- `google_docs`: future adapter for selected Docs containing receipt text. Not implemented as a real source adapter in Phase 8A.

Source providers return text candidates only. They must not parse accounting meaning, create transactions, confirm receipts, or write Dashboard-impacting records.

Current persisted receipt source values are `pasted_text`, `manual_upload_mock`, and `ai_extraction_mock`. Phase 8A stores optional source metadata on receipt drafts and final receipts as normal object fields; it does not add a Dexie schema version because the metadata is not indexed. Real Gmail, Drive, and Docs adapters still require explicit implementation phases before they can write data.

## AI receipt extraction contract and simulator

`ReceiptExtractionProvider` is the future boundary between raw receipt text and structured draft data:

```ts
export interface ReceiptExtractionProvider {
  readonly providerName: string;
  extractReceiptDraft(
    request: ReceiptExtractionRequest,
  ): Promise<ReceiptExtractionResult>;
}
```

The extraction request includes:

- source metadata from the receipt text provider;
- raw receipt text;
- optional default currency;
- optional locale hint;
- local category hints.

The extraction result includes provider metadata and one `AiExtractedReceiptDraft`. That draft maps to the existing receipt draft fields:

- `merchantName` -> `ReceiptDraft.merchant`;
- `receiptDate` -> `ReceiptDraft.date`;
- `currency` -> `ReceiptDraft.currency`;
- `totalAmount` -> `ReceiptDraft.total`;
- `warnings` -> `ReceiptDraft.warnings`;
- `confidence` -> `ReceiptDraft.confidence`;
- extracted items -> `ReceiptDraftItem` rows.

AI extraction must use `uncategorized` when a category is unclear and add flags such as `low_confidence`, `unclear_line`, or `uncategorized` instead of inventing certainty. It must preserve raw item evidence separately from normalized item names.

The reusable prompt template and expected JSON schema live in `src/receipt-ingestion/receiptExtractionContract.ts`.

Phase 8A adds `src/receipt-ingestion/manualAiExtractionSimulator.ts`:

- `buildManualAiReceiptCandidate` validates raw source text and extracts optional header metadata such as `From`, `Subject`, `Date`, `Received`, and `Title`.
- `mockAiReceiptExtractionProvider` implements `ReceiptExtractionProvider` locally by stripping source headers and reusing the deterministic receipt parser as a mock extraction engine.
- `simulateAiReceiptExtractionAndSaveDraftAndReload` in `financeDataService` converts the extraction result to the existing `ReceiptDraftInput`, calls `saveReceiptDraft`, and reloads finance data.
- The Receipts page opens the saved result in the existing draft review form.

The simulator preserves source type, title, sender, received date, provider name, model name, fetch time, and extraction time when available. It writes only receipt drafts and receipt draft items. Human review and explicit receipt confirmation remain required before one final receipt, final receipt items, and one linked transaction are created.

Expected extraction JSON shape:

```json
{
  "merchantName": "string, optional",
  "receiptDate": "YYYY-MM-DD, optional",
  "currency": "USD",
  "totalAmount": 12.34,
  "items": [
    {
      "rawLine": "Milk 1 x 2.50",
      "rawName": "Milk",
      "normalizedName": "milk",
      "quantity": 1,
      "unitPrice": 2.5,
      "totalPrice": 2.5,
      "categoryId": "groceries",
      "tags": ["dairy"],
      "confidence": 0.9,
      "flags": [],
      "kind": "item"
    }
  ],
  "warnings": [],
  "confidence": 0.86
}
```

The JSON schema requires:

- top-level `currency`, `items`, `warnings`, and `confidence`;
- item-level `rawName`, `normalizedName`, `totalPrice`, `categoryId`, `tags`, `confidence`, `flags`, and `kind`;
- confidence values between `0` and `1`;
- item `kind` values from `item`, `discount`, `fee`, `tax`, `total`, or `unclear`;
- flags from the existing receipt draft item flag set.

The schema does not include transaction, account, Dashboard, recurring, bank, or FX fields. Those concerns remain outside extraction.

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
- raw pasted/source text;
- status: `draft`, `reviewed`, or `confirmed`;
- source;
- optional source metadata;
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

## Confirmed receipt item analytics

Phase 7A adds item analytics to the Dashboard as a receipt-detail section. Phase 7B adds item search, item category filtering, and drilldown into the confirmed receipt item lines behind each item total.

The derived analytics aggregate confirmed final receipt items by:

- normalized item name;
- item category.

Each aggregate reports:

- total amount in the selected display currency;
- item count;
- average item price;
- top items or categories sorted by total amount.

Each detail row reports:

- final receipt date;
- merchant when present;
- raw item name;
- normalized item name;
- item category;
- original amount and receipt currency;
- display amount in the configured display currency.

Receipt items do not have their own currency field, so conversion uses the linked final receipt currency. The source `ReceiptItem.totalPrice` and linked `Receipt.currency` are preserved unchanged.

The Dashboard UI labels this section as a confirmed receipt item breakdown and states that it is not extra spending. The section supports `This month` and `All time` filters, search by raw or normalized item name, filtering by item category, and a simple read-only detail view. Empty states distinguish no confirmed receipt items for the period, no search results, and no category matches.

## Analytics rules

Dashboard analytics must support:

- transaction-level spend;
- receipt item-level spend;
- combined spend without double-counting receipt-linked transactions.
- a separate recurring expense estimate that does not change transaction spend.

When a receipt is confirmed and linked to a transaction, the created transaction remains the source for monthly spend, spend-by-category, and merchant spend. Receipt items provide a separate item-level breakdown for product and receipt-detail analytics only.

## Provider boundaries

Future integrations must use interfaces first and stay behind service/repository boundaries.

Implemented provider boundaries:

- Phase 7C `ReceiptTextSourceProvider`: manual paste, Gmail, Google Drive, and Google Docs text candidate intake contracts.
- Phase 7C `ReceiptExtractionProvider`: raw receipt text plus local hints to structured AI-extracted receipt draft contract.
- Phase 7C `receiptExtractionPromptTemplate`: reusable extraction prompt text.
- Phase 7C `receiptExtractionJsonSchema`: expected AI extraction JSON schema.
- Phase 8A `mockAiReceiptExtractionProvider`: local-only simulator implementation of the extraction provider contract.

Still future boundaries:

- `OcrProvider`: image or file to text.
- `CategoryClassifier`: item text to category/tags if category hints outgrow the current parser heuristics.
- source adapters for future bank, CSV, crypto, and brokerage data.

Provider implementation rules:

- no provider credentials in code, config, docs, or tests;
- no source provider writes transactions or final receipts directly;
- no extraction provider writes persistence directly;
- no AI provider bypasses receipt review or confirmation;
- no receipt item independently changes Dashboard spend totals;
- no live FX provider updates local manual FX settings unless a later phase explicitly changes the currency architecture.

The first MVP uses deterministic local logic and mock or contract-only providers only.
