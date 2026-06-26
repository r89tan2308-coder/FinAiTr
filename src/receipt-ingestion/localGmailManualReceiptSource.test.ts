import { describe, expect, it } from "vitest";
import { mockEmailReceiptText } from "./fixtures";
import {
  buildLocalGmailManualReceiptCandidate,
  isSupportedLocalGmailEmailFileName,
} from "./localGmailManualReceiptSource";

describe("local Gmail manual receipt source", () => {
  it("builds a Gmail candidate from email-like receipt text", () => {
    const candidate = buildLocalGmailManualReceiptCandidate({
      rawText: mockEmailReceiptText,
    });

    expect(candidate.id).toMatch(/^gmail:local-gmail-message-fnv1a-[0-9a-f]{8}$/);
    expect(candidate.rawText).toBe(mockEmailReceiptText);
    expect(candidate.source).toMatchObject({
      contentHash: expect.stringMatching(/^fnv1a-[0-9a-f]{8}$/),
      kind: "gmail",
      receivedAt: "2026-06-04T10:15:00.000Z",
      sender: "receipts@fresh.example",
      sourceProviderName: "local-gmail-manual-import-provider",
      title: "Fresh Market receipt",
    });
    expect(candidate.source.sourceId).toBe(
      `local-gmail-message-${candidate.source.contentHash}`,
    );
    expect(candidate.warnings).toEqual([
      "Local Gmail manual import prototype. No Gmail API or OAuth was called.",
    ]);
  });

  it("allows missing optional metadata and reports review warnings", () => {
    const candidate = buildLocalGmailManualReceiptCandidate({
      rawText: "Fresh Market\n2026-06-04\nBread 2.00\nTOTAL USD 2.00",
    });

    expect(candidate.source).toMatchObject({
      kind: "gmail",
      sourceProviderName: "local-gmail-manual-import-provider",
    });
    expect(candidate.source.receivedAt).toBeUndefined();
    expect(candidate.source.sender).toBeUndefined();
    expect(candidate.source.title).toBeUndefined();
    expect(candidate.warnings).toEqual(
      expect.arrayContaining([
        "Gmail sender metadata was not provided or detected.",
        "Gmail subject metadata was not provided or detected.",
        "Gmail received date metadata was not provided or detected.",
      ]),
    );
  });

  it("preserves user-provided metadata over headers", () => {
    const candidate = buildLocalGmailManualReceiptCandidate({
      rawText: mockEmailReceiptText,
      sourceReceivedAt: "2026-06-05T11:00:00.000Z",
      sourceSender: "override@example.com",
      sourceSubject: "Forwarded receipt",
    });

    expect(candidate.source).toMatchObject({
      receivedAt: "2026-06-05T11:00:00.000Z",
      sender: "override@example.com",
      title: "Forwarded receipt",
    });
  });

  it("rejects empty text or invalid user-provided received dates", () => {
    expect(() =>
      buildLocalGmailManualReceiptCandidate({
        rawText: "",
      }),
    ).toThrow("Gmail receipt text is required.");

    expect(() =>
      buildLocalGmailManualReceiptCandidate({
        rawText: mockEmailReceiptText,
        sourceReceivedAt: "not-a-date",
      }),
    ).toThrow("Gmail received date must be a valid date or ISO timestamp.");
  });

  it("recognizes supported local email file names", () => {
    expect(isSupportedLocalGmailEmailFileName("receipt.eml")).toBe(true);
    expect(isSupportedLocalGmailEmailFileName("receipt.txt")).toBe(true);
    expect(isSupportedLocalGmailEmailFileName("receipt.pdf")).toBe(false);
  });
});
