import { describe, expect, it } from "vitest";
import { groceryReceiptText } from "../receipt-parser/fixtures";
import { parsePastedReceiptText } from "./receiptParserService";

describe("receipt parser service", () => {
  it("returns a parsed draft for pasted receipt text", () => {
    const draft = parsePastedReceiptText(groceryReceiptText);

    expect(draft.merchantName).toBe("GREEN MARKET");
    expect(draft.items.length).toBeGreaterThan(0);
    expect(draft.rawText).toBe(groceryReceiptText);
  });
});

