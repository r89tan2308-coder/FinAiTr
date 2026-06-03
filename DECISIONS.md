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
