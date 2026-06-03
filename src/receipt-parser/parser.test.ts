import { describe, expect, it } from "vitest";
import {
  discountReceiptText,
  groceryReceiptText,
  mismatchReceiptText,
  unknownReceiptText,
} from "./fixtures";
import { parseReceiptText } from "./parser";

describe("receipt text parser", () => {
  it("parses a simple grocery receipt", () => {
    const draft = parseReceiptText(groceryReceiptText);

    expect(draft.rawText).toBe(groceryReceiptText);
    expect(draft.merchantName).toBe("GREEN MARKET");
    expect(draft.receiptDate).toBe("2026-06-03");
    expect(draft.currency).toBe("USD");
    expect(draft.totalAmount).toBe(15.5);
    expect(draft.warnings).toEqual([]);
    expect(draft.items).toHaveLength(3);
    expect(draft.items[0]).toMatchObject({
      categoryId: "dairy",
      normalizedName: "milk",
      quantity: 1,
      rawName: "Milk",
      totalPrice: 4.2,
      unitPrice: 4.2,
    });
    expect(draft.items[1]).toMatchObject({
      categoryId: "dairy",
      normalizedName: "cottage cheese",
      rawName: "Cottage cheese",
      totalPrice: 8.8,
    });
  });

  it("preserves discounts, taxes, and unclear lines for review", () => {
    const draft = parseReceiptText(discountReceiptText);

    expect(draft.merchantName).toBe("Corner Store");
    expect(draft.receiptDate).toBe("2026-06-03");
    expect(draft.currency).toBe("EUR");
    expect(draft.totalAmount).toBe(11.1);
    expect(draft.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: "groceries",
          kind: "item",
          rawName: "Coffee",
          totalPrice: 12.3,
        }),
        expect.objectContaining({
          flags: expect.arrayContaining(["discount_line"]),
          kind: "discount",
          rawName: "Discount",
          totalPrice: -2,
        }),
        expect.objectContaining({
          flags: expect.arrayContaining(["tax_line"]),
          kind: "tax",
          rawName: "Tax",
          totalPrice: 0.8,
        }),
      ]),
    );
    expect(draft.warnings).toContain(
      'Unclear line preserved for review: "Mystery promo line".',
    );
  });

  it("warns when receipt total does not match item sum", () => {
    const draft = parseReceiptText(mismatchReceiptText);

    expect(draft.merchantName).toBe("City Pharmacy");
    expect(draft.totalAmount).toBe(25);
    expect(draft.items).toHaveLength(2);
    expect(draft.warnings.some((warning) => warning.includes("does not match"))).toBe(
      true,
    );
  });

  it("flags unknown products as uncategorized", () => {
    const draft = parseReceiptText(unknownReceiptText);
    const unknownItem = draft.items.find((item) => item.rawName === "Blue Widget");

    expect(unknownItem).toBeDefined();
    expect(unknownItem).toMatchObject({
      categoryId: "uncategorized",
      flags: expect.arrayContaining(["uncategorized", "low_confidence"]),
      normalizedName: "blue widget",
      totalPrice: 9.99,
    });
    expect(draft.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flags: expect.arrayContaining(["fee_line"]),
          kind: "fee",
          rawName: "Service fee",
        }),
      ]),
    );
  });
});

