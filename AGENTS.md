# AGENTS.md

## Project
This is a mobile-first PWA personal finance tracker focused on item-level receipt analysis.

## Main MVP scope
Build the MVP in phases:
1. App skeleton
2. Local data model
3. Manual transactions
4. Receipt text parsing
5. Receipt review
6. Analytics dashboard
7. Recurring expenses
8. CSV import/export

## Hard non-goals for MVP
- Do not add real bank API integration.
- Do not store bank credentials.
- Do not add real Google Drive integration yet.
- Do not add real OCR API keys yet.
- Do not add crypto exchange or brokerage integrations.
- Do not add payment execution.
- Do not expand scope without updating PLAN.md and DECISIONS.md.

## Working rules
- Work one phase at a time.
- Before coding, read PLAN.md, PROGRESS.md, ARCHITECTURE.md, and DECISIONS.md.
- After each phase, update PROGRESS.md.
- If a validation command fails, fix it before moving on.
- Prefer small, reviewable changes.
- Keep data local-first for MVP.
- Use mock providers behind interfaces for OCR, AI parsing, bank sync, Google Drive, crypto, and brokerage data.

## Validation
Run the available commands after changes:
- install command if needed
- typecheck if available
- lint if available
- test if available
- build

Document exact commands and results in PROGRESS.md.