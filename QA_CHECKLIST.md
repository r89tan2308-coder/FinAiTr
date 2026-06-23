# Phase 8F MVP QA Checklist

Date: 2026-06-23
Scope: local-first MVP stabilization and manual QA pass.
Dev server: `npm run dev -- --port 5174`; Vite used `http://127.0.0.1:5176/` because ports 5174 and 5175 were already occupied.

## Scope Guard

- No real bank API, Gmail, Google Drive, Google Docs, OAuth, backend, OCR API, AI API, live FX, crypto, brokerage, bank matching, or payment execution was added.
- No product semantics were intentionally changed for transactions, receipts, recurring expenses, FX, JSON backup/restore, CSV import/export, or Dashboard analytics.
- QA verification stayed inside the existing `SettingsPage -> financeDataService -> financeRepository -> Dexie/domain` boundaries.

## Phase 9A Planning QA

Phase 9A is a documentation-only checkpoint. It does not require new browser runtime QA because no product code, OAuth flow, Google API client, backend, scheduled sync, or real provider read is added.

Planning checks:

- [x] `GOOGLE_INTEGRATION_PLAN.md` defines Gmail, Google Drive, and Google Docs source-provider architecture.
- [x] OAuth scopes are documented with a narrow selected-file Drive/Docs first path and deferred restricted Gmail/broad Drive paths.
- [x] Backend requirements are documented for Gmail body import, scheduled sync, refresh-token storage, revocation, rate limits, and restricted-scope data handling.
- [x] Receipt discovery rules are explicit and user-controlled for Gmail, Drive, and Docs.
- [x] Duplicate detection covers provider source identity and content fingerprints.
- [x] Source text still flows through extraction validation, receipt drafts, review, and explicit confirmation before Dashboard impact.
- [x] Failure modes, rate limits, user consent, logging, privacy, and deletion expectations are documented.
- [x] No runtime checklist item is marked passed for real Google integration because that integration is not implemented yet.

Future Google integration QA gates:

- Drive/Docs selected-file import must verify consent copy, selected-file access only, unsupported file handling, duplicate warnings, draft-only writes, and disconnect cleanup.
- Gmail import must verify restricted-scope consent, backend token handling, candidate listing, selected-message body fetch only, duplicate warnings, draft-only writes, rate-limit behavior, revocation, and deletion cleanup.
- Scheduled sync must verify backend-only cursors, refresh-token rotation/revocation, backoff, visible sync status, no silent broad scans, and user-controlled disable/delete behavior.
## Browser Smoke Results

- Dashboard: Passed. Verified Dashboard, monthly trend, spend by category, item analytics, item search/category controls, confirmed receipt item drilldown, recent transactions, and display-currency formatted amounts render in the in-app browser.
- Transactions: Passed. Verified the Transactions screen renders the add form, date/amount/currency/merchant/account/category/note/tags controls, filters, sort control, seeded transaction list, and add action.
- Receipts: Passed. Verified paste parser controls, manual AI extraction simulator controls, parser preview section, saved drafts, draft review, and receipt inbox render.
- Recurring: Passed. Verified recurring create controls, currency/account/category/frequency/status fields, recurring list, source amount display, and converted monthly estimate render.
- Settings: Passed. Verified display currency and manual FX rate controls, JSON export/restore/reset controls, CSV export controls, transaction CSV import controls, recurring CSV import controls, confirmation fields, storage/PWA/integration status, and record summary render.

## Flow Verification Matrix

| Flow | Phase 8F status | Evidence |
| --- | --- | --- |
| 1. Manual transaction CRUD | Passed | Browser smoke confirmed the transaction form/list controls. `src/pages/TransactionsPage.test.tsx` covers create, validation, edit, delete callbacks. `src/persistence/repositories/financeRepository.test.ts` covers create/update/delete persistence and Dashboard recalculation. |
| 2. Recurring expense CRUD | Passed | Browser smoke confirmed recurring controls/list. `src/pages/RecurringPage.test.tsx` covers create, edit, delete, validation, and converted monthly estimate. `src/persistence/repositories/financeRepository.test.ts` covers recurring CRUD without transaction-spend impact. |
| 3. Receipt paste parser -> draft -> review -> confirm | Passed | Browser smoke confirmed paste parser, saved drafts, draft review, and receipt inbox. `src/receipt-parser/parser.test.ts`, `src/pages/ReceiptsPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover parsing, draft save/delete, review edits, reviewed status, confirmation, linked transaction creation, and no unreviewed confirmation. |
| 4. Manual AI simulator -> draft -> review -> confirm | Passed | Browser smoke confirmed AI simulator controls. `src/receipt-ingestion/manualAiExtractionSimulator.test.ts`, `src/receipt-ingestion/receiptExtractionValidation.test.ts`, `src/pages/ReceiptsPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover local extraction, runtime validation, draft-only writes, review opening, confirmation, and invalid-output no-mutation behavior. |
| 5. Item analytics/search/filter/drilldown | Passed | Browser smoke confirmed item analytics controls and drilldown. `src/pages/DashboardPage.test.tsx` covers period switching, item search, category filtering, drilldown rows, empty states, and no monthly spend mutation. |
| 6. Dashboard monthly trends | Passed | Browser smoke confirmed six-month trend rendering. `src/pages/DashboardPage.test.tsx` and `src/domain/financeViews.test.ts` cover transaction-only trend spend, income split, empty state, display conversion, and no recurring/receipt-item double counting. |
| 7. JSON export/reset/restore | Passed with browser file-picker limitation | Browser smoke confirmed Settings controls. `src/pages/SettingsPage.test.tsx` and `src/persistence/repositories/financeRepository.test.ts` cover JSON backup download, restore preview/confirmation, invalid restore no-mutation, reset confirmation, seed restore, and analytics recalculation after restore. Native file selection was not automated in browser smoke. |
| 8. CSV export | Passed | Browser smoke confirmed all CSV export buttons. `src/domain/csvExport.test.ts`, `src/pages/SettingsPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover stable headers, escaping, empty datasets, display columns, confirmed receipt items only, recurring monthly values, and read-only behavior. |
| 9. CSV transaction import preview/confirm | Passed with browser file-picker limitation | Browser smoke confirmed file input, confirmation field, and import button. `src/domain/csvTransactionImport.test.ts`, `src/pages/SettingsPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover preview, required-field errors, duplicate warnings, malformed CSV errors, strong confirmation, confirmed `csv_import` writes, and no partial mutation. |
| 10. CSV recurring import preview/confirm | Passed with browser file-picker limitation | Browser smoke confirmed file input, confirmation field, and import button. `src/domain/csvRecurringImport.test.ts`, `src/pages/SettingsPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover preview, required-field errors, duplicate warnings, malformed CSV errors, strong confirmation, confirmed `rec-csv-*` writes, no partial mutation, and no transaction creation. |
| 11. Settings display currency and FX rates | Passed | Browser smoke confirmed display currency and manual FX controls. `src/domain/currencySettings.test.ts`, `src/pages/SettingsPage.test.tsx`, `src/pages/DashboardPage.test.tsx`, and `src/persistence/repositories/financeRepository.test.ts` cover conversion, formatting, persisted settings, restored settings, and display-only original currency preservation. |

## Manual Browser Checklist

Use this checklist for a human browser pass before a release checkpoint or demo:

- [ ] Start the app with `npm run dev` and note the actual Vite URL.
- [ ] Open Dashboard and verify monthly spend, recurring estimate, pending drafts, six-month trend, spend by category, item analytics, item search, category filter, drilldown, and recent transactions.
- [ ] Create a manual transaction, verify it appears in Transactions, verify Dashboard spend updates, edit it, then delete it.
- [ ] Create a recurring expense, verify the monthly estimate changes, edit it, pause/reactivate if needed, then delete it. Confirm no transaction is created.
- [ ] Paste receipt text, parse it, save a draft, open review, edit receipt/item fields, mark reviewed, confirm with an account/category, then verify the linked transaction and confirmed receipt item analytics.
- [ ] Use the manual AI extraction simulator with email-like text, save the draft, review it, confirm it, and verify Dashboard changes only after confirmation.
- [ ] Export JSON, reset local data with `RESET LOCAL DATA`, restore the exported JSON with `RESTORE LOCAL DATA`, and verify Dashboard/Transactions/Receipts/Recurring return to the exported state.
- [ ] Export transactions CSV, receipt items CSV, and recurring CSV; inspect headers and representative rows.
- [ ] Import transactions CSV, inspect preview warnings/errors, confirm with `IMPORT TRANSACTIONS CSV`, and verify Transactions/Dashboard update after confirmation only.
- [ ] Import recurring CSV, inspect preview warnings/errors, confirm with `IMPORT RECURRING CSV`, and verify Recurring/recurring estimate update without Transactions changes.
- [ ] Change display currency and manual FX rates, save, verify Dashboard/Transactions/Receipts/Recurring display conversion while original source currencies remain visible or preserved.

## Known Limitations From Phase 8F QA

- In-app browser smoke did not automate native file selection for JSON restore or CSV imports. Those flows are covered by Testing Library and repository tests; a human should repeat native file-picker steps in a normal browser before a release/demo checkpoint.
- Browser smoke verified page rendering and controls. Data-mutating browser entry is covered by component and repository tests because browser automation for local React controlled inputs can be unreliable in this environment.
- The manual AI extraction simulator remains local/mock-only and heuristic. It is not a real AI provider.
- npm prints `Unknown cli config "--run"` during `npm run test -- --run`, but Vitest still runs and exits successfully.
- Git may print CRLF normalization warnings on this Windows working tree.
