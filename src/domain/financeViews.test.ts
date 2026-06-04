import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  convertMoney,
  defaultCurrencySettings,
  roundMoney,
} from "./currencySettings";
import { buildFinanceOverview, toMonthlyRecurringAmount } from "./financeViews";
import { type RecurringExpense } from "./models";

describe("finance view helpers", () => {
  it("builds June 2026 dashboard totals from seeded transactions", () => {
    const overview = buildFinanceOverview(createSeedFinanceSnapshot(), {
      monthKey: "2026-06",
    });

    expect(overview.displayCurrency).toBe("RUB");
    expect(overview.monthlySpend).toBe(
      sumUsdToRub([42.8, 20, 18.7, 14.99, 49]),
    );
    expect(overview.pendingReceiptCount).toBe(2);
    expect(overview.recurringMonthlyTotal).toBe(sumUsdToRub([20, 49]));
    expect(overview.categorySpend[0]).toEqual({
      id: "gym",
      name: "Gym",
      amount: usdToRub(49),
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
        amount: usdToRub(12.3),
        tag: "groceries",
      },
      {
        id: "ibuprofen",
        name: "Ibuprofen",
        amount: usdToRub(12.5),
        tag: "medicine",
      },
      {
        id: "cottage cheese",
        name: "Cottage cheese",
        amount: usdToRub(8.8),
        tag: "dairy",
      },
    ].sort((left, right) => right.amount - left.amount));
  });

  it("converts mixed transaction currencies into the selected display currency", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.transactions = [
      {
        ...snapshot.transactions[0],
        amount: 1,
        currency: "USD",
        id: "usd",
      },
      {
        ...snapshot.transactions[0],
        amount: 1,
        currency: "EUR",
        id: "eur",
      },
      {
        ...snapshot.transactions[0],
        amount: 1,
        currency: "GBP",
        id: "gbp",
      },
      {
        ...snapshot.transactions[0],
        amount: 100,
        currency: "RUB",
        id: "rub",
      },
    ];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];

    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    expect(overview.monthlySpend).toBe(
      roundMoney(72.5597 + 84.6096 + 97.4985 + 100),
    );
  });

  it("keeps source transaction amounts unchanged while building converted totals", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.transactions = [
      {
        ...snapshot.transactions[0],
        amount: 100,
        currency: "EUR",
        id: "source-eur",
      },
    ];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];
    const originalTransactions = structuredClone(snapshot.transactions);

    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    expect(overview.monthlySpend).toBe(
      convertMoney(100, "EUR", "RUB", defaultCurrencySettings),
    );
    expect(snapshot.transactions).toEqual(originalTransactions);
    expect(overview.recentTransactions[0]).toMatchObject({
      amount: 100,
      currency: "EUR",
      id: "source-eur",
    });
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
      tags: [],
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

  it("converts active recurring estimates without changing monthly spend", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.transactions = [];
    snapshot.recurringExpenses = [
      {
        ...snapshot.recurringExpenses[0],
        amount: 100,
        currency: "EUR",
        frequency: "monthly",
        id: "active-eur",
        status: "active",
      },
      {
        ...snapshot.recurringExpenses[0],
        amount: 120,
        currency: "GBP",
        frequency: "yearly",
        id: "active-gbp",
        status: "active",
      },
      {
        ...snapshot.recurringExpenses[0],
        amount: 500,
        currency: "RUB",
        frequency: "monthly",
        id: "paused-rub",
        status: "paused",
      },
    ];

    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    expect(overview.monthlySpend).toBe(0);
    expect(overview.recurringMonthlyTotal).toBe(
      roundMoney(
        convertMoney(100, "EUR", "RUB", defaultCurrencySettings) +
          convertMoney(10, "GBP", "RUB", defaultCurrencySettings),
      ),
    );
  });
});

function usdToRub(amount: number): number {
  return convertMoney(amount, "USD", "RUB", defaultCurrencySettings);
}

function sumUsdToRub(amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, amount) => sum + usdToRub(amount), 0));
}
