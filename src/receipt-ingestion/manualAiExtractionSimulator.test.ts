import { describe, expect, it } from "vitest";
import { seedCategories } from "../data/seedData";
import { mockEmailReceiptText } from "./fixtures";
import {
  buildManualAiReceiptCandidate,
  buildReceiptExtractionRequest,
  extractReceiptEvidenceText,
  mockAiReceiptExtractionProvider,
} from "./manualAiExtractionSimulator";

describe("manual AI extraction simulator", () => {
  it("extracts contract-shaped draft data from email-like receipt text", async () => {
    const candidate = buildManualAiReceiptCandidate({
      rawText: mockEmailReceiptText,
      sourceKind: "gmail",
    });
    const result = await mockAiReceiptExtractionProvider.extractReceiptDraft(
      buildReceiptExtractionRequest(
        candidate,
        seedCategories.map((category) => ({
          id: category.id,
          keywords: [category.id, category.name],
          name: category.name,
        })),
      ),
    );

    expect(candidate.source).toMatchObject({
      kind: "gmail",
      receivedAt: "2026-06-04T10:15:00.000Z",
      sender: "receipts@fresh.example",
      title: "Fresh Market receipt",
    });
    expect(result).toMatchObject({
      modelName: "local-heuristic-simulator",
      providerName: "local-mock-ai-extractor",
    });
    expect(result.draft).toMatchObject({
      confidence: expect.any(Number),
      currency: "USD",
      merchantName: "Fresh Market",
      receiptDate: "2026-06-04",
      totalAmount: 5,
      warnings: expect.arrayContaining([
        "Simulated AI extraction from Gmail.",
      ]),
    });
    expect(result.draft.items[0]).toMatchObject({
      categoryId: "dairy",
      kind: "item",
      normalizedName: "milk",
      quantity: 2,
      rawName: "Milk",
      totalPrice: 3,
      unitPrice: 1.5,
    });
  });

  it("strips source headers before local extraction", () => {
    expect(extractReceiptEvidenceText(mockEmailReceiptText)).toBe(
      "Fresh Market\n2026-06-04\nMilk 2 x 3.00\nBread 2.00\nTOTAL USD 5.00",
    );
  });

  it("rejects empty or metadata-only input", async () => {
    expect(() =>
      buildManualAiReceiptCandidate({
        rawText: "",
        sourceKind: "gmail",
      }),
    ).toThrow("Receipt source text is required");

    await expect(
      mockAiReceiptExtractionProvider.extractReceiptDraft({
        categoryHints: [],
        rawText: "Subject: Empty receipt",
        source: {
          kind: "gmail",
          title: "Empty receipt",
        },
      }),
    ).rejects.toThrow("Receipt-like content could not be found");
  });
});
