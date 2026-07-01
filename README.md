# FinAiTr

FinAiTr is a mobile-first local PWA personal finance tracker focused on item-level receipt analysis.

The current MVP is local-first. It supports manual transactions, receipt text parsing, editable receipt drafts, receipt confirmation, item analytics, recurring expenses, display-currency settings, local JSON backup/restore/reset, and local CSV import/export flows. It does not include real bank, Gmail, Google Drive, Google Docs, OCR, AI API, backend sync, crypto, brokerage, or payment integrations.

## Requirements

- Node.js and npm.
- A modern browser with IndexedDB support for local persistence.

## Install

```powershell
npm install
```

## Local Development

```powershell
npm run dev
```

Vite serves the app on `http://127.0.0.1:5173/` unless that port is already in use.

## Production Build

```powershell
npm run build
```

The production build is written to `dist/`.

To verify the built assets locally:

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. This serves the files from `dist/`, not the Vite dev source pipeline.

More production preview and static-hosting notes are in [PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md).

MVP v0.1 release notes, deployment decision notes, known limitations, and tag guidance are in [RELEASE_NOTES.md](./RELEASE_NOTES.md).

## Validation

Run the project validation commands after changes:

```powershell
git diff --check
npm run typecheck
npm run lint
npm run test -- --run
npm run build
npm audit
```

`npm run test -- --run` may print an npm warning about `--run`; Vitest still runs through the configured `test` script.

## MVP Release Checklist

Before a release checkpoint or demo:

- Review [RELEASE_NOTES.md](./RELEASE_NOTES.md) and confirm the notes match the commit being released.
- Build and preview production assets from `dist/`, not only the Vite dev server.
- Run typecheck, lint, tests, build, and audit.
- Verify Dashboard, Transactions, Receipts, Recurring, Categories, and Settings at a mobile viewport.
- Create one manual transaction and confirm Dashboard/Transactions update after save.
- Create one receipt draft from a local/mock source, review it, mark reviewed, confirm it, and verify Dashboard/item analytics update only after confirmation.
- Create one recurring expense and verify it changes only the recurring estimate, not Transactions.
- Export JSON, reset local data, restore the JSON backup, then recheck Dashboard, Transactions, Receipts, and Recurring.
- Export CSV files and verify they are read-only reporting files.
- Import transaction and recurring CSV files through preview and strong confirmation.
- Check Settings copy for local-first storage, JSON backup/restore, CSV import/export, reset, manual FX rates, and disabled Google access.
- Check installability expectations: manifest metadata is present, HTTPS is required for real deployment install prompts, and no offline app-shell guarantee exists yet.
- If creating a GitHub release, tag the exact validated commit, for example `v0.1.0`.

## Local Data And Privacy

- App data is stored in the browser IndexedDB database `finaitr-local`.
- JSON backup export, JSON restore, CSV export, and CSV import use browser-local files.
- Export a JSON backup before reset, browser storage cleanup, profile changes, or moving data between dev, preview, and deployed origins.
- Dev and production preview URLs are different browser origins when they use different ports, so each origin has separate IndexedDB data.
- The current MVP does not add a service worker or offline asset cache. The app is local-first for finance data, but static assets are not guaranteed to load offline until an explicit offline-caching phase is implemented.
- No secrets, tokens, bank credentials, OAuth grants, provider sessions, or real Google data are stored by the current MVP.

## Static Hosting Notes

Deployment decision for v0.1: local-only usage is safest until the manual release checklist passes. Static hosting is acceptable for a demo or private release only after production preview and manual smoke checks pass.

FinAiTr can be hosted as a static SPA by serving the `dist/` directory. Configure the host to fall back unknown app routes to `index.html`. Use HTTPS for a real deployment so PWA install behavior works reliably.

Do not add API keys or secrets to the static bundle. The current app has no backend and no real external provider calls.

Static hosting does not move user data to a server by itself, but it creates a separate browser origin with separate IndexedDB data. A changed or compromised hosted bundle could affect local data on that origin, so users should keep JSON backups before relying on a hosted build.
