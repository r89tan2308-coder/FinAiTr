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

## Phase 9B Mock Google Source QA

Phase 9B is a mock/local provider checkpoint. It adds no real OAuth flow, Google API client, backend, scheduled sync, or real provider read.

Automated checks:

- [x] Mock Gmail, Google Drive, and Google Docs providers list local source candidates.
- [x] Selected mock sources preserve source kind, external id, title/sender, received or modified timestamp, source provider name, and content hash.
- [x] Selected mock source text goes through the existing extraction validation path.
- [x] Valid mock source ingestion creates receipt drafts and draft items only.
- [x] Duplicate mock sources are rejected safely before mutation.
- [x] Invalid extraction output is rejected without partial draft writes.
- [x] Dashboard, Transactions, final Receipts, and receipt items remain unchanged before confirmation.
- [x] Receipts UI can start mock source ingestion and opens the saved draft in the existing review flow.

Manual browser check:

- [ ] Open Receipts, use `Mock Google sources`, ingest one mock source, verify the draft opens for review, then verify Dashboard changes only after marking reviewed and confirming the receipt.

## Phase 9C Google Readiness QA

Phase 9C is a disabled readiness checkpoint. It adds no OAuth flow, Google API client, backend, scheduled sync, token storage, or real provider read.

Automated checks:

- [x] Google integration defaults to disabled and not connected.
- [x] Config/status exposes placeholder presence only, not configured values.
- [x] Disabled Gmail, Google Drive, and Google Docs placeholders make no network calls.
- [x] Settings shows planned/not connected status with no connect action.
- [x] Package dependencies remain unchanged.

Manual browser check:

- [ ] Open Settings and verify Google integration is shown as planned/not connected, provider calls are blocked, and there is no Google connect/import/sync action.


## Phase 9D OAuth/Backend Decision QA

Phase 9D is a disabled backend architecture checkpoint. It adds no OAuth flow, backend server, Google API client, scheduled sync, token storage, or real provider read.

Automated checks:

- [x] Backend readiness defaults to disabled/no-op.
- [x] Backend auth, sync, and revocation flags can be recognized as requested placeholders without enabling endpoint calls or network calls.
- [x] Config/readiness objects do not expose configured client id, redirect URI, or backend URL values.
- [x] Future backend endpoint definitions are present but disabled.
- [x] The disabled backend client returns disconnected/no-op status, rejects OAuth start and authorization response exchange, returns empty source lists, and does not call `fetch`.
- [x] Backend architecture decision marks Gmail body import and scheduled sync as backend-required and restricted-scope work.

Manual browser check:

- [ ] Open Settings and verify the Google integration panel still shows planned/not connected, has no connect/import/sync/disconnect action, and provider calls are blocked.


## Phase 9E Privacy/Consent Planning QA

Phase 9E is a documentation and copy-planning checkpoint. It adds no OAuth flow, Google API client, backend server, token storage, scheduled sync, provider revocation call, or real AI provider read.

Documentation checks:

- [x] Future Settings Google connection copy is drafted for disabled, pre-connect, selected Drive/Docs import, Gmail import, AI extraction disclosure, draft review, connected, disconnect, and revoked/error states.
- [x] Gmail, Drive, and Docs future data access is documented separately.
- [x] Google source ingestion is documented as receipt-draft-only before human review and explicit confirmation.
- [x] Data minimization, logging restrictions, token handling, disconnect/revocation, diagnostics deletion, and user data deletion expectations are documented.
- [x] Future AI extraction provider disclosure is documented and remains disabled until a later explicit phase.
- [x] Future OAuth consent checklist is documented.

Future implementation QA gates:

- [ ] Verify actual Settings copy matches the Phase 9E draft before enabling any Google connect action.
- [ ] Verify OAuth consent screen scopes and privacy policy match the import path being released.
- [ ] Verify selected-file Drive/Docs import does not broad-scan Drive.
- [ ] Verify Gmail import fetches body text only after user selection or explicit filters.
- [ ] Verify disconnect revokes provider access where possible and deletes provider credential state, cached candidates, sync cursors, and diagnostics.

## Phase 9F Local Drive/Docs Selected-File Import QA

Phase 9F is a local-only browser selected-file prototype. It adds no OAuth flow, Google API client, backend server, token storage, scheduled sync, provider revocation call, OCR, or real AI provider read.

Implemented QA checks:

- [x] Supported local `.txt`, `.md`, `.html`, and `.json` selected files can be converted into Drive/Docs-like receipt text candidates.
- [x] Unsupported file types are rejected before draft creation.
- [x] Selected-file source metadata preserves source kind, file name/title, pseudo source id, content hash, modified time when available, fetched/imported time, provider/model metadata, and raw text evidence.
- [x] Selected-file raw text flows through the existing local mock extraction provider and runtime extraction validation before `saveReceiptDraft`.
- [x] Invalid selected-file extraction output is rejected without partial draft writes.
- [x] Duplicate selected files are rejected by source id/content hash before mutation.
- [x] Selected-file ingestion creates receipt drafts and draft items only.
- [x] Dashboard, Transactions, final Receipts, confirmed receipt items, recurring expenses, FX, JSON backup/restore, and CSV behavior remain unchanged before explicit receipt confirmation.
- [x] Receipts UI shows selected-file preview/status/error states and opens the existing review flow after successful import.

Future QA gates remain open:

- [ ] Verify any future real Google Drive/Docs selected-file provider uses narrow selected-file access, preferably `drive.file`, and does not broad-scan Drive.
- [ ] Verify real provider disconnect/revocation/deletion behavior before enabling OAuth-backed Drive/Docs access.
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

## Phase 9G Local Gmail Manual Import QA

Phase 9G is a local-only browser paste/file prototype. It adds no Gmail API client, OAuth flow, backend server, token storage, scheduled sync, provider revocation call, OCR, attachment fetch, or real AI provider read.

Automated coverage:

- [x] Local Gmail source builder parses email-like From, Subject, Date/Received, Message-ID-like metadata, content hash, pseudo message id, and imported timestamp.
- [x] Missing optional sender, subject, and received date metadata is allowed with review warnings.
- [x] Invalid user-provided received dates are rejected before extraction or mutation.
- [x] Local `.eml`/`.txt` file selection reads text in the browser and can open a draft review after import.
- [x] Duplicate Gmail-like messages are rejected by source id/content hash before draft writes.
- [x] Invalid extraction output is rejected before partial draft/item writes.
- [x] Valid Gmail-like import writes receipt drafts and draft items only.
- [x] Dashboard, Transactions, final Receipts, receipt items, recurring expenses, FX settings, JSON backup/restore, and CSV behavior remain unchanged before explicit receipt confirmation.

Manual browser smoke before release/demo:

- [ ] Paste an email-like receipt in Receipts -> Local Gmail receipt and import it; verify the saved draft opens in review with Gmail source metadata.
- [ ] Select a local `.eml` file and import it; verify the browser does not ask for Google consent and no network/provider connection appears.
- [ ] Re-import the same Gmail-like content; verify the duplicate error appears and no extra draft is created.
- [ ] Enter an invalid received date and verify import is rejected without creating a draft.
- [ ] Confirm a reviewed Gmail-sourced draft and verify Dashboard changes only after confirmation.
## Phase 9H Google OAuth/Backend Release-Gate QA

Phase 9H is planning-only. It adds no OAuth flow, Google API client, backend server, token storage, scheduled sync, provider revocation runtime, OCR, real AI provider, dependency, or runtime UI change.

Documentation checks:

- [x] `GOOGLE_INTEGRATION_PLAN.md` defines hard release requirements before real Google integration.
- [x] OAuth consent, privacy copy, support links, scopes, backend token handling, revocation/disconnect, deletion, logging restrictions, and user-facing disclosures are covered.
- [x] Minimum viable scope strategy prefers narrow Drive/Docs selected-file access and treats Gmail/broad Drive as higher-risk restricted-scope work.
- [x] Go/no-go criteria exist for frontend-only selected-file experiments, backend-backed OAuth, Gmail read-only ingestion, Drive/Docs selected-file or picker ingestion, and scheduled sync.
- [x] Security checks prohibit tokens in IndexedDB/localStorage/sessionStorage, raw email/document bodies in logs, secrets in repo, and Dashboard impact before human confirmation.
- [x] A future implementation sequence after release-gate approval is documented.

Future implementation QA gates:

- [ ] Verify any real OAuth phase keeps provider calls disabled by default until consent, backend, token, revocation, deletion, logging, and QA gates pass.
- [ ] Verify no access tokens, refresh tokens, authorization codes, provider sessions, sync cursors, provider cookies, or client secrets are stored in browser storage, JSON backups, CSV exports, source metadata, logs, tests, or committed config.
- [ ] Verify Gmail import fetches body or attachment text only after explicit selected-message or user-filter action.
- [ ] Verify Drive/Docs provider access starts with narrow selected-file/picker behavior and does not silently scan broad Drive files.
- [ ] Verify scheduled sync is backend-only, visible to the user, rate-limited, revocable, deletable, and still draft-only before confirmation.

## Phase 9I Disabled Backend OAuth Architecture Skeleton QA

Phase 9I adds typed disabled contracts only. It adds no OAuth flow, Google API client, backend server runtime, token storage, scheduled sync, provider revocation runtime, provider deletion runtime, dependency, OCR, real AI provider, or runtime UI change.

Automated checks:

- [x] `googleOAuthBackendEndpointContracts` defines disabled contracts for OAuth start, OAuth callback, provider status, provider disconnect, provider revoke, and source sync.
- [x] Backend auth, sync, and revocation flags can be requested but remain blocked with endpoint calls, network calls, and token storage disabled.
- [x] `DisabledGoogleOAuthBackendBoundaryClient` returns typed disabled responses for start, callback, status, disconnect, revoke, and source sync.
- [x] The disabled boundary client does not call its optional network adapter.
- [x] Disabled responses do not expose access tokens, refresh tokens, id tokens, client secrets, authorization URLs, source text, provider sessions, or sync cursors.
- [x] Source sync returns zero synced candidates and does not store sync cursors or fetch source text.

Future implementation QA gates:

- [ ] Before any real backend runtime is added, verify callback state/CSRF handling, redirect allowlisting, encrypted token storage, revocation, disconnect, provider-data deletion, redacted diagnostics, and failure-mode tests.
- [ ] Verify real provider access still creates receipt drafts only and cannot update Dashboard, transactions, recurring expenses, CSV, JSON backup/restore, or FX behavior before human review and receipt confirmation.

## Phase 9J Receipt Source-Provider UX and Metadata QA

Phase 9J is local/mock UX and metadata cleanup only. It adds no OAuth flow, Google API client, backend server runtime, token storage, scheduled sync, provider revocation runtime, provider deletion runtime, dependency, OCR, real AI provider, source sync, or accounting behavior change.

Automated checks:

- [x] Receipts page shows a unified source-provider overview for manual paste, AI simulator, local Gmail, local Drive/Docs, and mock Google samples.
- [x] Saved drafts show fallback source metadata even when a manual pasted draft has no explicit `sourceMetadata`.
- [x] Gmail, Drive/Docs, AI simulator, and mock Google draft review still expose source type plus source title/from/filename metadata.
- [x] Mock source candidates surface duplicate status when a matching draft or confirmed receipt exists locally.
- [x] Duplicate warnings returned by source import actions are shown to the user.
- [x] Manual paste, manual AI simulator, local Gmail-like import, local Drive/Docs selected-file import, and mock Google sample import all still create drafts only before confirmation.
- [x] Dashboard-impacting records and Dashboard overview remain unchanged before explicit receipt confirmation across every current source path.

Future implementation QA gates:

- [ ] Verify any real provider UI uses the same source-provider overview and metadata evidence pattern before enabling OAuth-backed access.
- [ ] Verify real provider duplicate status uses source id/content hash without exposing provider secrets, tokens, source URLs containing secrets, raw source text, or sync cursors.

## Phase 9K Source-Provider End-to-End QA and Release Candidate

Phase 9K is a local/mock QA pass only. It adds no OAuth flow, Google API client, backend server runtime, token storage, scheduled sync, provider revocation runtime, provider deletion runtime, dependency, OCR, real AI provider, source sync, or accounting behavior change.

Automated checks:

- [x] Manual paste/parser, manual AI simulator, local Gmail, local Drive/Docs, and mock Google source paths all still create editable receipt drafts only before review and confirmation.
- [x] Source metadata remains visible and consistent in saved drafts and draft review.
- [x] Duplicate warnings/status remain visible for source imports and duplicate source candidates.
- [x] Invalid extraction outputs are rejected without partial draft writes for manual AI, local Gmail, local Drive/Docs, and mock Google source paths.
- [x] Review to confirmation creates one confirmed receipt, confirmed receipt items, and one linked receipt transaction.
- [x] Dashboard monthly spend and confirmed receipt item analytics update only after explicit confirmation.
- [x] JSON backup/restore preserves source metadata on confirmed drafts and final receipts.
- [x] Confirmed receipt item CSV export remains read-only and includes source evidence for confirmed receipt items.

Known limitations:

- [x] Manual browser QA should still be run before a demo/release because Phase 9K automated checks do not replace visual inspection of native file inputs, downloaded files, and browser IndexedDB state.

Future implementation QA gates:

- [ ] Before any real provider access is added, repeat the Phase 9K source-provider release-candidate matrix with OAuth/backend gates enabled only in a dedicated future phase.

## Phase 10A Production Build and PWA Packaging QA

Phase 10A is production-readiness documentation and preview verification. It adds no backend, OAuth, real Google provider, token storage, source sync, service worker, offline cache, dependency, or accounting behavior change.

Automated and local checks:

- [x] `README.md` documents install, local dev, production build, production preview, validation, local data/privacy, and static hosting basics.
- [x] `PRODUCTION_BUILD.md` documents `npm run build`, `npm run preview`, `dist/`, manifest/icon expectations, static hosting, and no-service-worker limitations.
- [x] `index.html` includes app description, theme color, app name metadata, favicon, and manifest link.
- [x] `public/manifest.webmanifest` includes name, short name, description, start URL, scope, display mode, colors, categories, language, and SVG icon placeholder.
- [x] Documentation states that local-first IndexedDB data does not imply guaranteed offline asset loading.
- [x] Production preview must serve `dist/` and return the root page plus manifest successfully.

Manual browser checks before release/demo:

- [ ] Run `npm run build`.
- [ ] Run `npm run preview -- --host 127.0.0.1 --port 4173`.
- [ ] Open `http://127.0.0.1:4173/` and verify Dashboard renders.
- [ ] Open Settings and verify storage/PWA status renders.
- [ ] Verify preview-origin IndexedDB data is separate from dev-server data unless moved with JSON backup/restore.
- [ ] Verify there is no offline-mode promise in UI or docs beyond local browser data ownership.

## Phase 10B MVP Release Polish and First-Use QA

Phase 10B is copy, checklist, and installability polish only. It adds no backend, OAuth, real provider access, network calls, service worker, offline cache, dependency, or accounting behavior change.

Automated and documentation checks:

- [x] Transactions explains that manual entries are local and receipt-linked entries appear only after receipt confirmation.
- [x] Receipts explains that every source creates editable drafts only and Dashboard totals change only after review and explicit confirmation.
- [x] Recurring explains that recurring expenses are planning records and do not create transactions.
- [x] Settings explains local-first IndexedDB storage, JSON backup/restore, CSV import/export, reset scope, manual FX settings, installability limits, and disabled Google access.
- [x] README and production build docs include an MVP release checklist and installability notes without offline guarantees.
- [x] Regression tests cover first-use copy and empty-state guardrails for Transactions, Receipts, Recurring, and Settings.

Manual release pass additions:

- [ ] Confirm mobile layout remains readable for Dashboard, Transactions, Receipts, Recurring, Categories, and Settings.
- [ ] Confirm Settings still shows display currency and manual FX rates after the new local-first/installability section.
- [ ] Confirm receipt source cards and saved-draft empty state make draft-only behavior clear before any confirmation.
- [ ] Confirm native file inputs for JSON restore and CSV imports still require preview/confirmation in a normal browser.
- [ ] Confirm no UI copy says Google is connected, offline-ready, or backed by real AI/provider calls.
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
