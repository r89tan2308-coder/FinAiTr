# Decisions

## 2026-06-03: First MVP scope is local-first only

Decision:

The first MVP is limited to manual transactions, pasted receipt text parsing, receipt review, recurring expenses, and dashboard analytics.

Rationale:

This proves the core value, item-level personal finance analytics, without requiring external accounts, provider credentials, or backend infrastructure.

Consequences:

- CSV import/export is deferred until after the first MVP.
- Real bank, Google Drive, OCR, crypto, and brokerage integrations are out of scope.
- Future integrations require updates to `PLAN.md` and `DECISIONS.md`.

## 2026-06-03: Use PWA plus local persistence as the target architecture

Decision:

Use a React + TypeScript + Vite mobile-first PWA with local-first persistence, preferably IndexedDB through Dexie.

Rationale:

The app is intended as a personal mobile tool. Local-first storage avoids server setup, auth, and privacy risk during the MVP.

Consequences:

- No backend is required for the first MVP.
- Data model and analytics must be implemented client-side.
- Backup/export becomes important before broader use.

## 2026-06-03: Deterministic parser before OCR or LLM providers

Decision:

The first receipt parser will process pasted text locally with deterministic parsing and category guessing.

Rationale:

Pasted OCR-like text is enough to validate receipt review and item-level analytics. It avoids API keys, provider costs, and unpredictable model behavior.

Consequences:

- Parser fixtures and unit tests are required.
- OCR and LLM provider interfaces can be introduced later, but real calls are not part of the first MVP.

## 2026-06-03: Analytics must avoid double-counting

Decision:

When a receipt is confirmed and linked to a transaction, combined analytics must not count both the transaction total and the receipt item totals as separate spend.

Rationale:

Receipt item data provides category and product detail, but the linked transaction represents the same expense.

Consequences:

- Analytics helpers need explicit tests for receipt-linked transactions.
- Dashboard logic must distinguish transaction-level and item-level spend.

## 2026-06-03: Phase 1 uses simple local navigation

Decision:

Use in-memory tab navigation for the app skeleton instead of adding a router in Phase 1.

Rationale:

The first scaffold only needs reliable navigation between top-level placeholder screens. A router can be added when receipt review or deep links require URL-addressable views.

Consequences:

- No routing dependency is installed yet.
- Phase 5 may introduce routing if receipt review needs direct links.

## 2026-06-03: Phase 1 uses plain CSS

Decision:

Use a single plain CSS file for the first mobile-first shell.

Rationale:

The repo has no existing design system, and Phase 1 needs a small reviewable scaffold. Plain CSS keeps the dependency surface low while preserving responsive layout control.

Consequences:

- Components use semantic class names.
- A future design system can replace or organize the CSS when repeated patterns become stable.

## 2026-06-03: Phase 2 uses Dexie for IndexedDB

Decision:

Use Dexie as the IndexedDB wrapper for the local-first MVP data layer.

Rationale:

Dexie gives typed table access and transaction support without requiring a backend, server process, or browser credentials. It fits the local-first PWA direction and keeps the first MVP private by default.

Consequences:

- `src/persistence/db.ts` owns the IndexedDB schema.
- `src/persistence/repositories/financeRepository.ts` owns seed and read behavior.
- UI code consumes `src/services/financeDataService.ts`, not Dexie directly.
- Phase 3 can add transaction writes through the repository/service boundary.

## 2026-06-03: Seed fallback is allowed for tests and unavailable IndexedDB

Decision:

Return seeded local data when IndexedDB is unavailable or cannot be loaded.

Rationale:

Vitest/jsdom and some constrained environments do not provide a reliable IndexedDB implementation. The app should still render and tests should focus on domain behavior without installing real external services.

Consequences:

- Settings reports `IndexedDB` or `Seed fallback`.
- Browser app behavior still uses IndexedDB when available.
- Persistence-specific tests can add fake IndexedDB later if write behavior needs coverage.

## 2026-06-03: Phase 3 transaction writes reload the finance snapshot

Decision:

After create, edit, or delete, reload the finance snapshot through `financeDataService` instead of patching local screen state directly.

Rationale:

This keeps Dashboard, Transactions, Categories, and Settings synchronized from the same persisted source of truth. It also avoids duplicating dashboard recalculation logic in UI components.

Consequences:

- `TransactionsPage` receives action callbacks from `App`.
- Action callbacks call service methods, which call repository writes, then reload data.
- Dashboard totals update after persisted transaction changes.

## 2026-06-03: No separate transaction type field in Phase 3

Decision:

Do not add a new expense/income transaction type field in Phase 3.

Rationale:

The current `Transaction` model does not have a direct type field. It has source, amount, category, and category type. Adding a new transaction type now would change the data model beyond the Phase 3 requirement.

Consequences:

- Manual transaction form supports the fields currently represented by the model.
- Income behavior can be designed later with explicit analytics rules before exposing it in the UI.

## 2026-06-03: Phase 4A parser is core-only

Decision:

Implement receipt text parsing as a tested pure domain/service module before adding UI intake, receipt draft persistence, review, confirmation, or dashboard effects.

Rationale:

The parser is the riskiest part of the receipt workflow. Keeping it pure and fixture-tested first makes parser behavior reviewable and avoids coupling uncertain heuristics to IndexedDB writes or analytics.

Consequences:

- `src/receipt-parser` owns parser heuristics, fixtures, and parser tests.
- `src/services/receiptParserService.ts` exposes a small service-layer parsing function.
- Parsed receipts are not persisted in Phase 4A.
- Parsed receipt items do not affect Dashboard in Phase 4A.

## 2026-06-03: Preserve uncertain receipt data instead of dropping it

Decision:

Discounts, taxes, fees, refunds, and unclear text lines must be preserved as parsed lines or warnings instead of being silently discarded.

Rationale:

Receipt parsing is heuristic and imperfect. Preserving ambiguous evidence supports later human review and avoids presenting parser guesses as final truth.

Consequences:

- Parsed items include `kind`, `flags`, and `confidence`.
- Unclear text lines become warnings.
- Unknown products are categorized as `uncategorized` and flagged for review.
- Mismatched item sum and receipt total produces a warning.

## 2026-06-03: Phase 4B receipt preview is component state only

Decision:

The pasted receipt parser preview stays in `ReceiptsPage` component state for Phase 4B. It does not persist receipt drafts, create transactions, or update dashboard analytics.

Rationale:

The current architecture has persisted `Receipt` and `ReceiptItem` tables, but the human review and confirmation flow is not implemented yet. Persisting parsed drafts before review would create data that looks actionable without a safe edit/confirm path.

Consequences:

- `ReceiptsPage` calls `parsePastedReceiptText` through `receiptParserService`.
- The parser preview can show merchant, date, total, warnings, item confidence, flags, and category suggestions.
- Dashboard remains unaffected by parsed receipt previews.
- Phase 5 must add the review and confirmation workflow before parsed receipts affect transactions or analytics.

## 2026-06-03: Phase 5A stores receipt drafts separately

Decision:

Persist saved parsed receipt drafts in `receiptDrafts` and `receiptDraftItems` instead of writing them directly into `receipts` and `receiptItems`.

Rationale:

`receipts` and `receiptItems` already feed dashboard-adjacent views such as pending receipt count, recent receipts, and top products. Phase 5A only needs durable draft storage, not analytics participation. Separate draft tables make it clear that saved parser output is still pre-review evidence.

Consequences:

- Saved drafts survive refresh and can be listed/deleted on the Receipts screen.
- Draft writes go through `financeDataService` and `financeRepository`.
- Dashboard remains unchanged by saving or deleting a receipt draft.
- Receipt review/confirmation must explicitly promote a draft into confirmed receipt data in a later phase.
- No transaction is created from a receipt draft in Phase 5A.

## 2026-06-03: Currency conversion is manual and local for MVP

Decision:

Support USD, RUB, EUR, and GBP for manual transaction, receipt, and recurring-expense display by storing user-editable local rates to RUB in Settings. Seed the initial manual rates from Bank of Russia official rates for 2026-06-03: USD 72.5597 RUB, EUR 84.6096 RUB, and GBP 97.4985 RUB.

Rationale:

The app needs mixed-currency entry and single-currency reporting, but repeatedly checking current exchange rates would add a live external data dependency and broaden the MVP beyond local-first finance tracking.

Consequences:

- `currencySettings` becomes part of `FinanceSnapshot`.
- Settings owns the display currency and manual RUB rates.
- Dashboard, category, receipt, transaction, and recurring displays convert through local settings.
- Currency conversion is display-only; persisted transaction, receipt, receipt draft, and recurring records keep their original amount and currency fields.
- No online FX provider, rate polling, API key, or background sync is added for the first MVP.

## 2026-06-04: Phase 5B reviews drafts without promoting them

Decision:

Add receipt draft review/edit UI for saved drafts, but keep reviewed drafts in `receiptDrafts` and `receiptDraftItems` only.

Rationale:

Draft review needs to make parser output correct before any final receipt, transaction linking, or item-level analytics behavior exists. Promoting reviewed drafts in the same step would couple editing with accounting effects and increase the risk of double-counting.

Consequences:

- Saved drafts can be opened, edited, saved, and marked `reviewed`.
- Raw receipt text, raw item line, and raw item name remain read-only evidence.
- Review updates go through `financeDataService` and `financeRepository`.
- Review updates write only to `receiptDrafts` and `receiptDraftItems`.
- Reviewed drafts do not create transactions.
- Reviewed drafts do not write to final `receipts` or `receiptItems`.
- Reviewed drafts do not affect Dashboard analytics.
- Confirmation, promotion, and transaction linking remain a later phase.

## 2026-06-04: Phase 5C-A confirms reviewed drafts through one local transaction

Decision:

Reviewed receipt drafts are confirmed through a dedicated repository/service action that creates one final receipt, final receipt items, and one linked transaction in a single Dexie transaction. Normal draft save/update paths cannot set `confirmed`.

Rationale:

Confirmation is the first step where receipt review affects accounting totals. Keeping it as a separate explicit action makes the Dashboard impact visible to the user and prevents partial promotion or duplicate transactions.

Consequences:

- `Receipt` stores `transactionId`; `Transaction` already stores `receiptId`.
- `ReceiptDraft` stores `confirmedReceiptId` and `linkedTransactionId` for idempotency.
- Final `ReceiptItem` records preserve reviewed item names, quantities, prices, categories, tags, confidence, and flags.
- Confirm can run only from `reviewed` drafts.
- Reconfirming an already confirmed draft returns existing linked records instead of creating duplicates.
- Dashboard spend totals update through the created transaction only; receipt items do not independently add spend totals.
- Real bank matching/reconciliation, OCR, image upload, Google Drive, AI/LLM, bank APIs, crypto/brokerage, and live FX remain out of scope.

## 2026-06-04: Phase 6 recurring expenses are local estimates only

Decision:

Recurring expenses are managed as local records through the existing finance service and repository boundary. Create, edit, delete, validation, active/inactive status, and the monthly estimate write only to `recurringExpenses`.

Rationale:

Recurring bills are useful for planning, but automatically generating payments or transactions would add scheduling, reconciliation, and undo semantics that are outside the current MVP phase.

Consequences:

- Recurring expense CRUD reloads the shared finance snapshot after each write.
- Original recurring amount and currency are preserved.
- Manual FX conversion is display-only for per-row monthly equivalents and the dashboard recurring estimate.
- Active recurring expenses contribute to the separate Dashboard recurring metric only.
- Recurring expenses do not create transactions, do not alter monthly transaction spend, and do not affect receipt confirmation behavior.
- No scheduling jobs, notifications, subscription detection, bank APIs, OCR, Google Drive, AI/LLM calls, crypto/brokerage integration, or live FX refresh is added.

## 2026-06-04: Phase 7A item analytics are confirmed-receipt breakdowns

Decision:

Item-level analytics are derived only from final `ReceiptItem` records linked to final `Receipt` records with `status: confirmed`. The Dashboard presents these analytics as a separate confirmed receipt item breakdown, not as additional spending.

Rationale:

Receipt items provide product and category detail, but the linked receipt transaction already represents the accounting spend. Treating item analytics as a separate breakdown preserves item-level value without double-counting receipt-linked purchases.

Consequences:

- Dashboard monthly spend remains transaction-based.
- Existing transaction category and merchant totals remain transaction-based in Phase 7A.
- Item analytics aggregate by normalized item name and item category.
- Current-month item analytics use final receipt dates; all-time analytics include all confirmed final receipts.
- Receipt item amounts are converted for display using the linked receipt currency and the existing manual FX settings.
- Original receipt item totals and receipt currencies are not rewritten.
- Drafts, reviewed drafts, needs-review receipts, rejected receipts, and receipt draft items are excluded from item analytics.
- Receipt confirmation, recurring expenses, external integrations, live FX, bank matching, and transaction creation behavior are unchanged.

## 2026-06-04: Phase 7B item analytics filtering stays derived and read-only

Decision:

Item analytics search, category filtering, and drilldown operate on derived confirmed receipt item detail rows. They do not create records, update receipt items, or change Dashboard spending totals.

Rationale:

Search and drilldown improve item-level investigation, but they are presentation concerns. The source of accounting spend remains the transaction linked to a confirmed receipt, while receipt item rows provide detail behind that transaction.

Consequences:

- Search matches both normalized item names and raw item names.
- Category filtering uses confirmed receipt item categories.
- Drilldown shows the final receipt date, merchant when present, item names, category, original amount/currency, and display amount.
- Manual FX conversion is still display-only; original receipt item totals and receipt currencies are not rewritten.
- Dashboard monthly spend, category spend, and merchant spend remain transaction-based.
- Receipt confirmation, recurring expenses, repository write paths, external integrations, live FX, bank matching, and transaction creation behavior are unchanged.

## 2026-06-04: Phase 7C AI receipt ingestion is contract-only

Decision:

Define future AI receipt ingestion architecture, source providers, extraction contracts, prompt template, and JSON schema without wiring any real provider into the product.

Rationale:

The product needs a path toward receipt intake from Gmail, Google Drive, and Google Docs, but the current MVP value depends on keeping accounting effects deterministic, local, reviewable, and free of external credentials. Contract-first planning lets future AI work fit the existing receipt draft review/confirm boundary instead of creating a parallel accounting path.

Consequences:

- Current Dashboard analytics remain deterministic local derived views.
- Future source providers are manual paste, Gmail, Google Drive, and Google Docs.
- Future source providers produce raw receipt text candidates only.
- Future AI extraction produces structured receipt draft data only.
- AI extraction cannot create transactions, final receipts, Dashboard totals, recurring expenses, or FX changes.
- Human review and explicit receipt confirmation remain required before Dashboard impact.
- The existing service/repository boundary remains the only write path for receipt drafts and confirmation.
- Phase 7C may add small exported TypeScript contracts and prompt/schema constants, but no runtime app wiring.
- No Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR API, AI API, bank API, crypto/brokerage, live FX, bank matching, receipt confirmation, item analytics, recurring expense, or FX behavior change is included.

## 2026-06-04: Phase 8A manual AI extraction simulator writes drafts only

Decision:

Use the Phase 7C receipt ingestion contracts through a local-only manual simulator. The simulator accepts raw email-like or document-like receipt text, uses a mock extraction provider, and saves the result as existing receipt draft and draft item records.

Rationale:

This validates the AI-ingestion accounting boundary without introducing OAuth, provider credentials, backend jobs, model unpredictability, or external data movement. The existing draft review and confirm flow remains the only path from extracted receipt text to Dashboard-impacting transactions.

Consequences:

- `ai_extraction_mock` is a persisted receipt source for locally simulated extraction results.
- Drafts and final receipts can store optional source metadata such as source kind, title, sender, received date, provider, model, and extraction time.
- The mock provider implements `ReceiptExtractionProvider` but reuses deterministic local parsing; it does not call an AI API.
- Simulated extraction writes only `receiptDrafts` and `receiptDraftItems` through the existing finance service and repository boundary.
- Simulated extraction does not create transactions, final receipts, final receipt items, Dashboard totals, recurring expenses, or FX changes.
- Human review and explicit confirmation remain required before Dashboard impact.
- Receipt items from simulated drafts affect item analytics only after confirmation creates final receipt items.
- Real Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR API, AI API, bank API, crypto/brokerage, live FX, bank matching, and payment execution remain out of scope.

## 2026-06-05: Phase 8B exports JSON backup and resets to seed only

Decision:

Add local Settings actions for versioned JSON backup export and strong-confirmation local data reset. Export reads app-owned local data and downloads JSON in the browser. Reset clears app-owned IndexedDB tables and app metadata, then restores the current seed/baseline state.

Rationale:

The local-first MVP needs a way for the user to inspect and keep a copy of local data before broader use. Reset is useful during MVP validation, but it must be deliberate and reversible only through an external backup file because JSON import/restore is not implemented yet.

Consequences:

- Backup export includes schema version, app name/version, export timestamp, seed version, storage mode, settings/currency rates, app metadata, accounts, categories, transactions, receipts, receipt items, receipt drafts, receipt draft items, and recurring expenses.
- Source metadata is preserved because it remains embedded in receipt and receipt draft records.
- Export is read-only after normal seed initialization and does not mutate persisted app data.
- Reset requires the exact phrase `RESET LOCAL DATA` in the Settings UI.
- Reset restores seed data and default manual FX settings through the existing finance service/repository boundary.
- Dashboard and pages refresh from the reloaded finance snapshot after reset.
- JSON import/restore remains out of scope for Phase 8B and is the next planned local data ownership phase, Phase 8C.
- CSV import/export, real Gmail/Drive/Docs/OAuth/backend/scheduled sync/OCR/AI API/live FX/bank API/crypto/brokerage/bank matching, and changes to receipt confirmation, item analytics, recurring, or FX semantics remain out of scope.

## 2026-06-17: Phase 8C restores only validated FinAiTr JSON backups

Decision:

Add local JSON backup import/restore as a Settings flow that validates the selected backup before any write, shows a restore preview, requires the exact `RESTORE LOCAL DATA` phrase, then replaces app-owned IndexedDB tables through the existing finance service and repository boundary.

Rationale:

Phase 8B made local backups exportable, but a local-first app also needs a safe way to recover from a reset or move data between local browser profiles. Restore can destroy current local data, so validation, preview, and strong confirmation must happen before the Dexie transaction clears tables.

Consequences:

- Restore accepts only the versioned FinAiTr JSON backup shape currently exported by Phase 8B.
- Unsupported schema versions, invalid JSON, missing tables, malformed record shapes, invalid currency settings, and duplicate primary keys are rejected before current local data is mutated.
- Restore writes only app-owned tables and app metadata: accounts, categories, transactions, receipts, receipt items, receipt drafts, receipt draft items, recurring expenses, and currency settings.
- Dashboard and pages refresh from the restored finance snapshot after restore.
- Original amounts, currencies, source metadata, and manual FX settings are preserved from the backup.
- Receipt confirmation, item analytics, recurring expense, and FX semantics remain unchanged.
- CSV import/export, cloud sync, Gmail/Drive/Docs/OAuth, backend, AI API, OCR, live FX, bank APIs, crypto/brokerage, and bank matching remain out of scope.

## 2026-06-22: Phase 7D monthly trends are transaction-only derived views

Decision:

Add Dashboard monthly trend analytics as pure derived views from transactions. Trend spend includes expense-category transactions, trend income is shown separately when category metadata uses `type: income`, transfer-category transactions do not add spend or income totals, and each month can show a compact expense-category breakdown.

Rationale:

The Dashboard needs readable monthly direction without changing existing accounting behavior. The transaction record remains the source of spend totals, while receipt items provide detail and recurring expenses provide planning estimates.

Consequences:

- Monthly trend analytics live in `src/domain/financeViews.ts` and are rebuilt from `FinanceSnapshot`.
- Display-currency conversion uses the existing manual FX settings and remains display-only.
- Confirmed receipt items, receipt draft items, and recurring expenses do not affect monthly trend spend totals.
- Existing Dashboard monthly spend, receipt confirmation, item analytics, recurring CRUD, FX settings, backup/restore, and AI ingestion semantics remain unchanged.
- CSV import/export, real Gmail/Drive/Docs/OAuth/backend/OCR/AI APIs/live FX/bank APIs/crypto/brokerage/bank matching, and payment execution remain out of scope.

## 2026-06-22: Phase 8D-A exports CSV as read-only local files

Decision:

Add Settings actions for browser-only CSV export of transactions, confirmed receipt items, and recurring expenses. The export path stays inside `SettingsPage -> financeDataService -> financeRepository -> domain csvExport` and never writes local data.

Rationale:

After JSON backup/restore, the MVP needs lightweight report-friendly exports without expanding into import semantics or external integrations. Splitting CSV export from CSV import keeps the change reviewable and avoids accidental mutation paths.

Consequences:

- CSV export preserves original amounts and currencies and adds display-currency reporting columns where useful.
- Exported rows include stable headers, human-readable account/category names, and receipt source metadata for confirmed receipt item rows.
- CSV formatting escapes commas, quotes, and newlines, and empty datasets export headers only.
- Exporting CSV must not mutate transactions, receipts, receipt items, drafts, recurring expenses, FX settings, app metadata, or JSON backup/restore/reset behavior.
- CSV import is not implemented in Phase 8D-A; Phase 8D-B must add preview, validation, and explicit confirmation before any import write path.
- Real Gmail/Drive/Docs/OAuth/backend/OCR/AI APIs/live FX/bank APIs/crypto/brokerage/bank matching and payment execution remain out of scope.

## 2026-06-22: Phase 8D-B1 imports transaction CSV after preview and confirmation

Decision:

Add Settings support for transactions-only CSV import with browser-local parsing, row preview, row-level validation errors, duplicate warnings, and a strong confirmation phrase before any IndexedDB write. The write path stays inside `SettingsPage -> financeDataService -> financeRepository -> Dexie`, and imported rows become new local `csv_import` transactions.

Rationale:

CSV export is now stable and read-only, so the next lowest-risk import step is transaction rows only. Keeping preview and confirmation separate from repository writes prevents malformed CSV files from mutating local data and keeps import behavior reviewable before expanding to any other dataset.

Consequences:

- Transaction CSV preview does not mutate IndexedDB.
- Required import fields are date, amount, currency, merchant or description, account, and category.
- Accounts and categories resolve by id or name against the current local snapshot.
- Likely duplicates are warnings based on date, rounded amount, currency, merchant/description, and account, not automatic rejections.
- Confirmed imports create new `tx-csv-*` transactions with source `csv_import` and ignore CSV transaction ids, source values, receipt ids, display amounts, display currency, and timestamps for writes.
- Original imported amount and currency are preserved; manual FX remains display-only.
- Receipt item CSV import, final receipt import, receipt draft import, recurring expense CSV import, CSV bank matching, and external integrations remain out of scope.
- CSV export, JSON backup/restore/reset, receipt confirmation, item analytics, recurring expense behavior, FX semantics, and Dashboard monthly spend semantics remain unchanged except that confirmed imported transactions contribute to normal transaction-derived Dashboard totals.
- Real Gmail/Drive/Docs/OAuth/backend/OCR/AI APIs/live FX/bank APIs/crypto/brokerage/bank matching and payment execution remain out of scope.
## 2026-06-23: Phase 8D-B2 imports recurring CSV after preview and confirmation

Decision:

Add Settings support for recurring-expense-only CSV import with browser-local parsing, row preview, row-level validation errors, duplicate warnings, and a strong confirmation phrase before any IndexedDB write. The write path stays inside `SettingsPage -> financeDataService -> financeRepository -> Dexie`, and imported rows become new local `rec-csv-*` recurring expenses.

Rationale:

Recurring expenses are planning records with a smaller accounting blast radius than receipts or bank imports, but they still affect Dashboard recurring estimates. Keeping the import as a separate preview/confirm flow prevents malformed CSV files from mutating local recurring data and avoids accidentally creating transactions from subscription records.

Consequences:

- Recurring CSV preview does not mutate IndexedDB.
- Required import fields are name, amount, currency, frequency, next due date, and account.
- Category is optional unless supplied; supplied accounts and categories resolve by id or name against the current local snapshot.
- Likely duplicates are warnings based on name, merchant/description, amount, currency, frequency, and next due date, not automatic rejections.
- Confirmed imports create new `rec-csv-*` recurring expenses and ignore CSV ids, display amounts, display currency, and timestamps for writes.
- Original imported amount and currency are preserved; manual FX remains display-only.
- Confirmed recurring imports can update only the separate recurring monthly estimate after confirmation.
- Confirmed recurring imports do not create transactions and do not change Dashboard monthly transaction spend.
- Receipt item CSV import, final receipt import, receipt draft import, CSV bank matching, and external integrations remain out of scope.
- CSV export, transaction CSV import, JSON backup/restore/reset, receipt confirmation, item analytics, recurring CRUD behavior, FX semantics, and Dashboard monthly spend semantics remain unchanged.
- Real Gmail/Drive/Docs/OAuth/backend/OCR/AI APIs/live FX/bank APIs/crypto/brokerage/bank matching and payment execution remain out of scope.

## 2026-06-23: Phase 8D-B3 hardens existing CSV flows without expanding import scope

Decision:

Keep Phase 8D-B3 focused on shared QA and safety coverage for the existing CSV export, transaction import, and recurring import flows. Do not add new CSV import types.

Rationale:

Transaction and recurring imports already cover the MVP write surfaces that can be safely previewed and confirmed locally. Before considering receipt, account, category, bank, or reconciliation imports, the existing CSV paths need stronger proof that malformed files, invalid rows, duplicate-like data, and export actions behave consistently and do not accidentally mutate local data.

Consequences:

- CSV export remains read-only for transactions, confirmed receipt items, and recurring expenses.
- Malformed quoted CSV returns file errors before row import.
- Invalid transaction and recurring import batches are rejected without partial writes.
- Duplicate detection remains warning-only and does not automatically reject rows.
- Confirmed transaction imports continue to create local `csv_import` transactions only.
- Confirmed recurring imports continue to create local `rec-csv-*` recurring expenses only.
- Recurring CSV import does not create transactions and does not change Dashboard monthly transaction spend.
- Dashboard monthly spend changes only after confirmed transaction CSV imports.
- Recurring monthly estimates change only after confirmed recurring CSV imports.
- Receipt item CSV import, final receipt import, receipt draft import, account/category import, CSV bank matching, reconciliation import, and external integrations remain out of scope.
- JSON backup/restore/reset, receipt confirmation, item analytics, recurring CRUD behavior, FX semantics, and Dashboard semantics remain unchanged.
## 2026-06-23: Phase 8E validates AI extraction JSON before draft writes

Decision:

Add runtime validation for AI receipt extraction results before the manual simulator can save receipt drafts. Keep the simulator local/mock-only and keep AI extraction output limited to receipt drafts and draft items.

Rationale:

The receipt extraction contract and prompt describe structured JSON, but TypeScript types and prompt text do not protect IndexedDB from malformed provider output at runtime. Validating provider metadata, source metadata, required draft fields, item fields, dates, currency codes, amounts, warnings, and confidence before `saveReceiptDraft` keeps the AI intake boundary reviewable and prevents partial draft creation from bad extraction data.

Consequences:

- `financeDataService` validates extraction results before converting them to `ReceiptDraftInput` or calling `saveReceiptDraft`.
- Invalid extraction results are rejected before receipt draft or draft item writes.
- Valid extraction results still create editable receipt drafts only.
- Total/item mismatches, unknown categories, unclear items, and low confidence become review warnings or item flags, not automatic confirmation.
- The receipt extraction prompt and JSON schema now state stricter output rules for required fields, currency format, dates, amounts, confidence, warnings, and no extra fields.
- AI extraction still cannot create transactions, final receipts, final receipt items, Dashboard totals, recurring expenses, FX changes, or external provider records.
- Real AI API calls, Gmail, Drive, Docs, OAuth, backend, scheduled sync, OCR, live FX, bank APIs, crypto/brokerage, bank matching, and payment execution remain out of scope.
- Receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring, FX, and Dashboard semantics remain unchanged.
