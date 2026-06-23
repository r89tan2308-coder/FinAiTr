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

Local data ownership is part of the MVP. The user can export app-owned local data to a versioned JSON backup, restore from a previously exported FinAiTr backup with validation and strong confirmation, export read-only CSV files for transactions, confirmed receipt items, and recurring expenses, and reset this device's local app data back to the baseline seed state with strong confirmation.

## Current analytics vs future AI ingestion

Current Dashboard analytics are deterministic local app views. They are derived from:

- local manual transactions, including transaction-only monthly spend and income trends;
- confirmed final receipts;
- confirmed final receipt items;
- local recurring expense records;
- manual display-currency settings.

AI receipt ingestion is an intake layer, not a Dashboard analytics source by itself. Phase 8A includes a local-only manual simulator for email-like and document-like receipt text. Its job is to receive receipt text, extract a structured receipt draft through a mock provider, and send that draft through the existing human review and confirm flow.

Future receipt text sources are:

- manual paste, already supported by the MVP parser UI;
- Gmail messages that contain receipt text;
- Google Drive files that contain receipt text;
- Google Docs documents that contain receipt text.

Current mock AI extraction and future real AI extraction must create receipt drafts only. They must not create transactions, confirm receipts, update Dashboard totals, or skip human review. Dashboard impact still happens only after the user reviews a draft and explicitly confirms it into one final receipt plus one linked transaction.

Monthly trend analytics are deterministic Dashboard views. Trend spend is derived from transactions only, income is shown separately when category metadata marks transactions as income, recurring expenses remain a separate estimate, and confirmed receipt items remain item-level detail rather than extra spending.

## Non-goals

The first MVP must not include:

- real bank API integration;
- stored bank credentials;
- real Google Drive integration;
- real OCR API keys or provider calls;
- crypto exchange integration;
- brokerage or investment account integration;
- payment execution;
- multi-user auth;
- background server jobs;
- financial advice or tax advice automation.

Future integrations may be planned, but not implemented, until the local-first MVP is stable.

Phase 7C planning may define provider contracts, JSON schema, and prompt templates for future AI receipt extraction. Phase 8A may use those contracts through a local manual simulator. Neither phase may add real Gmail, Google Drive, Google Docs, OAuth, backend jobs, scheduled sync, OCR APIs, or AI API calls.

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

The user pastes raw email-like or document-like receipt text, optionally adds source metadata, and runs the local simulator. The app creates a receipt draft only. The user must still review and confirm the draft before a transaction is created or Dashboard analytics change.

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

Transaction CSV import stores new local transactions with the original imported amount/currency and keeps display-currency conversion as a derived view. Receipt items, final receipts, receipt drafts, recurring expenses, and external integrations are not imported from CSV in this phase.

### Local backup, restore, and reset

The user exports a local JSON backup from Settings. The user can import a previously exported FinAiTr backup, review a restore summary, type a strong confirmation phrase, and replace local app data only after validation passes. The user can also reset local app data after typing a strong confirmation phrase. Reset clears app-owned IndexedDB data on this device, restores baseline seed data, and refreshes the app views.

## Success criteria

The first MVP is successful when:

- manual transactions can be created, edited, deleted, and filtered;
- pasted receipt text can produce editable receipt drafts;
- mock AI extraction can produce editable receipt drafts without changing Dashboard totals before confirmation;
- confirmed receipts produce item-level analytics;
- recurring expenses can be managed and included in the dashboard;
- dashboard analytics update from local app data;
- local JSON backup export works without a backend;
- local CSV export works without a backend;
- local transaction CSV import previews rows, rejects invalid data, and requires confirmation;
- local JSON backup restore rejects invalid files and requires confirmation;
- local data reset requires confirmation and restores baseline data;
- local data is not sent to external services;
- validation commands pass.
