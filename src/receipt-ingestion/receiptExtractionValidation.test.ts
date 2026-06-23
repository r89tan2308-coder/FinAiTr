import { describe, expect, it } from "vitest";
import { seedCategories } from "../data/seedData";
import { validateReceiptExtractionResult } from "./receiptExtractionValidation";
import {
  type ReceiptExtractionResult,
  type ReceiptTextSourceReference,
} from "./types";

describe("receipt extraction validation", () => {
  it("accepts contract-shaped extraction output", () => {
    const result = validateReceiptExtractionResult(createExtractionResult(), {
      categoryIds: seedCategories.map((category) => category.id),
      source: createSource(),
    });

    expect(result).toMatchObject({
      draft: {
        confidence: 0.88,
        currency: "USD",
        merchantName: "Fresh Market",
        receiptDate: "2026-06-04",
        totalAmount: 5,
      },
      extractedAt: "2026-06-04T10:16:00.000Z",
      modelName: "local-heuristic-simulator",
      providerName: "local-mock-ai-extractor",
    });
    expect(result.draft.items[0]).toMatchObject({
      categoryId: "dairy",
      confidence: 0.82,
      flags: [],
      kind: "item",
      normalizedName: "milk",
      rawName: "Milk",
      totalPrice: 3,
    });
  });

  it("rejects missing required extraction fields", () => {
    const extraction = createExtractionResult();
    delete (extraction.draft as Partial<ReceiptExtractionResult["draft"]>)
      .currency;

    expect(() =>
      validateReceiptExtractionResult(extraction, {
        categoryIds: seedCategories.map((category) => category.id),
        source: createSource(),
      }),
    ).toThrow("AI extraction currency is required.");
  });

  it("rejects malformed item shape before draft creation", () => {
    const extraction = createExtractionResult();
    extraction.draft.items[0] = {
      ...extraction.draft.items[0],
      kind: "unsupported-kind",
      rawName: "",
    } as unknown as ReceiptExtractionResult["draft"]["items"][number];

    expect(() =>
      validateReceiptExtractionResult(extraction, {
        categoryIds: seedCategories.map((category) => category.id),
        source: createSource(),
      }),
    ).toThrow("AI extraction item 1 kind is not supported: unsupported-kind.");
  });

  it("rejects invalid currencies and amounts", () => {
    const invalidCurrency = createExtractionResult();
    invalidCurrency.draft.currency = "usd";

    expect(() =>
      validateReceiptExtractionResult(invalidCurrency, {
        categoryIds: seedCategories.map((category) => category.id),
        source: createSource(),
      }),
    ).toThrow(
      "AI extraction currency must be a three-letter uppercase currency code.",
    );

    const invalidAmount = createExtractionResult();
    invalidAmount.draft.items[0] = {
      ...invalidAmount.draft.items[0],
      totalPrice: -3,
    };

    expect(() =>
      validateReceiptExtractionResult(invalidAmount, {
        categoryIds: seedCategories.map((category) => category.id),
        source: createSource(),
      }),
    ).toThrow("AI extraction item 1 total price must be greater than or equal to 0.");
  });

  it("adds a review warning when receipt total does not match item sum", () => {
    const extraction = createExtractionResult();
    extraction.draft.totalAmount = 12;

    const result = validateReceiptExtractionResult(extraction, {
      categoryIds: seedCategories.map((category) => category.id),
      source: createSource(),
    });

    expect(result.draft.warnings).toContain(
      "AI extraction total 12.00 differs from item sum 5.00 by 7.00.",
    );
  });

  it("marks unknown and unclear items for review without rejecting them", () => {
    const extraction = createExtractionResult();
    extraction.draft.items[0] = {
      ...extraction.draft.items[0],
      categoryId: "uncategorized",
      kind: "unclear",
    };

    const result = validateReceiptExtractionResult(extraction, {
      categoryIds: seedCategories.map((category) => category.id),
      source: createSource(),
    });

    expect(result.draft.items[0].flags).toEqual(
      expect.arrayContaining(["uncategorized", "unclear_line"]),
    );
    expect(result.draft.warnings).toEqual(
      expect.arrayContaining([
        "AI extraction item 1 is unclear and needs review.",
        'AI extraction item 1 uses category "uncategorized" outside available hints; review category before confirmation.',
      ]),
    );
  });

  it("marks low-confidence drafts and items for review", () => {
    const extraction = createExtractionResult();
    extraction.draft.confidence = 0.42;
    extraction.draft.items[0] = {
      ...extraction.draft.items[0],
      confidence: 0.45,
    };

    const result = validateReceiptExtractionResult(extraction, {
      categoryIds: seedCategories.map((category) => category.id),
      source: createSource(),
    });

    expect(result.draft.items[0].flags).toContain("low_confidence");
    expect(result.draft.warnings).toEqual(
      expect.arrayContaining([
        "AI extraction confidence is low; review the receipt before confirmation.",
        "AI extraction item 1 has low confidence and needs review.",
      ]),
    );
  });

  it("rejects invalid source metadata before draft creation", () => {
    expect(() =>
      validateReceiptExtractionResult(createExtractionResult(), {
        categoryIds: seedCategories.map((category) => category.id),
        source: {
          ...createSource(),
          receivedAt: "not-a-date",
        },
      }),
    ).toThrow("AI receipt source received time must be a valid ISO timestamp.");
  });
});

function createExtractionResult(): ReceiptExtractionResult {
  return {
    draft: {
      confidence: 0.88,
      currency: "USD",
      items: [
        {
          categoryId: "dairy",
          confidence: 0.82,
          flags: [],
          kind: "item",
          normalizedName: "milk",
          quantity: 2,
          rawLine: "Milk 2 x 3.00",
          rawName: "Milk",
          tags: ["dairy", "groceries"],
          totalPrice: 3,
          unitPrice: 1.5,
        },
        {
          categoryId: "groceries",
          confidence: 0.8,
          flags: [],
          kind: "item",
          normalizedName: "bread",
          rawLine: "Bread 2.00",
          rawName: "Bread",
          tags: ["groceries"],
          totalPrice: 2,
        },
      ],
      merchantName: "Fresh Market",
      receiptDate: "2026-06-04",
      totalAmount: 5,
      warnings: [],
    },
    extractedAt: "2026-06-04T10:16:00.000Z",
    modelName: "local-heuristic-simulator",
    providerName: "local-mock-ai-extractor",
  };
}

function createSource(): ReceiptTextSourceReference {
  return {
    kind: "gmail",
    receivedAt: "2026-06-04T10:15:00.000Z",
    sender: "receipts@fresh.example",
    sourceId: "msg-fresh-market",
    title: "Fresh Market receipt",
  };
}
