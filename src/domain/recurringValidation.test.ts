import { describe, expect, it } from "vitest";
import {
  assertValidRecurringExpenseInput,
  emptyRecurringExpenseFormValues,
  formValuesToRecurringExpenseInput,
  RecurringExpenseValidationError,
} from "./recurringValidation";

describe("recurring expense validation", () => {
  it("accepts a valid recurring expense input", () => {
    expect(() =>
      assertValidRecurringExpenseInput({
        accountId: "account-card",
        amount: 12.5,
        categoryId: "software",
        currency: "EUR",
        frequency: "monthly",
        merchant: "Cloud App",
        name: "Cloud App",
        nextDueDate: "2026-06-30",
        note: "Team account",
        status: "active",
        tags: ["software"],
      }),
    ).not.toThrow();
  });

  it("returns field errors for required and invalid values", () => {
    try {
      assertValidRecurringExpenseInput({
        accountId: "",
        amount: 0,
        currency: "",
        frequency: "daily" as never,
        name: "",
        nextDueDate: "2026-99-99",
        status: "active",
        tags: [],
      });
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(RecurringExpenseValidationError);
      expect((error as RecurringExpenseValidationError).errors).toMatchObject({
        accountId: "Account is required.",
        amount: "Amount must be greater than zero.",
        currency: "Currency is required.",
        frequency: "Frequency is invalid.",
        name: "Name is required.",
        nextDueDate: "Next due date must be a valid date.",
      });
    }
  });

  it("maps form values to input while preserving amount and currency", () => {
    const values = emptyRecurringExpenseFormValues({
      accountId: "account-card",
      categoryId: "software",
      currency: "GBP",
    });

    const input = formValuesToRecurringExpenseInput({
      ...values,
      amount: "19.99",
      merchant: "  Vendor  ",
      name: "Design Tool",
      nextDueDate: "2026-07-01",
      note: "  Annual renewal  ",
      tagsText: "design, software",
    });

    expect(input).toMatchObject({
      accountId: "account-card",
      amount: 19.99,
      categoryId: "software",
      currency: "GBP",
      merchant: "Vendor",
      name: "Design Tool",
      nextDueDate: "2026-07-01",
      note: "Annual renewal",
      tags: ["design", "software"],
    });
  });
});
