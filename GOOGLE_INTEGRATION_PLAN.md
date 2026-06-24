# Google Integration Plan

Date: 2026-06-24
Status: Phase 9D OAuth/backend decision and disabled backend skeleton. No Google OAuth flow, API calls, backend server, scheduled sync, token storage, or production Google data sync is implemented.

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

- Do not implement OAuth in Phase 9D.
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

Phase 9E: Manual Drive/Docs selected-file import prototype.

- Use the narrowest selected-file flow, preferably `drive.file`.
- Import selected document/file text into receipt candidates.
- Save validated drafts only.
- No broad Drive scan, scheduled sync, Gmail import, or backend unless Phase 9D requires it.

Phase 9F: Gmail manual receipt import planning/prototype.

- Require backend design before restricted Gmail scopes.
- Prepare restricted-scope verification and security-assessment implications.
- List candidates from explicit user query or filters.
- Fetch body text only for selected candidates.
- Save validated drafts only.

Phase 9G: Optional scheduled sync.

- Backend-only.
- Add token refresh, revocation, rate limits, per-user cursors, and visible sync status.
- No silent broad scans.

Phase 9H: Production hardening.

- Complete verification requirements, security review, deletion flows, privacy copy, logging controls, QA matrix, and release gate.

## Phase 9A Acceptance

- Future Google source providers are documented.
- OAuth and backend requirements are documented.
- Minimal scopes and sensitivity tradeoffs are documented.
- Discovery, duplicate detection, draft flow, failure handling, logging, and deletion expectations are documented.
- Implementation phases are defined.
- Product runtime behavior remains unchanged.
