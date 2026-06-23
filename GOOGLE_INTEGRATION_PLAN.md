# Google Integration Plan

Date: 2026-06-23
Status: Phase 9A planning only. No Google OAuth, API calls, backend, scheduled sync, or runtime product behavior is implemented in this phase.

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

- Do not implement OAuth in Phase 9A.
- Do not add Google packages, API clients, backend services, environment variables, or secrets.
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

Start with manual, user-initiated Drive/Docs file selection before Gmail.

Drive/Docs manual import can be attempted as a frontend-only user action if it uses Google Picker or an equivalent file picker with `drive.file` and short-lived access tokens. This supports explicit user selection and avoids broad Drive access. It does not support long-term background sync.

Gmail body import and any scheduled sync require backend planning before implementation. Gmail body read access uses restricted scopes such as `gmail.readonly`. If restricted-scope data is stored or transmitted on servers, Google requires restricted-scope verification and may require security assessment. A backend is also required for safe refresh-token storage, scheduled jobs, webhook or Pub/Sub handling, and revocation/deletion workflows.

Do not store OAuth client secrets or refresh tokens in the PWA, localStorage, IndexedDB, JSON backup, CSV files, or committed config. Google OAuth guidance requires client secrets to be stored securely, and refresh tokens are long-lived credentials.

Backend is required for:

- Gmail body read or mailbox search beyond a one-off add-on context;
- scheduled Gmail or Drive sync;
- long-lived refresh-token storage;
- Pub/Sub or push notification handling;
- centralized revocation, deletion, audit, and rate-limit management;
- restricted-scope verification or security-assessment readiness.

Backend may not be required for:

- manual Drive/Docs file picker import using `drive.file`;
- one-time selected-file text extraction where no refresh token is persisted;
- local-only draft creation after the selected text is returned.

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

Phase 9B: OAuth and security architecture spike.

- Decide frontend-only manual Drive/Docs import versus backend-backed provider auth.
- Draft consent-screen copy and privacy disclosures.
- Define token storage, revocation, deletion, logging, and threat model.
- No production Google data sync.

Phase 9C: Manual Drive/Docs selected-file import prototype.

- Use the narrowest selected-file flow, preferably `drive.file`.
- Import selected document/file text into receipt candidates.
- Save validated drafts only.
- No broad Drive scan, scheduled sync, Gmail import, or backend unless Phase 9B requires it.

Phase 9D: Gmail manual receipt import planning/prototype.

- Require backend design before restricted Gmail scopes.
- Prepare restricted-scope verification and security-assessment implications.
- List candidates from explicit user query or filters.
- Fetch body text only for selected candidates.
- Save validated drafts only.

Phase 9E: Optional scheduled sync.

- Backend-only.
- Add token refresh, revocation, rate limits, per-user cursors, and visible sync status.
- No silent broad scans.

Phase 9F: Production hardening.

- Complete verification requirements, security review, deletion flows, privacy copy, logging controls, QA matrix, and release gate.

## Phase 9A Acceptance

- Future Google source providers are documented.
- OAuth and backend requirements are documented.
- Minimal scopes and sensitivity tradeoffs are documented.
- Discovery, duplicate detection, draft flow, failure handling, logging, and deletion expectations are documented.
- Implementation phases are defined.
- Product runtime behavior remains unchanged.
