# Architecture

## Current repository state

The repository now has a Phase 9D OAuth/backend decision record and disabled backend skeleton on top of the Phase 9C disabled Google readiness skeleton, Phase 9B mock Google source-provider boundary, Phase 9A planning checkpoint, and Phase 8F React + TypeScript + Vite app shell. Runtime behavior remains the Phase 8F local-first MVP: local data models, Dexie-backed IndexedDB persistence, service-loaded screens, manual transaction CRUD, manual local currency conversion settings, deterministic receipt parsing, persisted receipt drafts, receipt draft review/edit, reviewed-draft confirmation into final receipt data plus one linked transaction, recurring expense CRUD, transaction-only monthly trend analytics, searchable confirmed receipt item analytics, future receipt ingestion contracts, a local-only manual AI extraction simulator that saves AI-extracted output as receipt drafts only, Settings tools for JSON backup/restore/reset, CSV export/import flows, and a documented MVP stabilization QA checklist. Phase 9A adds documentation for future Gmail, Google Drive, and Google Docs source integrations. Phase 9B adds mock/local Gmail, Google Drive, and Google Docs source providers that can create validated receipt drafts only. Phase 9C adds environment placeholder names, a disabled Google integration status model, disabled real-provider placeholders, and a Settings planned/not connected status. Phase 9D records the backend-required OAuth/security decision, adds disabled backend endpoint definitions and a no-op backend client. Phase 9E adds privacy, consent, and user-facing disclosure planning. Phase 9F adds a local-only manual Drive/Docs selected-file import prototype that reads supported user-selected text-like files in the browser and saves validated receipt drafts only. Phase 9G adds a local-only Gmail-like manual import prototype for pasted email-like text and selected `.eml`/`.txt` files, still saving validated receipt drafts only. Phase 9H adds planning-only OAuth/backend release gates for any future real Google provider access. The app still adds no real Google API, Gmail API, OAuth flow, backend server, scheduled sync, token storage, OCR, or real AI calls.

Existing files:

- `AGENTS.md`
- `finance_ai_tracker_codex_plan_ru.md`
- project planning docs;
- `QA_CHECKLIST.md` for Phase 8F manual browser QA and known limitations;
- `GOOGLE_INTEGRATION_PLAN.md` for Phase 9A Google source integration planning;
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
- Phase 8D-B2 Settings tools for recurring expense CSV import preview, row validation, duplicate warnings, strong confirmation, and confirmed local writes.
- Phase 8D-B3 shared CSV import/export QA coverage for malformed CSV parse errors, warning-only duplicate behavior, read-only exports for all supported CSV kinds, and no partial writes from failed import batches.
- Phase 8E AI receipt extraction prompt QA and runtime schema validation before draft creation.
- Phase 8F MVP stabilization QA checklist, browser smoke notes, known limitations, and transaction UI regression coverage.
- Phase 9A planning docs for future Gmail, Google Drive, and Google Docs source integrations, including OAuth scopes, backend requirements, discovery rules, duplicate detection, privacy, deletion, failure modes, and rollout phases.
- Phase 9B mock Google source provider boundary with local Gmail, Google Drive, and Google Docs source records, stable content hashes, duplicate-safe draft ingestion, and a Receipts screen mock source entry point.
- Phase 9C Google readiness skeleton with `.env.example` placeholders, disabled-by-default feature flags, a status model, disabled real-provider placeholders, and a Settings planned/not connected status.
- Phase 9D Google OAuth/backend decision and disabled backend skeleton with no-op endpoint definitions, backend env flags, and tests proving no network or credential persistence behavior.
- Phase 9E Google privacy, consent, and user-facing disclosure planning for future provider access.
- Phase 9F local-only manual Drive/Docs selected-file import prototype for text-like files.
- Phase 9G local-only Gmail-like manual receipt import prototype for pasted email text and `.eml`/`.txt` files.
- Phase 9H Google OAuth/backend release-gate planning before any real provider access.

Still missing by design until later phases:

- bank matching or reconciliation for receipt-linked transactions;
- receipt item, final receipt, or receipt draft CSV import;
- real Gmail, Google Drive, or Google Docs source adapters;
- real OAuth, provider token storage, backend server/runtime sync, scheduled sync, and restricted-scope Google verification work;

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

Phase 8F uses this layout:

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
    csvRecurringImport.test.ts
    csvRecurringImport.ts
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
    TransactionsPage.test.tsx
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
  google-integration/
    googleBackendReadiness.test.ts
    googleBackendReadiness.ts
    googleIntegrationReadiness.test.ts
    googleIntegrationReadiness.ts
  receipt-ingestion/
    fixtures.ts
    manualAiExtractionSimulator.test.ts
    mockGoogleSourceProvider.test.ts
    manualAiExtractionSimulator.ts
    mockGoogleSourceProvider.ts
    receiptExtractionContract.ts
    receiptExtractionValidation.test.ts
    receiptExtractionValidation.ts
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

Reset restores the current seed/baseline state, including default manual FX settings. It does not import a backup, import CSV, call external services, or alter receipt confirmation, item analytics, recurring expense, or FX semantics. Restore, reset, CSV export, and CSV imports are separate explicit flows.

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

CSV export does not change JSON backup/restore/reset behavior, receipt confirmation, item analytics, recurring expenses, FX settings, or Dashboard monthly spend semantics. Transaction and recurring CSV imports are handled by separate preview/confirm flows below.

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

## Local CSV recurring import

Phase 8D-B2 adds recurring-expense-only CSV import to Settings. Import is browser-local, has no backend, and writes nothing until the user confirms a valid preview.

CSV recurring import flow:

```text
SettingsPage recurring CSV file input
  -> financeDataService previewRecurringCsvImportFromText(rawCsv)
  -> getFinanceSnapshot
  -> domain csvRecurringImport preview builder
  -> SettingsPage row preview with errors, warnings, and duplicate warnings
  -> SettingsPage strong confirmation phrase
  -> financeDataService confirmRecurringCsvImportAndReload(preview)
  -> financeRepository importRecurringCsvRows(validRows)
  -> Dexie recurringExpenses bulkAdd in an IndexedDB transaction
  -> loadFinanceData refreshes shared Dashboard and Recurring state
```

`src/domain/csvRecurringImport.ts` parses CSV locally, accepts Phase 8D-A recurring export headers plus simple recurring headers, validates required name, amount, currency, frequency, next due date, and account fields, and resolves account/category by id or name against the current snapshot. Category is optional unless supplied; supplied unknown categories are row errors. Invalid rows stay in the preview and block import. Unsupported currencies are warnings because the recurring model stores original currency and display conversion remains derived from manual FX settings.

Likely duplicates are warnings, not errors. The duplicate key uses normalized name, normalized merchant or note, rounded amount, uppercased currency, frequency, and next due date, and checks both existing recurring expenses and earlier rows in the same CSV file.

Confirmed imports create new local recurring expenses with new `rec-csv-*` ids. CSV recurring ids, display amounts, display currency, and timestamps are ignored for writes. The import path does not create transactions, receipts, receipt items, receipt drafts, or external provider records.

Preview calls do not mutate IndexedDB. Confirm calls reject previews with file errors or row errors before calling the repository. Repository writes re-check IndexedDB availability, required recurring validity, active account ids, and category ids before `bulkAdd`.

Confirmed recurring imports may change only the separate recurring monthly estimate after confirmation. They do not change Dashboard monthly transaction spend and do not add rows to the Transactions list.

Phase 8D-B3 adds no new CSV write paths. It hardens the existing CSV flows with shared safety coverage: malformed quoted CSV returns file errors before row import, all supported export kinds remain read-only, duplicate detection remains warning-only, and repository import batch failures do not partially write rows.

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
  -> runtime extraction JSON validation
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
- status: active, paused, or cancelled;
- note;
- tags.

Validation lives in `src/domain/recurringValidation.ts` and requires:

- name;
- positive amount;
- currency;
- account;
- valid frequency;
- valid ISO next due date;
- valid status.

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

Phase 7C added contract-only placeholders in `src/receipt-ingestion`. Phase 8A wires only a local manual simulator into the Receipts screen. Phase 9A documents the future Google source integration architecture in `GOOGLE_INTEGRATION_PLAN.md`. Real source adapters remain future work.

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

## Phase 9A Google source integration plan

`GOOGLE_INTEGRATION_PLAN.md` is the source of truth for future Gmail, Google Drive, and Google Docs intake. Phase 9A is documentation-only and does not add OAuth, API clients, backend code, scheduled sync, or real provider reads.

Future Google source flow:

```text
Google auth/session
  -> Gmail/Drive/Docs ReceiptTextSourceProvider
  -> listCandidates
  -> user selects candidates
  -> getCandidateText
  -> ReceiptExtractionProvider
  -> receiptExtractionValidation
  -> save ReceiptDraft and ReceiptDraftItem rows
  -> human review
  -> explicit confirm receipt
  -> final Receipt, final ReceiptItem rows, and one linked Transaction
```

OAuth and backend rules:

- Manual Drive/Docs selected-file import should be the first implementation path, preferably with the narrow `drive.file` scope.
- Gmail message body import is deferred because `gmail.readonly` is a restricted scope and requires backend/security planning before implementation.
- Broad Drive discovery is deferred because broad Drive scopes are restricted and carry verification obligations.
- Scheduled sync requires a backend for refresh-token storage, revocation, rate limits, cursors, and background jobs.
- OAuth client secrets, refresh tokens, and access tokens must never be stored in IndexedDB, JSON backups, CSV exports, receipt source metadata, committed config, or local logs.

Source metadata can be preserved on receipt drafts and final receipts only as user-facing receipt evidence: provider kind, account subject/hash, message/file/document id, attachment id when applicable, revision marker or modified timestamp, title/subject, sender/owner, received/modified/fetched timestamp, safe source URL, duplicate key, and content fingerprint.

Duplicate detection should combine a source identity key with a content fingerprint based on normalized merchant, receipt date, rounded total, currency, and normalized text hash. Duplicate matches warn the user and require a choice; they must not silently overwrite drafts, confirmed receipts, or linked transactions.

Google source providers are discovery and text-read adapters only. They must not parse accounting meaning, create transactions, confirm receipts, mutate recurring expenses, change FX settings, or update Dashboard totals directly.

## Phase 9B mock Google source provider boundary

Phase 9B implements local-only mock Gmail, Google Drive, and Google Docs source providers. It does not implement OAuth, Google API clients, backend token handling, scheduled sync, real Google data reads, OCR, or real AI API calls.

Mock source flow:

```text
ReceiptsPage mock Google source list
  -> financeDataService ingestMockGoogleReceiptSourceAndReload(candidateId)
  -> mock ReceiptTextSourceProvider getCandidateText
  -> duplicate check against local receipt drafts and final receipts
  -> mockAiReceiptExtractionProvider
  -> receiptExtractionValidation
  -> financeRepository saveReceiptDraft
  -> loadFinanceData
  -> existing draft review UI
```

Implemented mock provider files:

- `src/receipt-ingestion/mockGoogleSourceProvider.ts`
- `src/receipt-ingestion/mockGoogleSourceProvider.test.ts`

Mock candidates preserve user-facing source metadata:

- source kind: `gmail`, `google_drive`, or `google_docs`;
- provider candidate id;
- external source id stored as `sourceId`;
- title;
- sender or owner;
- received and/or modified timestamp;
- mock source URL;
- `sourceProviderName`;
- stable local `contentHash`;
- raw text evidence.

Duplicate detection checks existing receipt drafts and final receipts before draft writes. It rejects a mock source when the same provider kind plus `sourceId` or provider kind plus `contentHash` is already present locally. Rejection happens before extraction and before IndexedDB mutation.

Saved output remains draft-only. Phase 9B writes only `receiptDrafts` and `receiptDraftItems` through the existing repository path. It does not create transactions, final receipts, final receipt items, recurring expenses, FX updates, JSON backup/restore changes, CSV changes, or Dashboard updates before the existing human review and explicit confirmation flow.

## Phase 9C Google OAuth/backend readiness skeleton

Phase 9C adds only a disabled readiness boundary for future real Google integration.

Implemented readiness files:

- `.env.example`
- `src/google-integration/googleIntegrationReadiness.ts`
- `src/google-integration/googleIntegrationReadiness.test.ts`

Readiness flow:

```text
Vite env placeholders
  -> buildGoogleIntegrationConfig
  -> getGoogleIntegrationStatus
  -> App passes read-only status
  -> Settings shows Google integration planned / not connected
```

Environment placeholders are named for future work only:

- `VITE_GOOGLE_INTEGRATION_ENABLED`
- `VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED`
- `VITE_GOOGLE_GMAIL_IMPORT_ENABLED`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_REDIRECT_URI`
- `VITE_GOOGLE_BACKEND_AUTH_ENABLED`
- `VITE_GOOGLE_BACKEND_SYNC_ENABLED`
- `VITE_GOOGLE_BACKEND_REVOCATION_ENABLED`
- `VITE_GOOGLE_BACKEND_BASE_URL`

The default flags are `false` and placeholder values are empty. The config/status model exposes only whether placeholders are configured; it does not expose configured values to UI state. `realProviderCallsAllowed` remains `false`; Phase 9D backend flags also leave endpoint calls, network calls, and credential persistence disabled.

Disabled real-provider placeholders implement the existing `ReceiptTextSourceProvider` interface for future Gmail, Google Drive, and Google Docs adapters. They return no candidates, throw a disabled-provider error for candidate text requests, and do not call Google OAuth endpoints, Gmail APIs, Drive APIs, Docs APIs, `fetch`, a backend, or any external package.

Settings renders a read-only integration status only. It has no connect, disconnect, import, sync, OAuth redirect, token storage, backend call, or provider action.


## Phase 9D Google OAuth/backend decision and disabled skeleton

Phase 9D decides that production Google provider auth requires a backend before real OAuth callback handling, authorization response exchange, long-lived provider access, scheduled sync, revocation, or provider-data deletion is enabled.

Frontend-only is allowed only as a future narrow exception for manual, user-initiated Drive/Docs selected-file import using a scope such as `drive.file`, with no stored long-lived credential, no scheduled sync, no broad Drive scan, and draft-only local writes.

Implemented backend readiness files:

- `src/google-integration/googleBackendReadiness.ts`
- `src/google-integration/googleBackendReadiness.test.ts`

Disabled backend boundary:

```text
Vite env placeholders
  -> buildGoogleBackendReadiness
  -> googleBackendEndpointDefinitions
  -> DisabledGoogleOAuthBackendClient
  -> disabled status, empty source lists, or disabled errors only
```

Future endpoint names are documented as disabled definitions only: `oauthStart`, `oauthCallback`, `providerStatus`, `disconnect`, `listSourceCandidates`, `getSourceCandidateText`, and `scheduledSyncStatus`.

Phase 9D invariants:

- `endpointCallsAllowed` is always `false`.
- `networkCallsAllowed` is always `false`.
- `credentialPersistenceAllowed` is always `false`.
- The disabled backend client does not call `fetch`.
- Placeholder config exposes booleans and missing env names, not configured client id, redirect URI, or backend URL values.
- No authorization responses, access tokens, refresh tokens, provider sessions, client secrets, sync cursors, provider cookies, or Google source data are stored in IndexedDB, JSON backups, CSV exports, source metadata, tests, logs, or committed config.

Existing product behavior remains unchanged for real provider access. Phase 9B mock Google sources, Phase 9F local selected-file Drive/Docs import, and Phase 9G local Gmail-like manual import remain the only Google-like receipt source behavior in the runtime, and all create receipt drafts only.


## Phase 9E Google privacy and consent planning

Phase 9E adds planning and draft copy only. It does not add runtime UI, OAuth routes, Google API clients, backend services, token storage, scheduled sync, provider revocation calls, or AI provider calls.

Future Google connection copy must explain:

- Google integration is disabled until a future phase explicitly enables an import path.
- The app requests access only for the user-started import path.
- Gmail import may access selected message metadata, sender, subject, received date, body text, and receipt-like attachment text only after user selection or explicit filters.
- Drive/Docs import should first access only user-selected files or documents through a narrow selected-file path such as `drive.file`.
- Google source ingestion saves validated receipt drafts only.
- Human review and explicit confirmation are still required before final receipt records, linked transactions, Dashboard totals, recurring expenses, or FX settings change.
- A future AI extraction provider may receive selected receipt text only if explicitly enabled and disclosed in a later phase.
- Disconnect must revoke provider access where possible and delete provider credential state, cached candidates, sync cursors, and diagnostics; local finance records remain unless separately deleted.

Privacy and consent gates stay in `GOOGLE_INTEGRATION_PLAN.md`. They must be satisfied before any future phase adds real OAuth consent, provider reads, backend token handling, scheduled sync, or AI extraction provider calls.

## Phase 9F Local Drive/Docs Selected-File Import

Phase 9F implements the frontend-only exception documented in Phase 9D as a local prototype. It does not call Google Drive, Google Docs, OAuth, a backend, OCR, or a real AI provider.

Runtime flow:

```text
ReceiptsPage local Drive/Docs file input
  -> browser reads selected file text with File.text/FileReader
  -> localDriveDocsSelectedFileSource builds a google_drive/google_docs candidate
  -> duplicate check against local receipt drafts and final receipts
  -> mockAiReceiptExtractionProvider
  -> receiptExtractionValidation
  -> financeRepository saveReceiptDraft
  -> loadFinanceData
  -> existing draft review UI
```

Implemented files:

- `src/receipt-ingestion/localDriveDocsSelectedFileSource.ts`
- `src/receipt-ingestion/localDriveDocsSelectedFileSource.test.ts`
- `src/receipt-ingestion/sourceTextHash.ts`
- `src/services/financeDataService.ts`
- `src/pages/ReceiptsPage.tsx`

Supported selected files are `.txt`, `.md`, `.markdown`, `.html`, `.htm`, and `.json`. The browser reads the selected file locally. HTML tags are stripped locally before extraction. JSON is parsed locally and uses `rawText`, `receiptText`, `text`, or `content` when present, otherwise the parsed JSON is stringified as local text evidence.

Selected-file source metadata is stored only on receipt drafts/final receipts as normal receipt evidence: source kind `google_drive` or `google_docs`, file name/title, pseudo `local-selected-file-*` source id, stable content hash, modified time when the browser provides it, fetched/imported time, source provider name, extraction provider name, model name, and extraction timestamp. Raw selected text is stored as the receipt draft raw text, matching the existing receipt evidence model.

Duplicate detection rejects a selected file before extraction or mutation when an existing draft or confirmed receipt has the same source kind plus pseudo source id or content hash. Rejections do not overwrite existing drafts, receipts, linked transactions, analytics, recurring expenses, FX settings, JSON backup/restore state, or CSV behavior.

Saved output remains draft-only. Phase 9F writes only `receiptDrafts` and `receiptDraftItems` through the existing repository path. It does not create transactions, final receipts, final receipt items, recurring expenses, FX updates, JSON backup/restore changes, CSV changes, or Dashboard updates before the existing human review and explicit confirmation flow.

## Phase 9G Local Gmail Manual Import

Phase 9G implements a local Gmail-like prototype only. It does not call Gmail APIs, request OAuth consent, use Google Identity Services, call a backend, store provider credentials, schedule sync, run OCR, or call a real AI provider.

Runtime flow:

```text
ReceiptsPage local Gmail paste/.eml input
  -> browser reads selected .eml/.txt text locally when a file is selected
  -> localGmailManualReceiptSource builds a gmail candidate
  -> duplicate check against local receipt drafts and final receipts
  -> mockAiReceiptExtractionProvider
  -> receiptExtractionValidation
  -> financeRepository saveReceiptDraft
  -> loadFinanceData
  -> existing draft review UI
```

Implemented files:

- `src/receipt-ingestion/localGmailManualReceiptSource.ts`
- `src/receipt-ingestion/localGmailManualReceiptSource.test.ts`
- `src/services/financeDataService.ts`
- `src/pages/ReceiptsPage.tsx`

The Gmail candidate builder accepts pasted raw email-like text and local `.eml`/`.txt` file text. It reads `From`, `Subject`, `Date`, `Received`, and `Message-ID` headers when present, lets the user override sender/subject/received metadata from the Receipts form, computes a stable content hash, and creates a pseudo `local-gmail-message-*` source id. Invalid user-provided received dates are rejected before extraction or persistence. Missing optional sender, subject, or received date is allowed but preserved as review warnings on the draft.

Duplicate detection rejects a local Gmail message before extraction or mutation when an existing draft or confirmed receipt has the same `gmail` source id or content hash. Saved output remains draft-only. Phase 9G writes only `receiptDrafts` and `receiptDraftItems` through the existing repository path. It does not create transactions, final receipts, final receipt items, recurring expenses, FX updates, JSON backup/restore changes, CSV changes, or Dashboard updates before the existing human review and explicit confirmation flow.
## Phase 9H Google OAuth/Backend Release Gate

Phase 9H is documentation only. It does not add OAuth routes, Google API clients, backend services, token storage, scheduled sync, provider revocation calls, provider deletion runtime, real AI provider calls, dependencies, or runtime UI changes.

The release-gate source of truth is `GOOGLE_INTEGRATION_PLAN.md`. It defines:

- hard requirements for OAuth consent, privacy copy, support links, limited-use data handling, scope selection, backend token handling, revocation/disconnect, deletion, logging, and accounting boundaries;
- minimum viable scope strategy, with narrow selected-file Drive/Docs access preferred where possible and Gmail/broad Drive treated as higher-risk restricted-scope work;
- go/no-go criteria for frontend-only selected-file experiments, backend-backed OAuth, Gmail read-only ingestion, Drive/Docs selected-file or picker ingestion, and scheduled sync;
- security checks that prohibit tokens, authorization codes, provider sessions, sync cursors, provider cookies, and client secrets from IndexedDB, localStorage, sessionStorage, JSON backups, CSV exports, receipt source metadata, logs, tests, and committed config;
- logging restrictions that prohibit raw Gmail bodies, Drive/Docs text, attachment text, receipt text, AI prompts containing receipt text, provider responses, OAuth credentials, source URLs containing secrets, full provider ids, tokens, refresh tokens, and sync cursors from logs;
- the invariant that Google source ingestion can create receipt drafts and draft items only, while Dashboard impact still requires human review and explicit receipt confirmation;
- a future implementation sequence after release-gate approval: backend OAuth behind disabled flags, narrow Drive/Docs picker, Gmail selected-message import, optional scheduled sync, then production hardening.

Until a future implementation phase explicitly satisfies those gates, Phase 9C/9D disabled provider and backend readiness boundaries remain no-op, and Phase 9B mock sources, Phase 9F local Drive/Docs files, and Phase 9G local Gmail paste/files remain the only Google-like runtime behavior.
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

Phase 8E adds `src/receipt-ingestion/receiptExtractionValidation.ts`. `financeDataService` validates the provider result and source metadata before converting the extraction to `ReceiptDraftInput` or calling `saveReceiptDraft`. Invalid provider metadata, source metadata, missing required draft fields, malformed item fields, invalid dates, invalid currency codes, invalid amounts, or out-of-range confidence values reject the action before any IndexedDB mutation.

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
- at least one extracted item;
- a three-letter uppercase currency code;
- non-negative receipt totals when present;
- item-level `rawName`, `normalizedName`, `totalPrice`, `categoryId`, `tags`, `confidence`, `flags`, and `kind`;
- confidence values between `0` and `1`;
- item `kind` values from `item`, `discount`, `fee`, `tax`, `total`, or `unclear`;
- flags from the existing receipt draft item flag set.

Runtime validation also adds review warnings for total/item mismatches, low-confidence drafts or items, unclear items, and category ids outside available hints. Those warnings keep the existing review flow explicit instead of silently confirming uncertain extraction data.

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
- Phase 9B `mockGoogleSourceProvider`: local-only Gmail, Google Drive, and Google Docs source provider implementations for selected mock candidates.
- Phase 9C `googleIntegrationReadiness`: disabled-by-default Google integration config/status model and disabled real-provider placeholders.
- Phase 9D `googleBackendReadiness`: disabled backend endpoint definitions, backend architecture decision metadata, and a no-op OAuth backend client for future Google provider auth.

Still future boundaries:

- `OcrProvider`: image or file to text.
- `CategoryClassifier`: item text to category/tags if category hints outgrow the current parser heuristics.
- source adapters for future Gmail, Google Drive, Google Docs, bank, CSV, crypto, and brokerage data.
- real backend OAuth/token storage implementation for future restricted-scope Google integrations and scheduled sync.

Provider implementation rules:

- no provider credentials in code, config, docs, tests, IndexedDB records, JSON backups, CSV exports, or source metadata;
- no source provider writes transactions, final receipts, recurring expenses, FX settings, or Dashboard-impacting records directly;
- no extraction provider writes persistence directly;
- no AI provider bypasses receipt review, extraction validation, or confirmation;
- no receipt item independently changes Dashboard spend totals;
- no live FX provider updates local manual FX settings unless a later phase explicitly changes the currency architecture.

The first MVP uses deterministic local logic and mock or contract-only providers only. Phase 9E keeps future Google integration and backend auth disabled by default and readiness-only until a later phase explicitly implements OAuth, provider adapters, privacy/consent gates, and any required backend server.
