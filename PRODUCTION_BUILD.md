# Production Build Guide

Phase 10A verifies that FinAiTr can be built and served from Vite production assets. Phase 10B adds first-use and release-checklist polish. Phase 10C adds MVP v0.1 release notes and deployment-readiness documentation without changing product behavior.

## Build

```powershell
npm run build
```

Expected result:

- TypeScript project build succeeds.
- Vite writes static assets into `dist/`.
- `dist/index.html` references built asset files.
- `dist/manifest.webmanifest`, `dist/favicon.svg`, and `dist/app-icon.svg` are present.

## Local Production Preview

```powershell
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`.

This command serves `dist/` and is the local check for production assets. It is intentionally separate from `npm run dev`, which serves source files through Vite's development pipeline.

## MVP v0.1 Release Notes

Release notes and tag guidance live in [RELEASE_NOTES.md](./RELEASE_NOTES.md). Review them before creating a tag or GitHub release and keep them aligned with the exact commit being released.

## Deployment Decision

Recommended v0.1 decision: use the app locally until the manual release checklist passes. Static hosting can be used for a demo or private release only when the generated `dist/` output has passed validation, production preview, and browser smoke checks.

Local-only usage keeps the app bundle off a public URL and stores all finance data in the current browser origin. Static hosting serves the app shell from an HTTPS origin, but user data still stays in that hosted origin's IndexedDB. Users should export a JSON backup before reset, browser cleanup, profile changes, or moving between local dev, preview, and hosted origins.

## Preview Smoke Checks

- The root page returns HTTP 200.
- `manifest.webmanifest` returns HTTP 200 and contains the FinAiTr app metadata.
- A built JavaScript asset under `dist/assets/` returns HTTP 200.
- Dashboard renders from local data or seed fallback.
- Settings shows storage mode and PWA status.
- Manual transaction, receipt, recurring, JSON, CSV, and FX semantics remain unchanged from the validated MVP.

## PWA Packaging State

Current PWA readiness:

- `index.html` includes viewport, theme color, description, favicon, and manifest links.
- `public/manifest.webmanifest` defines app name, short name, description, standalone display, start URL, scope, theme/background colors, categories, and SVG icon placeholder.
- `public/app-icon.svg` and `public/favicon.svg` are placeholder SVG assets.

Current limitation:

- No service worker or offline asset cache is registered. Local-first means finance records stay in browser IndexedDB on the current origin. It does not mean the app shell is guaranteed to load while offline.

## Installability QA Notes

- Browser install prompts depend on browser support, manifest metadata, and a secure deployed origin such as HTTPS or localhost.
- Verify the app loads from production preview, then inspect Settings for `Manifest ready` rather than treating the dev server as production proof.
- Do not describe the MVP as offline-ready until a later service-worker phase implements and validates asset caching.
- Re-run the manual release checklist after moving from dev origin to preview or a deployed HTTPS origin because IndexedDB data is origin-scoped.

## Static Hosting

Serve the `dist/` directory as static files.

Recommended host behavior:

- Use HTTPS for deployed environments.
- Serve `index.html` for unknown SPA paths.
- Keep generated JSON/CSV files as browser downloads only; do not upload user finance data to the host.
- Do not inject API keys, OAuth client secrets, provider tokens, or backend credentials into the static bundle.
- If hosting under a subpath instead of `/`, configure Vite `base` before building and re-run the production preview checks.

Static hosting risks for a local-first finance PWA:

- Browser IndexedDB data is tied to the exact deployed origin and can be lost through browser cleanup or profile resets.
- A changed or compromised static bundle on the same origin could affect future reads/writes of local finance data.
- The MVP has no server backup, auth, sync, or provider revocation path.
- No service worker is registered, so a hosted URL still needs the static host to load the app shell.
- JSON backups are the recovery path; CSV exports are reporting files, not full backups.

## Browser Data Notes

IndexedDB is origin-scoped. Data created at `http://127.0.0.1:5173/` is separate from data at `http://127.0.0.1:4173/` and from any deployed HTTPS origin.

Use Settings JSON backup/restore when moving local data between origins or browser profiles. Use Settings reset to clear app-owned local records for the current origin.
