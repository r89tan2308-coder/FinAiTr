import { describe, expect, it } from "vitest";
import { mockDocumentReceiptText } from "./fixtures";
import {
  buildLocalDriveDocsSelectedFileCandidate,
  isSupportedLocalDriveDocsSelectedFileName,
} from "./localDriveDocsSelectedFileSource";

describe("local Drive/Docs selected-file source", () => {
  it("builds a Drive-like receipt text candidate from a selected text file", () => {
    const lastModified = Date.parse("2026-06-05T09:30:00.000Z");
    const candidate = buildLocalDriveDocsSelectedFileCandidate({
      fileName: "software-receipt.md",
      lastModified,
      rawText: mockDocumentReceiptText,
      sourceKind: "google_docs",
    });

    expect(candidate).toMatchObject({
      rawText: mockDocumentReceiptText,
      source: {
        contentHash: expect.stringMatching(/^fnv1a-[0-9a-f]{8}$/),
        kind: "google_docs",
        modifiedAt: "2026-06-05T09:30:00.000Z",
        sourceId: expect.stringMatching(/^local-selected-file-fnv1a-[0-9a-f]{8}$/),
        sourceProviderName: "local-drive-docs-selected-file-provider",
        title: "software-receipt.md",
      },
      warnings: expect.arrayContaining([
        "Local Google Docs selected-file prototype. No Google API was called.",
      ]),
    });
    expect(Date.parse(candidate.detectedAt)).not.toBeNaN();
    expect(candidate.source.fetchedAt).toBe(candidate.detectedAt);
  });

  it("rejects unsupported selected file extensions", () => {
    expect(isSupportedLocalDriveDocsSelectedFileName("receipt.pdf")).toBe(false);
    expect(isSupportedLocalDriveDocsSelectedFileName("receipt.txt")).toBe(true);

    expect(() =>
      buildLocalDriveDocsSelectedFileCandidate({
        fileName: "receipt.pdf",
        rawText: mockDocumentReceiptText,
        sourceKind: "google_drive",
      }),
    ).toThrow("Selected file type is not supported");
  });

  it("normalizes local HTML and JSON files before extraction", () => {
    const htmlCandidate = buildLocalDriveDocsSelectedFileCandidate({
      fileName: "receipt.html",
      rawText:
        "<main><h1>Cloud Tools</h1><p>2026-06-05</p><p>Pro plan 12.00</p><p>TOTAL USD 12.00</p></main>",
      sourceKind: "google_drive",
    });
    const jsonCandidate = buildLocalDriveDocsSelectedFileCandidate({
      fileName: "receipt.json",
      rawText: JSON.stringify({ receiptText: mockDocumentReceiptText }),
      sourceKind: "google_docs",
    });

    expect(htmlCandidate.rawText).toContain("Cloud Tools");
    expect(htmlCandidate.rawText).not.toContain("<main>");
    expect(htmlCandidate.warnings).toContain(
      "HTML tags were stripped before local receipt extraction.",
    );
    expect(jsonCandidate.rawText).toBe(mockDocumentReceiptText);
    expect(jsonCandidate.warnings).toContain(
      "JSON was parsed locally before receipt extraction.",
    );
  });
});
