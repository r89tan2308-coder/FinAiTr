# Product Specification

## Product

FinAiTr is a mobile-first PWA personal finance tracker focused on item-level receipt analysis.

The app helps a single user understand where money goes by combining:

- manual expense tracking;
- pasted receipt text parsing;
- human review of parsed receipt items;
- recurring expense tracking;
- dashboard analytics by category, merchant, product, and month.

## Core MVP

The first MVP is limited to local-first personal finance workflows:

1. Manual transactions.
2. Receipt text parsing from pasted OCR-like text.
3. Receipt review and confirmation.
4. Recurring expenses and subscriptions.
5. Dashboard analytics.

The MVP must be useful without bank access, server accounts, cloud storage, or real OCR.

Local data ownership is part of the MVP. The user can export app-owned local data to a versioned JSON backup, restore from a previously exported FinAiTr backup with validation and strong confirmation, export read-only CSV files for transactions, confirmed receipt items, and recurring expenses, import transaction and recurring expense CSV files through preview and strong confirmation, and reset this device's local app data back to the baseline seed state with strong confirmation.

## Current analytics vs future AI ingestion

Current Dashboard analytics are deterministic local app views. They are derived from:

- local manual transactions, including transaction-only monthly spend and income trends;
- confirmed final receipts;
- confirmed final receipt items;
- local recurring expense records;
- manual display-currency settings.

AI receipt ingestion is an intake layer, not a Dashboard analytics source by itself. Phase 8A includes a local-only manual simulator for email-like and document-like receipt text. Its job is to receive receipt text, extract a structured receipt draft through a mock provider, validate the extraction shape, and send that draft through the existing human review and confirm flow.

Future receipt text sources are:

- manual paste, already supported by the MVP parser UI;
- Gmail messages that contain receipt text;
- Google Drive files that contain receipt text;
- Google Docs documents that contain receipt text.

Current mock AI extraction and future real AI extraction must create receipt drafts only after runtime extraction validation passes. They must not create transactions, confirm receipts, update Dashboard totals, or skip human review. Dashboard impact still happens only after the user reviews a draft and explicitly confirms it into one final receipt plus one linked transaction.

Monthly trend analytics are deterministic Dashboard views. Trend spend is derived from transactions only, income is shown separately when category metadata marks transactions as income, recurring expenses remain a separate estimate, and confirmed receipt items remain item-level detail rather than extra spending.

## Future Google source integrations

Phase 9A plans future Gmail, Google Drive, and Google Docs receipt sources. Phase 9B adds local-only mock Gmail, Google Drive, and Google Docs source records so the provider boundary can be tested without real Google access. The detailed architecture, OAuth scope choices, backend decision, discovery rules, duplicate detection, privacy rules, deletion expectations, and rollout phases live in `GOOGLE_INTEGRATION_PLAN.md`.

Mock and future Google integrations are source intake features only. They should help the user find receipt-like source text, then create a schema-validated editable receipt draft. They must not create transactions, confirm receipts, update Dashboard totals, create recurring expenses, change FX settings, or skip the existing review flow.

User-visible expectations:

- The user explicitly starts each Google import flow.
- Current Phase 9B mock Google sources are local samples and do not connect to Google.
- The app explains which Google data is requested and why before requesting OAuth consent.
- Manual Drive/Docs selected-file import should be the first implementation path, using the narrowest practical selected-file scope.
- Gmail body import and scheduled sync are deferred until backend token handling, restricted-scope verification, privacy, logging, and deletion behavior are designed.
- Duplicate imported messages, files, documents, or extracted receipt content produce warnings and require a user choice.
- Disconnecting a future provider must revoke grants when possible and delete provider tokens, cursors, cached candidate metadata, and diagnostics while preserving user-created local finance records by default.

## Non-goals

The first MVP must not include:

- real bank API integration;
- stored bank credentials;
- real Gmail integration;
- real Google Drive integration;
- real Google Docs integration;
- real OCR API keys or provider calls;
- crypto exchange integration;
- brokerage or investment account integration;
- payment execution;
- multi-user auth;
- background server jobs;
- financial advice or tax advice automation.

Future integrations may be planned, but not implemented, until the local-first MVP is stable.

Phase 7C planning may define provider contracts, JSON schema, and prompt templates for future AI receipt extraction. Phase 8A may use those contracts through a local manual simulator. Phase 9A may document future Gmail, Google Drive, and Google Docs source integration guardrails. None of these phases may add real Gmail, Google Drive, Google Docs, OAuth, backend jobs, scheduled sync, OCR APIs, or AI API calls.

## Primary user

A single person tracking personal spending from a phone, with particular interest in understanding spending at item level:

- groceries and dairy;
- alcohol;
- medicine and health;
- games;
- software and subscriptions;
- gym and fitness;
- merchants and monthly trends.

## Main workflows

### Manual transaction

The user opens the app, adds an expense with amount, date, merchant, account, category, tags, and note, then sees dashboard totals update.

### Receipt text parsing

The user pastes raw receipt text, such as text copied from an OCR app. The app parses merchant, date, total, line items, prices, guessed categories, tags, confidence, and warnings.

### Manual AI extraction simulator

The user pastes raw email-like or document-like receipt text, optionally adds source metadata, and runs the local simulator. The app validates the simulated extraction JSON before saving. Invalid extraction data is rejected without creating draft rows. Valid extraction creates a receipt draft only, with mismatch, unknown item, and low-confidence signals kept as review warnings or flags. The user must still review and confirm the draft before a transaction is created or Dashboard analytics change.

### Mock and future Google receipt source import

The user can select a local mock Google source in Phase 9B. In future real integrations, the user will explicitly select or search receipt-like Google source content, review candidate messages/files/documents, and choose what to import. The app will extract source text, validate the extraction shape, and save an editable receipt draft only. Dashboard analytics will change only after the user reviews and confirms the draft into a final receipt and linked transaction.

### Receipt review

The user edits the parsed receipt, adjusts item names, categories, tags, and prices, sees a mismatch warning if item totals do not match receipt total, then confirms the receipt. The confirmed receipt contributes to analytics and creates or links a transaction.

### Recurring expense

The user creates recurring expenses such as subscriptions, gym memberships, and software. The app calculates upcoming charges and monthly recurring total.

### Dashboard analytics

The user sees total monthly spend, spend by category, spend by merchant, top products/items, monthly trend, recurring total, recent receipts, and item search analytics.

### CSV export

The user exports transactions, confirmed receipt items, or recurring expenses from Settings as browser-downloaded CSV files. CSV export is read-only, preserves original amount/currency fields, and includes display-currency columns for reporting where useful.

### CSV transaction import

The user imports transaction rows from a local CSV file in Settings. The app parses the file in the browser, previews rows before any write, rejects malformed required fields, warns about likely duplicates, and only writes valid transactions after the user types a strong confirmation phrase.

Transaction CSV import stores new local transactions with the original imported amount/currency and keeps display-currency conversion as a derived view. Receipt items, final receipts, receipt drafts, and external integrations are not imported from transaction CSV.

### CSV recurring import

The user imports recurring expense rows from a local CSV file in Settings. The app parses the file in the browser, previews rows before any write, validates required recurring fields, warns about likely duplicates, and only writes valid recurring expenses after the user types a strong confirmation phrase.

Recurring CSV import stores new local recurring expense records with the original amount/currency. Confirmed recurring imports may update the separate recurring monthly estimate after confirmation, but they do not create transactions and do not change Dashboard monthly transaction spend. Receipt items, final receipts, receipt drafts, transactions, and external integrations are not imported from recurring CSV.

### CSV import/export safety

CSV export never writes local data. Malformed CSV files and invalid transaction or recurring rows are rejected before import writes. Duplicate-like rows are warnings, not automatic rejections. Confirmed transaction CSV imports can affect Dashboard monthly spend because they create transactions; confirmed recurring CSV imports can affect only the recurring estimate and never create transactions.

### MVP stabilization QA

Before post-MVP integrations, the local MVP must have a documented QA checklist covering the core browser workflows, data ownership flows, CSV import/export safety, display-currency behavior, and remaining known limitations. Phase 8F uses browser smoke plus automated component/domain/repository tests because native file-picker flows need human browser verification even when file parsing and write paths are covered by tests.

### Local backup, restore, and reset

The user exports a local JSON backup from Settings. The user can import a previously exported FinAiTr backup, review a restore summary, type a strong confirmation phrase, and replace local app data only after validation passes. The user can also reset local app data after typing a strong confirmation phrase. Reset clears app-owned IndexedDB data on this device, restores baseline seed data, and refreshes the app views.

## Success criteria

The first MVP is successful when:

- manual transactions can be created, edited, deleted, and filtered;
- pasted receipt text can produce editable receipt drafts;
- mock AI extraction can produce schema-validated editable receipt drafts without changing Dashboard totals before confirmation;
- confirmed receipts produce item-level analytics;
- recurring expenses can be managed and included in the dashboard;
- dashboard analytics update from local app data;
- local JSON backup export works without a backend;
- local CSV export works without a backend;
- local transaction CSV import previews rows, rejects invalid data, and requires confirmation;
- local recurring CSV import previews rows, rejects invalid data, warns about duplicates, and requires confirmation;
- local JSON backup restore rejects invalid files and requires confirmation;
- local data reset requires confirmation and restores baseline data;
- MVP QA is documented before post-MVP integrations;
- future Gmail/Drive/Docs integration planning is documented before any real Google implementation;
- local data is not sent to external services;
- validation commands pass.
