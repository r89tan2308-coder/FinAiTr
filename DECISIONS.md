# Decisions

## 2026-06-03: First MVP scope is local-first only

Decision:

The first MVP is limited to manual transactions, pasted receipt text parsing, receipt review, recurring expenses, and dashboard analytics.

Rationale:

This proves the core value, item-level personal finance analytics, without requiring external accounts, provider credentials, or backend infrastructure.

Consequences:

- CSV import/export is deferred until after the first MVP.
- Real bank, Gmail, Google Drive, Google Docs, OCR, crypto, and brokerage integrations are out of scope.
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

## 2026-06-23: Phase 8F documents MVP QA before post-MVP integrations

Decision:

Run MVP stabilization as a documentation and verification pass, not as a feature-expansion phase. Keep the QA evidence in `QA_CHECKLIST.md`, add focused transaction page regression coverage, and use browser smoke plus existing automated tests to verify current local workflows.

Rationale:

The MVP now has multiple data-changing surfaces: manual transactions, receipt draft review/confirmation, recurring expenses, JSON backup/restore/reset, CSV export, transaction CSV import, recurring CSV import, and manual FX settings. Before any real integration work starts, the current behavior needs an explicit QA checkpoint that records what was verified, what is covered by tests, and what still needs native browser file-picker verification by a human.

Consequences:

- Phase 8F does not add new product features or external integrations.
- The QA checklist maps the eleven MVP workflows to browser-smoke and automated-test evidence.
- Native file-picker restore/import steps are documented as manual browser limitations for automation while file parsing, preview, confirmation, and repository write safety remain test-covered.
- Transaction page create/edit/delete callback behavior now has focused UI regression coverage.
- Existing transaction, receipt, recurring, FX, JSON backup/restore, CSV import/export, and Dashboard semantics remain unchanged.
- After the Phase 8F checkpoint is committed and pushed, the next recommended phase is Phase 9A planning for post-MVP integration scope and guardrails; real integrations should still wait for that planning update.

## 2026-06-23: Phase 9A plans Google source integrations before implementation

Decision:

Document future Gmail, Google Drive, and Google Docs receipt-source integration architecture before adding OAuth, Google API clients, backend code, scheduled sync, or real provider reads. Keep Phase 9A planning-only in `GOOGLE_INTEGRATION_PLAN.md` and related project docs.

Rationale:

Google receipt sources can expose sensitive mailbox, Drive, and document data. Gmail body reads and broad Drive discovery use restricted scopes, and long-lived refresh tokens or scheduled sync require backend security, revocation, logging, deletion, consent, and verification planning. The current MVP accounting model is already stable and should not be bypassed by external sources.

Consequences:

- Future Google providers stay behind `ReceiptTextSourceProvider` and return receipt-like text candidates only.
- Google source text can create receipt drafts only after extraction validation passes.
- Human review and explicit confirmation remain required before any final receipt, linked transaction, or Dashboard impact.
- Manual Drive/Docs selected-file import using the narrowest practical selected-file scope, preferably `drive.file`, is the preferred first implementation path.
- Gmail body import is deferred until backend token handling, restricted-scope verification, privacy, deletion, logging, and rate-limit behavior are designed.
- Scheduled sync is backend-only and remains a separate later phase.
- OAuth client secrets, access tokens, and refresh tokens must not be stored in IndexedDB, JSON backups, CSV exports, receipt source metadata, committed config, or local logs.
- Duplicate source documents/messages and duplicate extracted receipt content must warn the user and require a choice instead of silently overwriting records.
- Phase 9A changes documentation only and does not change product runtime behavior.

## 2026-06-23: Phase 9B uses mock Google sources to prove the provider boundary

Decision:

Add local-only mock Gmail, Google Drive, and Google Docs source providers behind `ReceiptTextSourceProvider`. Selected mock sources flow through the existing mock AI extraction provider, runtime extraction validation, and receipt draft persistence path.

Rationale:

The product needs confidence that Google source intake fits the existing draft/review/confirm accounting boundary before any OAuth, restricted scopes, backend token storage, or real Google data access is introduced. Mock providers allow tests and UI smoke coverage for source metadata, duplicate detection, and draft-only behavior without external data movement.

Consequences:

- Mock Google sources can list and fetch local receipt text candidates only.
- Mock source records preserve source type, external id, title/sender, received or modified date, source provider name, content hash, and raw text evidence.
- Duplicate detection rejects already-ingested mock sources by provider kind plus external id and/or content hash before mutation.
- Selected mock sources can create only receipt drafts and draft items after extraction validation passes.
- Dashboard impact still requires human review and explicit receipt confirmation.
- No real Gmail, Google Drive, Google Docs, OAuth, Google packages, backend, scheduled sync, OCR, real AI API calls, live FX, bank APIs, crypto/brokerage, bank matching, or payment execution is added.
- Receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, and Dashboard semantics remain unchanged.

## 2026-06-24: Phase 9C keeps real Google integration disabled behind a readiness skeleton

Decision:

Add a disabled-by-default Google OAuth/backend readiness skeleton with placeholder environment names, a local integration status model, disabled Gmail/Drive/Docs provider placeholders, and a read-only Settings status. Do not add OAuth, Google API clients, backend code, token storage, or real provider reads.

Rationale:

The next implementation step needs a stable boundary for future OAuth decisions without accidentally enabling sensitive Google data access. Official Google guidance emphasizes exact redirect URI configuration, scope minimization, contextual permission requests, narrow Drive `drive.file` access where possible, and restricted-scope review for Gmail read or broad Drive access. A disabled skeleton lets the app document and test those guardrails before building any auth flow.

Consequences:

- `.env.example` documents only empty placeholders and disabled feature flags.
- Runtime config/status exposes booleans and status text, not configured placeholder values.
- Settings shows `Google integration planned / not connected` with no connect action.
- Disabled Gmail, Google Drive, and Google Docs placeholders implement the source-provider interface but return no candidates and do not call network APIs.
- No OAuth tokens, refresh tokens, client secrets, grants, cursors, provider sessions, backend URLs with secrets, or Google data are stored.
- Package dependencies remain unchanged.
- Phase 9B mock source ingestion remains the only Google-like receipt source behavior in the product runtime.
- Existing receipt confirmation, analytics, backup/restore, CSV, recurring, FX, and Dashboard semantics remain unchanged.
## 2026-06-24: Phase 9D requires backend for production Google OAuth and provider lifecycle

Decision:

Future production Google integration requires a backend before real OAuth callback handling, authorization response exchange, long-lived provider access, Gmail body import, broad Drive/Docs access, scheduled sync, provider revocation, or provider-data deletion is enabled. Phase 9D adds only disabled backend endpoint definitions, backend readiness config, and a no-op backend client.

Rationale:

Official Google guidance describes web-server OAuth as a flow for applications that can securely store confidential information and maintain state, requires exact redirect URI configuration, recommends incremental and narrow scopes, identifies Gmail read scopes and broad Drive scopes as restricted, and requires security assessment when restricted-scope data is stored or transmitted on servers. The PWA must not store provider credentials or restricted provider data outside the existing local receipt-draft evidence boundary.

Consequences:

- `src/google-integration/googleBackendReadiness.ts` documents future backend endpoint names and keeps them disabled.
- Backend readiness can record requested placeholder flags but cannot enable endpoint calls, network calls, credential persistence, scheduled sync, or provider reads.
- The only possible future frontend-only exception is manual user-selected Drive/Docs import using a narrow selected-file scope such as `drive.file`, with no stored long-lived credential, no scheduled sync, no broad Drive scan, and draft-only local writes.
- OAuth client secrets, authorization responses, access tokens, refresh tokens, provider sessions, sync cursors, provider cookies, raw Google source text, and provider credentials must not be stored in IndexedDB, localStorage, JSON backups, CSV exports, source metadata, logs, tests, or committed config.
- Future provider disconnect must revoke provider grants where possible and delete provider credential state, cached candidates, sync cursors, and diagnostics while preserving user-created local finance records by default.
- Existing Phase 9B mock Google sources, receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, and Dashboard semantics remain unchanged.
## 2026-06-24: Phase 9E requires privacy and consent gates before real Google access

Decision:

Before any real Google OAuth, Gmail, Drive, Docs, backend token handling, scheduled sync, or real AI extraction provider is implemented, the product must have clear user-facing privacy and consent disclosures for the exact import path being enabled. Phase 9E is documentation and copy planning only.

Rationale:

Google policy requires clear and accurate disclosure of who is requesting data, what data is requested, why it is requested, and how it is used. Google Workspace consent guidance also recommends minimum necessary scopes and additional review for sensitive or restricted scopes. The product must preserve the local-first accounting boundary: Google source text can create receipt drafts only, while Dashboard impact requires human review and explicit confirmation.

Consequences:

- Settings and OAuth copy must explain accessed Gmail/Drive/Docs data, draft-only import behavior, AI extraction disclosure, disconnect/revocation, deletion, and support/privacy policy expectations before consent.
- Receipt text may be sent to a future AI extraction provider only when that provider is explicitly enabled in a later phase and disclosed before use.
- Google user data must be used only for visible receipt import features; it must not be sold, used for ads, used for creditworthiness/lending, or exposed to human review without explicit user agreement or a narrow security/legal need.
- Future implementation phases must satisfy the OAuth consent checklist in `GOOGLE_INTEGRATION_PLAN.md` before adding real provider access.
- No runtime behavior, OAuth flow, Google API call, backend server, token storage, scheduled sync, or AI provider call is added in Phase 9E.

## 2026-06-24: Phase 9F selected-file Drive/Docs import stays local-only

Decision:

Add a manual Drive/Docs selected-file import prototype that reads supported local text-like files in the browser, maps them to Google Drive/Docs-like source metadata, validates local mock extraction output, and saves receipt drafts only.

Rationale:

The product needs a usable selected-file intake path before real Google provider access. A local browser file-input prototype proves the Drive/Docs source metadata, duplicate detection, extraction validation, and draft/review/confirm boundary without OAuth, Google APIs, backend credential handling, restricted scopes, or provider data movement.

Consequences:

- Supported local selected-file extensions are `.txt`, `.md`, `.markdown`, `.html`, `.htm`, and `.json`.
- The browser reads selected file text locally; no Google Drive, Google Docs, OAuth, backend, token storage, scheduled sync, OCR, or real AI provider call is added.
- Selected files are treated as `google_drive` or `google_docs` receipt text candidates with file name/title, pseudo source id, content hash, modified/imported timestamps, and raw text evidence.
- Duplicate selected files are rejected by source id or content hash before extraction or IndexedDB mutation.
- Selected-file ingestion writes only receipt drafts and draft items after extraction validation passes.
- Dashboard impact still requires human review and explicit receipt confirmation.
- Receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, and Dashboard semantics remain unchanged.
## 2026-06-26: Phase 9G Gmail manual import stays local-only

Decision:

Add a manual Gmail-like receipt import prototype that accepts pasted email-like receipt text or local `.eml`/`.txt` file text in the browser, maps it to Gmail source metadata, validates local mock extraction output, and saves receipt drafts only.

Rationale:

The app needs to prove selected Gmail-message intake semantics before any real Gmail OAuth, restricted Gmail scopes, backend token handling, provider lifecycle, or scheduled sync is implemented. A local manual prototype exercises sender, subject, received date, pseudo message id, content hash duplicate detection, extraction validation, and the existing review/confirm accounting boundary without moving data to Google or a backend.

Consequences:

- The browser reads selected `.eml` and `.txt` files locally; no Gmail API, OAuth, Google Identity Services, backend, token storage, scheduled sync, OCR, or real AI provider call is added.
- Pasted/file text is treated as a `gmail` receipt text candidate with pseudo message id, content hash, sender, subject/title, received time when valid, fetched/imported timestamp, source provider name, extraction provider metadata, and raw text evidence.
- Missing optional sender, subject, or received date metadata is allowed with review warnings; invalid user-provided received dates are rejected before extraction or persistence.
- Duplicate Gmail-like content is rejected by source id or content hash before extraction or IndexedDB mutation.
- Gmail-like ingestion writes only receipt drafts and draft items after extraction validation passes.
- Dashboard impact still requires human review and explicit receipt confirmation.
- Receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, and Dashboard semantics remain unchanged.
- Production Gmail import still requires the Phase 9D backend/token lifecycle decision and Phase 9E privacy/consent gates before any real provider access is enabled.
## 2026-06-26: Phase 9H gates real Google OAuth and provider access

Decision:

Treat real Google OAuth, Gmail API access, broad Drive/Docs access, backend token lifecycle, scheduled sync, provider revocation, and provider-data deletion as blocked until the Phase 9H release gates in `GOOGLE_INTEGRATION_PLAN.md` are satisfied and validated. Phase 9H is documentation-only and does not change runtime behavior.

Rationale:

Official Google guidance keeps OAuth scope choice, consent clarity, redirect handling, token storage, restricted scopes, user data policy obligations, revocation, and deletion as release-critical concerns. The app now has local-only Gmail-like and Drive/Docs-like prototypes that prove the draft/review/confirm boundary, but real provider access would expose sensitive mailbox, document, and file data and must not be added opportunistically.

Consequences:

- Future real provider work must pass hard requirements for OAuth consent, privacy copy, support links, data minimization, scope justification, backend token handling, revocation/disconnect, provider-data deletion, logging restrictions, duplicate detection, extraction validation, and draft-only writes.
- Narrow selected-file Drive/Docs access is the preferred first real provider path where practical; Gmail read scopes and broad Drive/Docs scopes remain higher-risk restricted-scope work.
- Frontend-only experiments are allowed only when they do not request broad scopes, store long-lived credentials, use scheduled sync, or bypass draft-only accounting boundaries.
- Backend-backed OAuth can proceed only after secure callback handling, state/CSRF protection, redirect URI allowlisting, encrypted token storage, revocation, disconnect, deletion, redacted diagnostics, and tests are implemented.
- Gmail read-only ingestion can proceed only after backend, restricted-scope verification readiness, selected-message or explicit-filter UX, raw body/attachment minimization, deletion, rate-limit, duplicate, validation, and draft-only QA gates pass.
- Scheduled sync is backend-only and cannot create Dashboard-impacting records without human review and explicit confirmation.
- Tokens, authorization codes, provider sessions, sync cursors, provider cookies, client secrets, raw email/document bodies, provider responses, and source URLs containing secrets must not be stored in IndexedDB, localStorage, sessionStorage, JSON backups, CSV exports, receipt source metadata, logs, tests, or committed config.
- Existing receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, Dashboard semantics, and local-only Google-like prototypes remain unchanged.

## 2026-06-26: Phase 9I keeps backend OAuth as disabled architecture only

Decision:

Add typed frontend-safe contracts for a future Google backend OAuth boundary while keeping OAuth, backend endpoint calls, token storage, provider reads, provider revocation, provider-data deletion runtime, source sync, and scheduled sync disabled. Phase 9I adds architecture skeleton code and tests only.

Rationale:

The project needs stable type-level boundaries before implementing any real backend OAuth flow. Defining start, callback, status, disconnect, revoke, and source sync contracts now makes future implementation reviewable, while disabled defaults and tests prevent accidental product behavior changes or premature provider access.

Consequences:

- `src/google-integration/googleOAuthBackendSkeleton.ts` defines disabled endpoint contracts and typed disabled request/response boundaries for OAuth start, callback, provider status, provider disconnect, provider revoke, and source sync.
- `DisabledGoogleOAuthBackendBoundaryClient` returns disabled responses and does not call its optional network adapter while disabled.
- Existing Phase 9D backend flags can be recognized as requested, but they remain `requested_but_blocked` and cannot enable endpoint calls, network calls, token storage, provider reads, revocation, or sync.
- No backend server runtime, OAuth redirect handler, authorization-code exchange, Google API client, token store, provider revocation call, provider data deletion runtime, scheduled sync, dependency, or UI behavior is added.
- Existing local-only Google-like prototypes, receipt confirmation, deterministic analytics, JSON backup/restore, CSV import/export, recurring expenses, FX, and Dashboard semantics remain unchanged.
- Future real backend work still requires explicit approval plus secure callback/state handling, encrypted credential storage, revocation, disconnect, deletion, redacted diagnostics, release-gate QA, and updated docs.

## 2026-06-26: Phase 9J unifies receipt source-provider UX without changing accounting semantics

Decision:

Unify the Receipts page source-provider UX and source metadata display for current local/mock import paths while keeping every import path draft-only and preserving existing service/repository boundaries.

Rationale:

The app now has several local receipt source paths: manual paste, manual AI simulator, local Gmail-like paste/file import, local Drive/Docs selected-file import, and mock Google samples. They already share the draft/review/confirm accounting boundary, but the UI presented them as separate features with uneven source metadata display. A shared source-provider UX model makes the current boundary easier to understand and prepares future real providers without enabling any provider access.

Consequences:

- `src/receipt-ingestion/sourceProviderUx.ts` defines labels, statuses, source metadata summaries, and duplicate status helpers for current local/mock source paths.
- Receipts page shows a source-provider overview and source-specific headers for manual paste, AI simulator, local Gmail, local Drive/Docs, and mock Google samples.
- Saved drafts and draft review consistently show source type, source title or filename, sender/owner where available, imported date, provider/model details where available, source id where available, and duplicate tracking status where available.
- Duplicate matching semantics remain in `financeDataService`; Phase 9J only surfaces duplicate status/warnings in the UI.
- Tests cover source-provider metadata visibility, duplicate warnings/status, and unchanged Dashboard-impacting records before confirmation across every current receipt source path.
- No real Gmail, Google Drive, Google Docs, OAuth, backend runtime, token storage, provider revocation, provider-data deletion runtime, source sync, scheduled sync, dependency, OCR, real AI provider, or accounting behavior change is added.
