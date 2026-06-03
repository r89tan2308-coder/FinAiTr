import { describe, expect, it } from "vitest";
import {
  formValuesToTransactionInput,
  parseTags,
  validateTransactionInput,
} from "./transactionValidation";

describe("transaction validation", () => {
  it("requires date, positive amount, account, and merchant or note", () => {
    const result = validateTransactionInput({
      accountId: "",
      amount: 0,
      currency: "",
      date: "",
      merchant: "",
      tags: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({
      accountId: "Account is required.",
      amount: "Amount must be greater than zero.",
      currency: "Currency is required.",
      date: "Date is required.",
      merchant: "Merchant or note is required.",
    });
  });

  it("uses note as merchant fallback and normalizes tags", () => {
    const input = formValuesToTransactionInput({
      accountId: "account-card",
      amount: "12.50",
      categoryId: "software",
      currency: "usd",
      date: "2026-06-10",
      description: "Side project hosting",
      merchant: "",
      tagsText: "Software, hosting, software",
    });

    expect(input).toEqual({
      accountId: "account-card",
      amount: 12.5,
      categoryId: "software",
      currency: "USD",
      date: "2026-06-10",
      description: "Side project hosting",
      merchant: "Side project hosting",
      tags: ["software", "hosting"],
    });
  });

  it("deduplicates parsed tags", () => {
    expect(parseTags("games, steam, games, ")).toEqual(["games", "steam"]);
  });
});

