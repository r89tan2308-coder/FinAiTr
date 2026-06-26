import { describe, expect, it } from "vitest";
import { type Receipt, type ReceiptDraft } from "../domain/models";
import {
  buildReceiptSourceMetadataView,
  getReceiptSourceDuplicateStatus,
  receiptSourceProviderUxEntries,
} from "./sourceProviderUx";

describe("receipt source provider UX model", () => {
  it("defines the current local and mock receipt source providers", () => {
    expect(receiptSourceProviderUxEntries.map((entry) => entry.key)).toEqual([
      "manual_paste",
      "manual_ai",
      "local_gmail",
      "local_drive_docs",
      "mock_google",
    ]);
    expect(
      receiptSourceProviderUxEntries.every(
        (entry) => entry.label && entry.statusLabel && entry.sourceKinds.length > 0,
      ),
    ).toBe(true);
  });

  it("builds a consistent metadata view for Gmail-like receipt drafts", () => {
    const view = buildReceiptSourceMetadataView({
      createdAt: "2026-06-04T10:20:00.000Z",
      merchant: "Fresh Market",
      metadata: {
        contentHash: "fnv1a-abc12345",
        fetchedAt: "2026-06-04T10:16:00.000Z",
        kind: "gmail",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: "receipts@fresh.example",
        sourceId: "local-gmail-message-fnv1a-abc12345",
        sourceProviderName: "local-gmail-manual-import-provider",
        title: "Fresh Market receipt",
      },
      receiptSource: "ai_extraction_mock",
    });

    expect(view).toMatchObject({
      actorLabel: "From receipts@fresh.example",
      duplicateStatusLabel: "Duplicate check: source id + content hash",
      importedAtLabel: "Imported 2026-06-04T10:16:00.000Z",
      providerLabel:
        "Provider local-gmail-manual-import-provider / local-mock-ai-extractor",
      sourceTitle: "Fresh Market receipt",
      sourceTypeLabel: "Gmail",
    });
  });

  it("falls back to manual paste metadata when source metadata is missing", () => {
    const view = buildReceiptSourceMetadataView({
      createdAt: "2026-06-03T12:00:00.000Z",
      merchant: "GREEN MARKET",
      receiptSource: "pasted_text",
    });

    expect(view).toMatchObject({
      actorLabel: "Source details not provided",
      duplicateStatusLabel: "Duplicate check: unavailable",
      importedAtLabel: "Imported 2026-06-03T12:00:00.000Z",
      sourceTitle: "GREEN MARKET",
      sourceTypeLabel: "Manual paste",
    });
  });

  it("reports source duplicate status from draft and confirmed receipt metadata", () => {
    const draft = {
      id: "draft-1",
      merchant: "Fresh Market",
      sourceMetadata: {
        contentHash: "fnv1a-duplicate",
        kind: "gmail",
        sourceId: "gmail-message-1",
      },
    } as ReceiptDraft;
    const receipt = {
      id: "receipt-1",
      merchant: "Cloud Tools",
      sourceMetadata: {
        contentHash: "fnv1a-confirmed",
        kind: "google_docs",
        sourceId: "docs-document-1",
      },
    } as Receipt;

    expect(
      getReceiptSourceDuplicateStatus(
        {
          contentHash: "fnv1a-duplicate",
          kind: "gmail",
        },
        {
          receiptDrafts: [draft],
          receipts: [receipt],
        },
      ),
    ).toMatchObject({
      label: "Duplicate: saved draft Fresh Market",
      state: "draft_match",
    });
    expect(
      getReceiptSourceDuplicateStatus(
        {
          kind: "google_docs",
          sourceId: "docs-document-1",
        },
        {
          receiptDrafts: [draft],
          receipts: [receipt],
        },
      ),
    ).toMatchObject({
      label: "Duplicate: confirmed receipt Cloud Tools",
      state: "confirmed_match",
    });
    expect(
      getReceiptSourceDuplicateStatus(
        {
          kind: "google_drive",
          sourceId: "drive-file-1",
        },
        {
          receiptDrafts: [draft],
          receipts: [receipt],
        },
      ),
    ).toMatchObject({
      label: "Duplicate check: no local match",
      state: "not_found",
    });
  });
});
