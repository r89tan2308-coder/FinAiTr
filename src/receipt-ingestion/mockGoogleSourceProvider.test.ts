import { describe, expect, it } from "vitest";
import {
  createMockGoogleReceiptSourceProvider,
  getMockGoogleReceiptSourceCandidate,
  listMockGoogleReceiptSourceCandidates,
  listMockGoogleReceiptSourceSummaries,
  mockGoogleReceiptSourceProviders,
} from "./mockGoogleSourceProvider";

describe("mock Google receipt source providers", () => {
  it("lists mock Gmail, Drive, and Docs candidates through source providers", async () => {
    const candidates = await listMockGoogleReceiptSourceCandidates();

    expect(candidates.map((candidate) => candidate.source.kind).sort()).toEqual([
      "gmail",
      "google_docs",
      "google_drive",
    ]);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      source: {
        contentHash: expect.stringMatching(/^fnv1a-[0-9a-f]{8}$/),
        sourceProviderName: "mock-google-source-provider",
      },
    });
  });

  it("gets a selected candidate by provider candidate id or external id", async () => {
    const provider = createMockGoogleReceiptSourceProvider("google_drive");
    const [driveCandidate] = await provider.listCandidates();

    const byCandidateId = await provider.getCandidateText(driveCandidate.id);
    const byExternalId = await provider.getCandidateText(
      driveCandidate.source.sourceId ?? "",
    );

    expect(byCandidateId).toEqual(byExternalId);
    expect(byCandidateId).toMatchObject({
      rawText: expect.stringContaining("City Pharmacy"),
      source: {
        kind: "google_drive",
        modifiedAt: "2026-06-06T15:45:00.000Z",
        sourceId: "drive-file-city-pharmacy-20260606",
        title: "City Pharmacy receipt",
      },
    });
  });

  it("resolves candidates across the mock Google provider registry", async () => {
    const summaries = listMockGoogleReceiptSourceSummaries();
    const docsSummary = summaries.find(
      (summary) => summary.kind === "google_docs",
    );

    if (!docsSummary) {
      throw new Error("Expected mock Docs summary.");
    }

    const candidate = await getMockGoogleReceiptSourceCandidate(
      docsSummary.id,
      mockGoogleReceiptSourceProviders,
    );

    expect(candidate).toMatchObject({
      rawText: expect.stringContaining("Cloud Tools"),
      source: {
        contentHash: docsSummary.contentHash,
        kind: "google_docs",
        modifiedAt: docsSummary.modifiedAt,
        sourceId: docsSummary.sourceId,
      },
    });
  });
});
