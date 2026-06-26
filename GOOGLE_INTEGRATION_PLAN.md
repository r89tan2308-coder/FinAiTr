# Google Integration Plan

Date: 2026-06-24
Status: Phase 9E privacy, consent, and disclosure planning. No Google OAuth flow, API calls, backend server, scheduled sync, token storage, real AI provider call, or production Google data sync is implemented.

## Purpose

This document defines the future Gmail, Google Drive, and Google Docs receipt-source architecture before implementation starts. The goal is to keep external receipt discovery behind explicit provider boundaries, preserve the local-first MVP accounting rules, and avoid collecting more Google user data than the product needs.

## Official References

- Gmail API scopes: https://developers.google.com/workspace/gmail/api/auth/scopes
- Drive API scopes and API-specific authorization: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Docs API authorization: https://developers.google.com/workspace/docs/api/auth
- Google Workspace OAuth consent configuration: https://developers.google.com/workspace/guides/configure-oauth-consent
- Google Workspace authentication overview: https://developers.google.com/workspace/guides/auth-overview
- Google API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy
- Google OAuth 2.0 overview: https://developers.google.com/identity/protocols/oauth2

## Non-goals

- Do not implement OAuth in Phase 9E.
- Do not add Google packages, API clients, backend services, or secrets.
- Environment variables are placeholders only and must not contain committed secrets.
- Do not add real Gmail, Drive, or Docs import.
- Do not add scheduled sync, push notifications, Pub/Sub, or background jobs.
- Do not add real OCR or AI API calls.
- Do not let external source data create transactions, final receipts, Dashboard totals, recurring expenses, or FX changes directly.

## Provider Architecture

Future Google sources must use the existing `ReceiptTextSourceProvider` boundary:

```text
Google auth/session
  -> Gmail/Drive/Docs receipt text source provider
  -> listCandidates()
  -> user selects candidates
  -> getCandidateText(candidateId)
  -> receipt extraction validation
  -> save receipt draft
  -> human review
  -> explicit confirm receipt
  -> final receipt + one linked transaction
  -> Dashboard updates from the transaction and confirmed receipt items
```

Provider responsibilities:

- Return receipt-like text candidates and source metadata only.
- Preserve raw source evidence for review.
- Avoid accounting interpretation beyond candidate metadata.
- Avoid writes to transactions, final receipts, recurring expenses, FX settings, or Dashboard state.
- Use the existing receipt extraction validation before any draft write.

Planned providers:

- `GmailReceiptSourceProvider`: finds user-approved receipt-like messages and returns selected message body or attachment text.
- `GoogleDriveReceiptSourceProvider`: imports user-selected files that contain receipt text.
- `GoogleDocsReceiptSourceProvider`: imports user-selected Docs text.

Source metadata should be attached to receipt drafts and final receipts, not stored in a separate token or provider table. Recommended metadata fields:

- provider kind: `gmail`, `google_drive`, or `google_docs`;
- Google account subject or stable account hash;
- source id: message id, file id, document id, or attachment id;
- revision marker: Gmail history id, Drive modified time, Docs revision marker when available;
- title or subject;
- sender or owner when available;
- received, modified, or fetched timestamp;
- source URL when safe to expose to the user;
- content fingerprint and duplicate key.

Tokens, client secrets, refresh tokens, and OAuth grants must never be stored in receipt source metadata, JSON backup, CSV export, local logs, or IndexedDB draft records.

## OAuth and Backend Decision

Phase 9D decision: production Google integration requires a backend before any real OAuth callback handling, authorization response exchange, long-lived provider access, scheduled sync, revocation, or provider-data deletion is enabled.

Backend is required for:

- OAuth callback handling that preserves state outside the PWA UI page.
- Authorization response exchange for any production Google provider connection.
- Long-lived provider access and secure refresh-token handling.
- Gmail body import, Gmail metadata discovery, and any restricted Gmail scope.
- Broad Drive or Docs discovery using restricted Drive scopes.
- Scheduled sync, provider cursors, rate-limit backoff, retries, and visible sync status.
- Provider disconnect, grant revocation, server-side credential deletion, cached candidate deletion, diagnostics deletion, and user data deletion workflows.

Frontend-only exception:

- A future manual Drive/Docs selected-file import may remain frontend-only only if it is user-initiated, uses the narrowest selected-file scope such as `drive.file`, does not store a long-lived credential, does not schedule background sync, does not broad-scan Drive, and writes only validated local receipt drafts.

Future backend endpoint names are defined but disabled in Phase 9D:

| Endpoint name | Future path | Purpose | Phase 9D behavior |
| --- | --- | --- | --- |
| `oauthStart` | `/google/oauth/start` | Start provider consent | Disabled/no-op |
| `oauthCallback` | `/google/oauth/callback` | Handle callback and exchange authorization response | Disabled/no-op |
| `providerStatus` | `/google/oauth/status` | Report provider connection state | Disabled/no-op |
| `disconnect` | `/google/oauth/disconnect` | Revoke grant and delete provider state | Disabled/no-op |
| `listSourceCandidates` | `/google/sources/:sourceKind/candidates` | List Gmail/Drive/Docs receipt-like candidates | Disabled/no-op |
| `getSourceCandidateText` | `/google/sources/:sourceKind/candidates/:candidateId/text` | Fetch selected candidate text | Disabled/no-op |
| `scheduledSyncStatus` | `/google/sync/status` | Report background sync state | Disabled/no-op |

Token and credential rules:

- Do not store OAuth client secrets, authorization responses, access tokens, refresh tokens, provider sessions, sync cursors, or provider cookies in the PWA, localStorage, IndexedDB, JSON backups, CSV files, source metadata, tests, logs, or committed config.
- `.env.example` may contain placeholder names only. Real local `.env` files must remain ignored by Git.
- A future backend must encrypt provider credential state at rest, restrict access to the minimum server components, and delete credential state on disconnect or account deletion.
- Imported receipt drafts, confirmed receipts, receipt items, and linked transactions are user finance records and should remain local by default unless a separate destructive deletion flow is added.

Logging restrictions:

- Do not log raw Gmail bodies, Drive or Docs text, attachment content, receipt text, OAuth credentials, authorization responses, client secrets, source URLs containing secrets, or full provider ids.
- Future diagnostics may store only provider kind, action, status, counts, timestamp, hashed source ids, and error class.
- Future provider diagnostics must be deletable with provider disconnect and local data reset.
## Minimal Scopes

| Future capability | Candidate scope | Sensitivity | Phase 9A decision |
| --- | --- | --- | --- |
| User-selected Drive/Docs file import | `https://www.googleapis.com/auth/drive.file` | Non-sensitive per Google Drive docs | Preferred first implementation path. Use only for files the user selects or shares with the app. |
| Direct Docs read after selected-file grant | `https://www.googleapis.com/auth/drive.file` where sufficient, otherwise `https://www.googleapis.com/auth/documents.readonly` | `drive.file` non-sensitive; `documents.readonly` sensitive | Prefer `drive.file`. Use Docs readonly only if a selected Docs flow cannot work without it. |
| Broad Drive receipt discovery | `https://www.googleapis.com/auth/drive.metadata.readonly` or `https://www.googleapis.com/auth/drive.readonly` | Restricted | Defer. Requires stronger privacy review, consent language, and likely verification work. |
| Gmail message metadata discovery | `https://www.googleapis.com/auth/gmail.metadata` | Restricted | Defer. Metadata-only does not provide receipt body text and still carries restricted-scope obligations. |
| Gmail receipt body import | `https://www.googleapis.com/auth/gmail.readonly` | Restricted | Defer until backend, consent, deletion, logging, and verification plan are ready. |
| Gmail labels only | `https://www.googleapis.com/auth/gmail.labels` | Non-sensitive | Not needed for receipt import. Consider only if a future feature manages labels. |

The app should request scopes incrementally and only at the moment the user starts a matching import flow. The OAuth consent screen must clearly explain what data is read, why it is needed, and that imported text becomes an editable receipt draft rather than a confirmed transaction.

## Phase 9C Readiness Skeleton

Phase 9C adds a disabled-by-default readiness boundary only. It defines the names of future runtime placeholders, a local status model, disabled source-provider placeholders, and a Settings read-only status. It still does not build an OAuth flow, redirect route, backend, token store, Google API client, or real Google source adapter.

Environment placeholders:

| Name | Purpose | Phase 9D default |
| --- | --- | --- |
| `VITE_GOOGLE_INTEGRATION_ENABLED` | Global future Google integration feature flag | `false` |
| `VITE_GOOGLE_DRIVE_FILE_IMPORT_ENABLED` | Future selected-file Drive/Docs import flag | `false` |
| `VITE_GOOGLE_GMAIL_IMPORT_ENABLED` | Future Gmail import flag | `false` |
| `VITE_GOOGLE_CLIENT_ID` | Future OAuth client id placeholder | empty |
| `VITE_GOOGLE_REDIRECT_URI` | Future OAuth redirect URI placeholder | empty |
| `VITE_GOOGLE_BACKEND_AUTH_ENABLED` | Future backend OAuth/auth boundary flag | `false` |
| `VITE_GOOGLE_BACKEND_SYNC_ENABLED` | Future scheduled sync boundary flag | `false` |
| `VITE_GOOGLE_BACKEND_REVOCATION_ENABLED` | Future disconnect/revocation boundary flag | `false` |
| `VITE_GOOGLE_BACKEND_BASE_URL` | Future backend boundary placeholder if backend auth is chosen | empty |

Implementation files:

- `src/google-integration/googleIntegrationReadiness.ts`
- `src/google-integration/googleIntegrationReadiness.test.ts`
- `.env.example`

Readiness rules:

- The runtime status is `Google integration planned / not connected`.
- `realProviderCallsAllowed` is always `false` in Phase 9C.
- Disabled Gmail, Google Drive, and Google Docs placeholder providers return no candidates and throw a disabled-provider error for candidate text requests.
- Placeholder providers do not call `fetch`, Google OAuth endpoints, Gmail APIs, Drive APIs, Docs APIs, or a backend.
- Config/status objects expose only whether placeholders are configured, not the configured values.
- The Settings UI shows status only and has no connect, disconnect, import, sync, or OAuth action.

The official Google docs reviewed for this phase reinforce that apps should request only needed permissions, request access in context where possible, use exact configured redirect URIs, prefer narrow Drive scopes such as `drive.file` for selected-file access, and treat Gmail read scopes and broad Drive scopes as restricted/security-review work. Phase 9C records these constraints but leaves implementation to later phases.


## Phase 9D Disabled Backend Skeleton

Phase 9D adds only a disabled TypeScript backend boundary. It does not add a backend server, OAuth redirect route, Google client package, token store, or provider network call.

Implementation files:

- `src/google-integration/googleBackendReadiness.ts`
- `src/google-integration/googleBackendReadiness.test.ts`
- updated `.env.example`
- updated `src/google-integration/googleIntegrationReadiness.ts`
- updated `src/vite-env.d.ts`

Runtime rules:

- `endpointCallsAllowed` is always `false`.
- `networkCallsAllowed` is always `false`.
- `credentialPersistenceAllowed` is always `false`.
- Disabled client methods either return disabled status/empty lists or throw a disabled-backend error before any network call.
- Backend feature flags can be recognized as requested readiness placeholders, but they do not enable OAuth, backend calls, provider reads, scheduled sync, revocation calls, or credential persistence.
- Config and readiness objects expose placeholder presence booleans only; they do not expose configured client id, redirect URI, or backend URL values.

The official Google docs reviewed for Phase 9D reinforce that web-server OAuth is designed for applications that can securely store confidential information and maintain state, redirect URIs must exactly match configured authorized URIs, apps should request only needed scopes in context, `drive.file` is the preferred narrow selected-file Drive/Docs scope, Gmail read scopes are restricted, broad Drive scopes are restricted, and restricted-scope data stored or transmitted on servers can require security assessment.


## Phase 9E Privacy, Consent, and User-Facing Disclosures

Phase 9E is documentation and copy planning only. It does not add a Google connection action, OAuth route, backend server, Google API client, token storage, scheduled sync, provider revocation call, or real AI extraction provider.

Privacy principles for future Google integrations:

- Explain who is requesting access, what Google data is requested, why it is requested, where it is processed, what is stored, what is not stored, how to disconnect, and how deletion works before asking for consent.
- Request the minimum scope for the current user action and request it in context. Prefer selected-file `drive.file` before broader Drive or Docs scopes.
- Keep Gmail body import, Gmail metadata discovery, broad Drive/Docs discovery, scheduled sync, and long-lived provider access backend-gated until Phase 9D backend requirements are implemented.
- Use Google data only for the visible receipt import feature. Do not sell Google data, use it for ads, use it for creditworthiness/lending, or allow human review without explicit user agreement or a narrow security/legal need.
- Keep Google source ingestion draft-only. Imported source text can create receipt drafts and draft items only after extraction validation. Dashboard, Transactions, final Receipts, receipt items, recurring expenses, and FX settings change only after the user reviews and explicitly confirms a draft.

Future data access disclosure:

| Source | Future data that may be accessed | First allowed path | Disclosure requirement |
| --- | --- | --- | --- |
| Gmail | Selected message metadata, sender, subject, received date, message body text, and receipt-like attachment text when explicitly selected or matched by user-provided filters | Deferred backend-gated path using restricted Gmail scopes | Explain that Gmail read scopes can expose email content/settings; fetch body text only for selected candidates; no mailbox-wide silent scan. |
| Google Drive | User-selected file id, file name/title, owner where available, modified time, MIME type, safe source URL, and text extracted from the selected file | Preferred first real path with `drive.file` | Explain that only files the user selects or shares with the app are accessed in the first implementation. |
| Google Docs | User-selected document id/title, owner where available, modified time, safe source URL, and document text | Prefer selected Drive file access with `drive.file`; Docs readonly only if selected-file flow cannot work without it | Explain whether Docs text is read through selected-file Drive access or a Docs-specific scope. |

Draft Settings Google connection copy:

| UI state | Draft copy |
| --- | --- |
| Disabled/readiness-only | Google receipt import is planned but not connected. No Google data is read, no OAuth flow is active, and provider calls are blocked. |
| Before connect | Connect Google only when you want to import receipt-like messages or files. FinAiTr will ask only for the access needed for the import path you choose. Imported Google text becomes an editable receipt draft, not a confirmed transaction. |
| Selected Drive/Docs import | Choose the specific Drive file or Docs document to import. FinAiTr will use the selected content to prepare a receipt draft for review. It will not scan all Drive files in this mode. |
| Gmail import | Choose Gmail search filters or selected messages before import. FinAiTr will fetch receipt-like message text only for selected candidates. Gmail import requires backend security and restricted-scope review before release. |
| AI extraction disclosure | If a future AI extraction provider is enabled, selected receipt text may be sent to that provider to structure a receipt draft. This must be disclosed before use and must stay disabled unless the user explicitly enables that future provider. |
| Draft review reminder | Review every imported draft before confirming. Dashboard totals change only after you confirm a reviewed receipt into one local transaction. |
| Connected status | Google is connected for the listed import paths only. You can disconnect to revoke provider access and delete provider credential state and cached provider diagnostics. |
| Disconnect | Disconnect Google? This will revoke provider access where possible and delete provider credential state, cached candidates, sync cursors, and diagnostics. Local receipt drafts, confirmed receipts, transactions, and analytics remain unless you delete them separately. |
| Error or revoked grant | Google access is unavailable or was revoked. No new Google data will be imported until you reconnect and consent again. Existing local finance records remain unchanged. |

Data minimization requirements:

- Do not request Gmail, Drive, Docs, or AI extraction access until the user starts the matching import flow.
- Do not request broad Drive or Gmail scopes for selected-file import.
- Do not fetch message bodies or document/file text until the user selects candidates or provides explicit filters for that import.
- Do not store raw Google source text outside receipt draft/final receipt evidence fields needed for user review.
- Do not include tokens, provider sessions, sync cursors, or credentials in JSON backups, CSV exports, source metadata, logs, tests, or committed config.
- Keep duplicate detection local and warning-based; do not silently overwrite existing drafts, confirmed receipts, linked transactions, or analytics.

Token, backend, and revocation expectations:

- The PWA must not store OAuth client secrets, access tokens, refresh tokens, provider sessions, grants, provider cookies, or sync cursors.
- Production Gmail import, broad Drive/Docs access, scheduled sync, authorization response exchange, long-lived provider access, revocation, and provider-data deletion require the future backend described in Phase 9D.
- A future backend must encrypt provider credential state at rest, restrict operational access, rotate/revoke provider access when needed, and delete provider credential state, cached candidates, sync cursors, and diagnostics on disconnect or account deletion.
- Provider disconnect must not delete user-created local finance records by default. A separate destructive local-data deletion flow must be required for imported drafts, confirmed receipts, transactions, and analytics.

Logging restrictions:

- Do not log raw Gmail bodies, Drive or Docs text, attachments, receipt text, AI prompts or provider responses containing receipt text, OAuth credentials, authorization responses, client secrets, source URLs containing secrets, or full provider ids.
- Future diagnostics may store only provider kind, action, status, counts, timestamp, hashed source ids, and error class.
- Diagnostics must be deletable with provider disconnect and local data reset.

Future AI provider disclosure:

- Real AI extraction remains disabled until a later explicit phase.
- If enabled later, the UI must disclose the provider name, what receipt/source text is sent, why it is sent, whether it may leave the device, what is stored locally, and whether the provider retains data.
- AI extraction output must remain draft-only and pass runtime validation before saving a receipt draft.
- AI extraction must not create transactions, final receipts, Dashboard totals, recurring expenses, FX changes, or provider sync state.

Future OAuth consent checklist:

- [ ] OAuth consent screen names the app, support contact, privacy policy, and intended receipt-import purpose accurately.
- [ ] Consent copy lists each requested scope and maps it to a visible user action.
- [ ] The selected implementation uses the narrowest viable scope; broad or restricted scopes have documented justification and approval.
- [ ] Gmail and broad Drive/Docs paths have backend credential handling, restricted-scope verification readiness, and security assessment review where required.
- [ ] Pre-connect Settings copy explains accessed data, draft-only behavior, AI extraction disclosure, disconnect, revocation, and deletion.
- [ ] Import UI requires user selection or explicit filters before fetching message/file/document text.
- [ ] Logs and diagnostics exclude raw Google content, receipt text, tokens, credentials, prompts, provider responses, and full provider ids.
- [ ] Disconnect revokes provider access where possible and deletes provider credential state, cached candidates, sync cursors, and diagnostics.
- [ ] Local data deletion behavior is documented separately from provider disconnect.
- [ ] Product QA proves Google source ingestion creates drafts only and Dashboard impact still requires human review and explicit confirmation.
## Receipt Discovery Rules

Discovery must be explicit and user-controlled.

Gmail rules:

- Default to user-provided search terms, date range, sender, or label filters.
- Candidate terms can include `receipt`, `invoice`, `order`, `payment`, `subscription`, `your order`, `tax invoice`, and merchant names entered by the user.
- Prefer listing candidates first, then fetching body text only after the user selects messages.
- Do not silently scan the entire mailbox.
- Do not read unrelated messages, attachments, or labels beyond the selected query and selected candidates.

Drive rules:

- Start with a Picker-style selected-file import.
- Allow only user-selected files in the first implementation.
- Candidate file types can include Google Docs, text files, PDFs, and images only after corresponding text extraction support exists.
- Do not broad-scan My Drive or shared drives in the first implementation.

Docs rules:

- Start with selected documents only.
- Import document text as receipt-source evidence.
- Do not search all Docs until a later phase explicitly accepts broader Drive/Docs scopes and verification obligations.

Unsupported or low-confidence candidates should remain candidates or drafts with warnings. They must not auto-confirm.

## Duplicate Detection

Duplicate detection should use both source identity and content fingerprints.

Source identity key:

```text
provider kind
  + Google account subject/hash
  + source id
  + attachment id when applicable
  + revision marker or modified timestamp
```

Content fingerprint:

```text
normalized merchant
  + receipt date
  + rounded total
  + currency
  + stable normalized text hash
```

Before saving a draft, check duplicates against:

- existing receipt drafts and draft items;
- confirmed final receipts and receipt items;
- source metadata already imported from the same provider;
- content fingerprints from local data.

Duplicate matches should show a warning and require a user choice. The app must not silently overwrite drafts, confirmed receipts, or linked transactions. Receipt confirmation idempotency remains the final protection against duplicate final records.

## Extraction and Draft Flow

Google sources produce raw text candidates. Extraction and validation remain separate:

```text
source candidate raw text
  -> ReceiptExtractionProvider
  -> receiptExtractionValidation
  -> ReceiptDraft + ReceiptDraftItem rows
  -> user review
  -> explicit confirmation
```

Validation must happen before `saveReceiptDraft`. Invalid extraction output must leave drafts, final receipts, transactions, recurring expenses, FX settings, and Dashboard views unchanged.

Review warnings should preserve:

- low extraction confidence;
- total/item mismatch;
- unknown category;
- unclear line;
- unsupported file type;
- partial text extraction;
- duplicate candidate warning;
- source fetch warning.

## Failure Modes

Expected failures:

- OAuth consent denied.
- OAuth grant revoked.
- Expired access token.
- Refresh token missing or invalid.
- Google session policy returning `invalid_grant` and requiring reauth.
- Scope insufficient for the requested action.
- Rate limit, quota, or `429` response.
- File or message deleted after candidate listing.
- Network offline or request timeout.
- Unsupported MIME type.
- Empty or too-large text extraction result.
- Malformed email body or attachment.
- Partial batch import.
- Duplicate candidate or duplicate content.
- User disconnects a provider during import.

Failure handling:

- Show a local, user-readable error.
- Keep failed candidates in a retryable state when practical.
- Do not mutate local data until draft save passes validation.
- Avoid logging raw email, document, file, or attachment content.
- Include provider, action, status, count, and timestamp in diagnostic events only when logs exist.

## Privacy, Logging, and User Data

Google user data use must be limited to the user-facing receipt import feature. The app must not sell Google user data, use it for ads, use it for creditworthiness, or allow humans to read it except with explicit user consent, security/legal necessity, or aggregated internal operations consistent with Google policy.

Logging rules:

- Do not log raw message bodies, document text, attachments, receipt text, tokens, client secrets, or refresh tokens.
- If diagnostics are later added, store only provider kind, action, status, counts, timestamp, hashed source ids, and error class.
- Make provider diagnostics deletable with provider disconnect or local data reset.

Local export rules:

- JSON backups may preserve receipt draft and final receipt source metadata because it is part of the user's local receipt evidence.
- JSON backups must not contain OAuth credentials, refresh tokens, client secrets, access tokens, or provider session state.
- CSV exports should include only user-facing source metadata already present on confirmed receipt/item rows, not tokens or raw Google credentials.

## Disconnect and Deletion Expectations

Future provider disconnect must:

- revoke the OAuth grant when a grant exists;
- delete local provider tokens and refresh tokens;
- delete provider cursors, sync state, cached candidate lists, and diagnostics;
- keep user-created local receipt drafts, confirmed receipts, receipt items, and transactions by default because they are local finance records;
- offer a separate destructive option to remove imported drafts or source metadata if product requirements later require it;
- preserve JSON backup and reset semantics.

Reset local data must clear app-owned local provider metadata if provider metadata exists in a later phase. A backend implementation must also define server-side account deletion and token revocation behavior before launch.

## Rate Limits and Sync Constraints

First implementation should use small manual batches. Avoid polling.

Future sync must include:

- per-user rate-limit backoff;
- small page sizes;
- resumable cursors;
- retry with jitter for transient failures;
- explicit stop on auth or scope errors;
- visible last-sync status;
- no hidden mailbox-wide scans.

Scheduled sync is a separate backend phase, not a PWA-only feature.

## Phase 9H Google OAuth/backend release gate

Phase 9H is a planning-only release gate. It does not enable OAuth, call Google APIs, add a backend server, store tokens, add dependencies, call a real AI provider, or change product runtime behavior.

Official Google documentation re-checked on 2026-06-26:

- Google OAuth 2.0 for web server applications: `https://developers.google.com/identity/protocols/oauth2/web-server`
- Sensitive scope verification: `https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification`
- Gmail API scopes: `https://developers.google.com/workspace/gmail/api/auth/scopes`
- Drive API scopes: `https://developers.google.com/workspace/drive/api/guides/api-specific-auth`
- Google API Services User Data Policy: `https://developers.google.com/terms/api-services-user-data-policy`

Current release-gate decision:

- Real Gmail API access remains blocked.
- Broad Drive/Docs access remains blocked.
- Scheduled sync remains blocked.
- Backend-backed OAuth remains blocked until the backend, consent, verification, deletion, and logging gates below are implemented and validated.
- Frontend-only work remains limited to local manual prototypes and future narrow selected-file experiments that do not store long-lived credentials.
- All Google source ingestion must remain draft-only until human review and explicit receipt confirmation.

### Hard requirements before enabling real Google integration

Every real Google provider phase must satisfy these requirements before code is enabled:

1. Product and consent requirements
   - Exact user-facing feature and import path are named before requesting scopes.
   - OAuth consent copy explains who requests access, what data is accessed, why it is accessed, how it is used, how to disconnect, and how provider data is deleted.
   - Privacy policy and support links are available and match in-app disclosures.
   - Data use is limited to visible receipt import/review features and follows Google API Services User Data Policy limited-use expectations.
   - AI extraction disclosure is shown before any selected Google source text is sent to a future real AI provider.
2. Scope requirements
   - Request the narrowest scope that can support the feature.
   - Prefer selected-file Drive/Docs access, such as `drive.file` with Google Picker or an equivalent selected-file flow, before any broad Drive scope.
   - Treat `gmail.readonly`, `gmail.metadata`, `drive`, `drive.readonly`, and broad Drive metadata scopes as higher-risk restricted-scope work.
   - Use incremental authorization: request Google access in context, only when the user starts the matching import flow.
   - Document why a narrower scope is not sufficient for every sensitive or restricted scope.
3. Backend and token requirements
   - Production OAuth callback handling, authorization-code exchange, refresh-token storage, scheduled sync, provider lifecycle, revocation, and deletion require a backend.
   - Client secrets must never be in the PWA bundle, repo, IndexedDB, localStorage, sessionStorage, JSON backups, CSV exports, logs, or source metadata.
   - Access tokens, refresh tokens, authorization codes, provider sessions, sync cursors, and provider cookies must not be stored in IndexedDB, localStorage, sessionStorage, JSON backups, CSV exports, receipt source metadata, or committed config.
   - Refresh tokens, if used, must be in secure backend storage with encryption, rotation/revocation handling, least-privilege access, and deletion on disconnect where required.
   - Backend endpoints must have CSRF/state validation, redirect URI allowlisting, per-user authorization, audit-safe structured logs, rate-limit handling, and test coverage.
4. Revocation, disconnect, and deletion requirements
   - Disconnect must revoke provider access where possible, clear backend token/session state, delete cached provider candidates and sync cursors, and show user-visible status.
   - Provider-data deletion must cover cached Gmail/Drive/Docs bodies, attachments, snippets, candidate metadata, diagnostics, sync cursors, and temporary extraction payloads.
   - Local user-created finance records remain unless the user separately deletes/reset/restores local data.
   - Deletion and disconnect behavior must be covered by tests and release QA.
5. Logging and diagnostics requirements
   - Never log raw Gmail bodies, Drive/Docs text, attachment text, receipt source text, AI prompts containing receipt text, provider responses containing receipt text, OAuth credentials, authorization responses, client secrets, source URLs containing secrets, full provider ids, tokens, refresh tokens, or sync cursors.
   - Diagnostics must use redacted counts, status codes, provider kind, short stable hashes, and user-visible error categories only.
6. Accounting and local data requirements
   - Google source text can create only receipt drafts and draft items after extraction validation passes.
   - No Google source provider can create final receipts, receipt items, transactions, recurring expenses, FX updates, JSON restore changes, CSV import changes, or Dashboard-impacting records directly.
   - Dashboard, Transactions, final Receipts, recurring expenses, FX settings, JSON backup/restore, and CSV behavior must remain unchanged until the user reviews and explicitly confirms a draft.
   - Duplicate detection must run before mutation using provider kind plus provider source id and/or content hash.

### Scope strategy

Minimum viable strategy:

- Drive/Docs selected-file or picker path first: prefer `drive.file` or another selected-file narrow scope that limits access to user-chosen files. This is the only candidate for a future frontend-light experiment, and only if it avoids long-lived credentials and broad scans.
- Gmail manual/local prototype remains local-only: Phase 9G proves metadata and draft semantics without Gmail scopes.
- Gmail real message body import is backend-gated because Gmail read scopes are restricted and can expose mailbox content and settings.
- Broad Drive or Docs discovery is backend-gated because broad file and metadata scopes create wider data access and can trigger restricted-scope obligations.
- Scheduled sync is backend-only because it requires long-lived credentials, refresh-token lifecycle, sync cursors, rate-limit handling, revocation, and deletion.

### Go/no-go criteria

Frontend-only selected-file experiments:

- Go only for explicit user-selected local/browser files or a future narrow selected-file provider path with no broad scan, no scheduled sync, no refresh token, no provider session storage, and draft-only writes.
- No-go if the feature needs mailbox access, broad Drive/Docs discovery, stored credentials, background refresh, provider cursors, or server-side data retention.

Backend-backed OAuth:

- Go only after backend endpoints, redirect URI configuration, state/CSRF checks, secure token storage, revocation, disconnect, deletion, privacy copy, support links, and tests are implemented.
- No-go if tokens or authorization codes would touch PWA storage, source metadata, logs, JSON backups, CSV exports, or committed config.

Gmail read-only source ingestion:

- Go only after restricted-scope verification readiness, backend token handling, selected-message or explicit-filter UX, body/attachment minimization, redacted logging, deletion, revocation, rate-limit handling, duplicate checks, and draft-only tests are complete.
- No-go for silent mailbox-wide scans, broad automatic import, logging message bodies, storing raw bodies outside the draft evidence path, or any Dashboard impact before review/confirm.

Drive/Docs selected-file or picker ingestion:

- Go first with narrow selected-file access, preferably `drive.file`, Google Picker or a user-equivalent selected-file flow, explicit file selection, duplicate checks, extraction validation, and draft-only writes.
- No-go for broad Drive scan, broad Docs discovery, unrestricted `drive.readonly`, or persistent provider data caches unless backend and restricted-scope gates are approved.

Scheduled sync:

- Go only after backend OAuth, refresh-token storage, per-user sync cursors, visible sync status, pause/disconnect controls, rate limits, deletion/revocation handling, failure recovery, and QA are implemented.
- No-go in the PWA-only runtime or for any sync that can create Dashboard-impacting records without human review and explicit confirmation.

### Future implementation sequence after release-gate approval

1. Phase 9I: Disabled backend OAuth architecture skeleton.
   - Completed as typed frontend-safe boundary contracts only.
   - Reuse existing disabled backend flags and keep endpoint, network, token, revocation, provider read, source sync, and scheduled sync behavior blocked.
   - Define future start, callback, status, disconnect, revoke, and source sync endpoint contracts without adding backend runtime.
2. Phase 9J: Narrow Drive/Docs picker-based selected-file provider.
   - Prefer `drive.file` and explicit user selection.
   - Fetch only selected document/file text.
   - Keep draft-only writes and duplicate checks.
3. Phase 9K: Gmail selected-message import behind backend and restricted-scope gates.
   - Use explicit selected messages or user-provided filters.
   - Fetch only receipt-like body/attachment text for selected candidates.
   - Keep raw provider data minimization, redacted logs, deletion, duplicate checks, extraction validation, and draft-only writes.
4. Phase 9L: Optional scheduled sync.
   - Backend-only with visible user controls, cursors, rate limits, revocation, deletion, and no auto-confirmation.
5. Phase 9M: Production hardening.
   - Complete OAuth verification, restricted-scope review or security assessment if required, privacy/support documentation, security test evidence, manual QA, and release sign-off.

## Implementation Phases

Phase 9B: Mock Google source provider boundary.

- Add local-only mock Gmail, Google Drive, and Google Docs receipt text providers behind `ReceiptTextSourceProvider`.
- Preserve mock source type, external id, title/sender, received or modified date, raw text, source provider name, and content hash.
- Route selected mock source text through existing extraction validation into receipt drafts only.
- Add duplicate detection for provider kind plus external id and/or content hash.
- No OAuth, Google package, backend, scheduled sync, real Google data, or real AI API call.

Phase 9C: Google OAuth/backend readiness skeleton.

- Add disabled-by-default feature flags, env placeholder names, status model, Settings placeholder, and disabled provider classes.
- Re-check official Google documentation before implementation and keep scope minimization documented.
- Do not implement OAuth, backend, token storage, Google API calls, or production Google data sync.

Phase 9D: OAuth/backend decision record and disabled backend skeleton.

- Decide backend requirements for OAuth callback handling, authorization response exchange, long-lived provider access, scheduled sync, revocation, and deletion.
- Add disabled backend environment flags, endpoint definitions, readiness model, and no-op client.
- Document token storage, revocation, deletion, logging, first scopes, and frontend-only selected-file exception.
- No production Google data sync, OAuth flow, backend server, token storage, or network call.

Phase 9E: Privacy, consent, and user-facing disclosure planning.

- Draft Settings and consent copy before real provider access.
- Document Google data access, draft-only ingestion, data minimization, AI extraction disclosure, logging limits, token handling, disconnect/revocation, deletion, and OAuth consent checklist.
- No OAuth, Google API calls, backend server, token storage, scheduled sync, real AI provider, or runtime behavior change.

Phase 9F: Manual Drive/Docs selected-file import prototype.

- Implemented as a local-only browser file-input prototype, not as real Google Drive or Docs access.
- Supports selected `.txt`, `.md`, `.html`, and `.json` text-like files that already contain safe receipt-like text.
- Reads selected file text in the browser only and maps it to a Drive/Docs-like receipt candidate with file name/title, pseudo source id, content hash, modified time, fetched/imported time, source kind, and raw text evidence.
- Routes selected file text through the existing local mock AI extraction provider and runtime extraction validation.
- Saves validated receipt drafts and draft items only, preserving source metadata on drafts.
- Rejects duplicate selected files by source id or content hash before mutation.
- No real Drive/Docs API calls, OAuth, broad Drive scan, scheduled sync, Gmail import, backend credential persistence, token storage, provider data sync, OCR, or real AI API calls.

Phase 9G: Gmail manual receipt import prototype.

- Implemented as a local-only browser paste/file prototype, not as real Gmail access.
- Supports pasted email-like receipt text and selected `.eml`/`.txt` files that already contain receipt-like text.
- Reads selected file text in the browser only and maps it to a Gmail-like receipt candidate with sender, subject/title, received time when valid, pseudo message id, content hash, fetched/imported time, source kind, source provider name, and raw text evidence.
- Routes local Gmail-like text through the existing local mock AI extraction provider and runtime extraction validation.
- Saves validated receipt drafts and draft items only, preserving source metadata on drafts.
- Rejects duplicate Gmail-like messages by source id or content hash before mutation.
- Allows missing optional metadata with review warnings and rejects invalid user-provided received dates before draft writes.
- No real Gmail API calls, OAuth, scheduled sync, backend credential persistence, token storage, provider data sync, OCR, attachment fetch, or real AI API calls.

Phase 9H: Google OAuth/backend release-gate planning.

- Completed as a planning-only release gate before any real OAuth/Gmail/Drive/Docs implementation.
- Defines hard requirements for consent, scopes, backend token handling, revocation/disconnect, deletion, logging, privacy copy, user disclosures, source minimization, draft-only ingestion, and no Dashboard impact before confirmation.
- Defines go/no-go criteria for frontend-only selected-file experiments, backend-backed OAuth, Gmail read-only source ingestion, Drive/Docs selected-file or picker ingestion, and scheduled sync.
- Keeps production provider access disabled until backend requirements, consent gates, restricted-scope verification readiness, security assessment needs, and release QA are implemented and validated.

Phase 9I: Disabled backend OAuth architecture skeleton.

- Implemented as frontend-safe typed contracts in `src/google-integration/googleOAuthBackendSkeleton.ts`.
- Defines disabled endpoint metadata for future OAuth start, OAuth callback, provider status, provider disconnect, provider revoke, and source sync.
- Reuses existing disabled backend auth, sync, revocation, base URL, client id, and redirect URI placeholders from Phase 9D.
- Adds `DisabledGoogleOAuthBackendBoundaryClient`, which returns typed disabled responses and does not call a network adapter while disabled.
- Adds tests for disabled defaults, requested flags blocked by release gates, no token storage behavior, no network adapter calls, and no token/secret/authorization URL exposure.
- No backend runtime, OAuth redirect handling, authorization-code exchange, token refresh, provider credential storage, provider revocation call, provider data deletion runtime, source sync, scheduled sync, Google API call, dependency, or product behavior change.

Phase 9J: Narrow Drive/Docs picker-based selected-file provider.

- Prefer `drive.file` and explicit user selection.
- Fetch only selected document/file text.
- Keep draft-only writes and duplicate checks.
- No broad Drive scan, Gmail access, scheduled sync, or Dashboard impact before confirmation.

Phase 9K: Gmail selected-message import behind backend and restricted-scope gates.

- Use explicit selected messages or user-provided filters.
- Fetch only receipt-like body/attachment text for selected candidates.
- Keep raw provider data minimization, redacted logs, deletion, duplicate checks, extraction validation, and draft-only writes.

Phase 9L: Optional scheduled sync.

- Backend-only with visible user controls, cursors, rate limits, revocation, deletion, and no auto-confirmation.

Phase 9M: Production hardening.

- Complete verification requirements, security review, deletion flows, privacy copy, logging controls, QA matrix, and release gate.

## Phase 9A Acceptance

- Future Google source providers are documented.
- OAuth and backend requirements are documented.
- Minimal scopes and sensitivity tradeoffs are documented.
- Discovery, duplicate detection, draft flow, failure handling, logging, and deletion expectations are documented.
- Implementation phases are defined.
- Product runtime behavior remains unchanged.
