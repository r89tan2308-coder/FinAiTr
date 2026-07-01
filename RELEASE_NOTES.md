# FinAiTr MVP v0.1.0 Release Notes

Date: 2026-07-01
Status: release-candidate documentation checkpoint

FinAiTr v0.1.0 is a local-first PWA MVP for personal finance tracking with item-level receipt analysis. It is ready for local production preview and a manual release browser pass, but it is not deployed by this repository state.

## Current Features

- Manual transaction create, edit, delete, filtering, sorting, and Dashboard refresh.
- Deterministic pasted receipt text parsing with confidence, warnings, categories, tags, and review signals.
- Editable receipt drafts, review, mark reviewed, and explicit confirmation.
- Confirmed receipt promotion creates one final receipt, confirmed receipt items, and one linked transaction.
- Dashboard analytics for monthly spend, category spend, merchant spend, transaction-only trend, confirmed receipt item analytics, item search, and recurring estimate.
- Recurring expense create, edit, delete, active/inactive state, upcoming list, and display-currency monthly estimate.
- Manual display currency and local FX settings for USD, RUB, EUR, and GBP.
- Local JSON backup export, validated JSON restore, and strong-confirmation reset.
- Read-only CSV exports for transactions, confirmed receipt items, and recurring expenses.
- Local transaction CSV import and recurring expense CSV import with preview, validation, duplicate warnings, and strong confirmation.
- Local/mock receipt source paths for manual paste, manual AI simulator, Gmail-like paste/file intake, Drive/Docs-like selected files, and mock Google samples.
- Disabled/no-op Google readiness and backend OAuth skeletons for future planning only.
- PWA metadata and manifest for install prompts on supported browsers and secure origins.

## Safety Notes

- App data is stored in the browser IndexedDB database for the current origin. It is not synced to a server.
- Export a JSON backup before reset, browser storage cleanup, profile changes, moving between dev/preview/deployed origins, or trying a new deployment URL.
- JSON backup is the portable restore format. CSV exports are reporting files, not full backups.
- Receipt source imports create editable drafts only. Dashboard totals change only after review, mark reviewed, and explicit confirmation.
- Recurring expenses are planning records. They do not create transactions.
- Manual FX settings are display-only. Original amounts and currencies are preserved.
- No real bank, Gmail, Google Drive, Google Docs, OCR, AI API, backend sync, crypto, brokerage, payment, token storage, or provider credential storage is included.
- No service worker or offline asset cache is registered. Local-first data storage does not mean the app shell is guaranteed to load offline.

## Deployment Decision

Recommended v0.1 decision: keep the MVP local-only or deploy only as a static preview after completing the manual release checklist.

Local-only usage is safest while validating personal finance workflows. Run `npm run dev` for development or `npm run build` plus `npm run preview -- --host 127.0.0.1 --port 4173` for production-asset preview. Local-only use avoids exposing the app bundle on a public URL and keeps all finance data inside the current browser origin.

Static hosting is acceptable for a demo or private release if the host serves only the generated `dist/` files over HTTPS, falls back unknown routes to `index.html`, and does not inject secrets. Static hosting still leaves all user finance data in browser IndexedDB on that hosted origin. A compromised host or changed static bundle could affect future local data access, so users should keep JSON backups before using a hosted build.

Do not deploy from this checkpoint unless a deployment target is explicitly selected, reviewed, and approved.

## Static Hosting Requirements

- Run the full validation and production preview checks before publishing `dist/`.
- Serve the built `dist/` directory as static files.
- Use HTTPS for deployed origins so browser PWA install behavior can work reliably.
- Serve `index.html` for unknown SPA paths.
- If hosting under a subpath, configure Vite `base`, rebuild, and repeat production preview checks.
- Do not add API keys, OAuth secrets, provider tokens, analytics snippets, or backend credentials to the static bundle.
- Do not upload user JSON backups, CSV files, receipt text, or browser IndexedDB contents to the host.
- Tell users that dev, preview, and deployed URLs are separate origins with separate IndexedDB data.

## Pre-Release Checklist

- [ ] `git status --short --branch` is clean and synced with `origin/master`.
- [ ] `git diff --check` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test -- --run` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] Production preview serves `dist/`, root page returns HTTP 200, manifest returns HTTP 200, and a built JS asset returns HTTP 200.
- [ ] Mobile viewport smoke covers Dashboard, Transactions, Receipts, Recurring, Categories, and Settings.
- [ ] JSON backup, reset, and restore smoke passes in a normal browser.
- [ ] CSV export smoke covers transactions, confirmed receipt items, and recurring expenses.
- [ ] CSV import smoke covers transaction and recurring import preview, warnings/errors, and strong confirmation.
- [ ] Settings shows local-first storage, manual FX, disabled Google, and PWA/installability limits.
- [ ] Release notes and QA checklist match the commit being tagged.

## GitHub Release And Tag Notes

Suggested release tag after validation and manual smoke:

```powershell
git tag -a v0.1.0 -m "FinAiTr MVP v0.1.0"
git push origin v0.1.0
```

Suggested GitHub release title: `FinAiTr MVP v0.1.0`.

Use these release notes as the GitHub release body, then attach no secrets and no user data. If a static demo URL is available, include it only after confirming the hosted build was produced from the tagged commit and passed the pre-release checklist.

## Known Limitations

- Native browser file-picker workflows still need a human browser pass before release/demo.
- Receipt parsing and the manual AI simulator are local heuristic MVP tools, not production OCR or real AI extraction.
- There is no backend, account login, multi-device sync, real provider access, or cloud backup.
- There is no service worker/offline app-shell cache.
- Browser storage cleanup, profile reset, origin changes, or browser privacy tools can remove local IndexedDB data unless the user exported a JSON backup.
- Git may print CRLF normalization warnings on this Windows working tree.
