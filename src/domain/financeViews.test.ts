import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { buildFinanceOverview, toMonthlyRecurringAmount } from "./financeViews";
import { type RecurringExpense } from "./models";

describe("finance view helpers", () => {
  it("builds June 2026 dashboard totals from seeded transactions", () => {
    const overview = buildFinanceOverview(createSeedFinanceSnapshot(), {
      monthKey: "2026-06",
    });

    expect(overview.monthlySpend).toBe(145.49);
    expect(overview.pendingReceiptCount).toBe(2);
    expect(overview.recurringMonthlyTotal).toBe(69);
    expect(overview.categorySpend[0]).toEqual({
      id: "gym",
      name: "Gym",
      amount: 49,
      color: "#f59e0b",
    });
  });

  it("aggregates receipt items into top products", () => {
    const overview = buildFinanceOverview(createSeedFinanceSnapshot(), {
      monthKey: "2026-06",
    });

    expect(overview.topProducts.slice(0, 3)).toEqual([
      {
        id: "coffee",
        name: "Coffee",
        amount: 12.3,
        tag: "groceries",
      },
      {
        id: "ibuprofen",
        name: "Ibuprofen",
        amount: 12.5,
        tag: "medicine",
      },
      {
        id: "cottage cheese",
        name: "Cottage cheese",
        amount: 8.8,
        tag: "dairy",
      },
    ].sort((left, right) => right.amount - left.amount));
  });

  it("normalizes recurring expenses to monthly totals", () => {
    const weeklyExpense: RecurringExpense = {
      id: "weekly",
      name: "Weekly test",
      amount: 12,
      currency: "USD",
      frequency: "weekly",
      nextDueDate: "2026-06-10",
      status: "active",
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
    };

    const yearlyExpense: RecurringExpense = {
      ...weeklyExpense,
      id: "yearly",
      frequency: "yearly",
      amount: 120,
    };

    expect(toMonthlyRecurringAmount(weeklyExpense)).toBe(52);
    expect(toMonthlyRecurringAmount(yearlyExpense)).toBe(10);
  });
});

