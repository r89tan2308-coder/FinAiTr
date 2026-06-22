import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  convertMoney,
  defaultCurrencySettings,
  roundMoney,
} from "./currencySettings";
import {
  buildFinanceOverview,
  buildMonthlyTrend,
  buildReceiptItemAnalytics,
  filterReceiptItemAnalytics,
  toMonthlyRecurringAmount,
} from "./financeViews";
import { type FinanceSnapshot, type RecurringExpense } from "./models";

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

  it("aggregates confirmed receipt items into top products", () => {
    const overview = buildFinanceOverview(createSeedFinanceSnapshot(), {
      monthKey: "2026-06",
    });

    expect(overview.topProducts).toEqual([
      {
        id: "ibuprofen",
        name: "Ibuprofen",
        amount: usdToRub(12.5),
        tag: "Medicine",
      },
      {
        id: "bandages",
        name: "Bandages",
        amount: usdToRub(6.2),
        tag: "Medicine",
      },
    ]);
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

  it("builds a transaction-only monthly trend with display currency conversion", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.transactions = [
      {
        ...snapshot.transactions[0],
        amount: 10,
        currency: "USD",
        date: "2026-04-12",
        id: "trend-apr-grocery",
      },
      {
        ...snapshot.transactions[0],
        amount: 20,
        currency: "EUR",
        date: "2026-05-12",
        id: "trend-may-grocery",
      },
      {
        ...snapshot.transactions[0],
        amount: 30,
        categoryId: "software",
        currency: "RUB",
        date: "2026-06-12",
        id: "trend-jun-software",
      },
    ];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];

    const trend = buildMonthlyTrend(snapshot, {
      endMonthKey: "2026-06",
      monthCount: 3,
    });

    expect(trend.months.map((month) => month.monthKey)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(trend.hasTransactions).toBe(true);
    expect(trend.totalSpend).toBe(
      roundMoney(usdToRub(10) + eurToRub(20) + 30),
    );
    expect(trend.averageSpend).toBe(
      roundMoney((usdToRub(10) + eurToRub(20) + 30) / 3),
    );
    expect(trend.months[1]).toMatchObject({
      label: "May 2026",
      spendAmount: eurToRub(20),
      topCategory: {
        id: "groceries",
        name: "Groceries",
        amount: eurToRub(20),
      },
      transactionCount: 1,
    });
    expect(trend.months[2].categoryBreakdown).toEqual([
      {
        amount: 30,
        color: "#7c3aed",
        id: "software",
        name: "Software",
      },
    ]);
  });

  it("separates income category transactions from monthly spend trend", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.categories = [
      ...snapshot.categories,
      {
        color: "#16a34a",
        icon: "briefcase",
        id: "salary",
        name: "Salary",
        type: "income",
      },
    ];
    snapshot.transactions = [
      {
        ...snapshot.transactions[0],
        amount: 100,
        categoryId: "groceries",
        currency: "USD",
        date: "2026-06-10",
        id: "trend-expense",
      },
      {
        ...snapshot.transactions[0],
        amount: 500,
        categoryId: "salary",
        currency: "USD",
        date: "2026-06-15",
        id: "trend-income",
        merchant: "Employer",
      },
    ];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];

    const overview = buildFinanceOverview(snapshot, { monthKey: "2026-06" });
    const juneTrend = overview.monthlyTrend.months.find(
      (month) => month.monthKey === "2026-06",
    );

    expect(overview.monthlySpend).toBe(usdToRub(600));
    expect(overview.monthlyTrend.hasIncome).toBe(true);
    expect(juneTrend).toMatchObject({
      incomeAmount: usdToRub(500),
      netAmount: usdToRub(400),
      spendAmount: usdToRub(100),
      transactionCount: 2,
    });
  });

  it("keeps receipt items and recurring expenses out of monthly trend totals", () => {
    const snapshot = createItemAnalyticsSnapshot();
    snapshot.recurringExpenses = [
      {
        ...createSeedFinanceSnapshot().recurringExpenses[0],
        amount: 999,
        currency: "USD",
        frequency: "monthly",
        id: "trend-recurring",
        status: "active",
      },
    ];

    const trend = buildMonthlyTrend(snapshot, {
      endMonthKey: "2026-06",
      monthCount: 2,
    });
    const juneTrend = trend.months.find((month) => month.monthKey === "2026-06");

    expect(juneTrend?.spendAmount).toBe(usdToRub(100));
    expect(juneTrend?.categoryBreakdown).toEqual([
      {
        amount: usdToRub(100),
        color: "#0f766e",
        id: "groceries",
        name: "Groceries",
      },
    ]);
    expect(trend.totalSpend).toBe(usdToRub(100));
  });

  it("returns an empty monthly trend window when there are no transactions", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.transactions = [];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];

    const trend = buildMonthlyTrend(snapshot, {
      endMonthKey: "2026-06",
      monthCount: 3,
    });

    expect(trend).toMatchObject({
      averageSpend: 0,
      hasIncome: false,
      hasTransactions: false,
      maxIncomeAmount: 0,
      maxSpendAmount: 0,
      totalIncome: 0,
      totalSpend: 0,
    });
    expect(trend.months.map((month) => month.monthKey)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(trend.months.every((month) => month.transactionCount === 0)).toBe(
      true,
    );
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

  it("aggregates confirmed receipt items by normalized name for a period", () => {
    const snapshot = createItemAnalyticsSnapshot();
    const originalItems = structuredClone(snapshot.receiptItems);

    const analytics = buildReceiptItemAnalytics(snapshot, {
      monthKey: "2026-06",
      period: "current_month",
    });
    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    expect(analytics.totalAmount).toBe(usdToRub(5));
    expect(analytics.itemCount).toBe(1);
    expect(analytics.averageItemPrice).toBe(usdToRub(5));
    expect(analytics.topItems).toEqual([
      {
        averageItemPrice: usdToRub(5),
        categoryId: "dairy",
        categoryName: "Dairy",
        id: "milk",
        itemCount: 1,
        name: "Milk",
        totalAmount: usdToRub(5),
      },
    ]);
    expect(overview.monthlySpend).toBe(usdToRub(100));
    expect(snapshot.receiptItems).toEqual(originalItems);
  });

  it("aggregates confirmed receipt items by category", () => {
    const analytics = buildReceiptItemAnalytics(createItemAnalyticsSnapshot(), {
      monthKey: "2026-06",
      period: "all_time",
    });
    const dairy = analytics.topCategories.find((category) => category.id === "dairy");
    const groceries = analytics.topCategories.find(
      (category) => category.id === "groceries",
    );
    const dairyTotal = roundMoney(usdToRub(5) + eurToRub(7));

    expect(dairy).toMatchObject({
      averageItemPrice: roundMoney(dairyTotal / 2),
      itemCount: 2,
      name: "Dairy",
      totalAmount: dairyTotal,
    });
    expect(groceries).toMatchObject({
      averageItemPrice: gbpToRub(10),
      itemCount: 1,
      name: "Groceries",
      totalAmount: gbpToRub(10),
    });
  });

  it("uses receipt dates for current-month filtering and all-time analytics", () => {
    const snapshot = createItemAnalyticsSnapshot();
    const currentMonth = buildReceiptItemAnalytics(snapshot, {
      monthKey: "2026-06",
      period: "current_month",
    });
    const allTime = buildReceiptItemAnalytics(snapshot, {
      monthKey: "2026-06",
      period: "all_time",
    });

    expect(currentMonth.totalAmount).toBe(usdToRub(5));
    expect(currentMonth.itemCount).toBe(1);
    expect(allTime.totalAmount).toBe(
      roundMoney(usdToRub(5) + eurToRub(7) + gbpToRub(10)),
    );
    expect(allTime.itemCount).toBe(3);
  });

  it("keeps receipt item analytics separate from monthly transaction spend", () => {
    const snapshot = createItemAnalyticsSnapshot();

    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    expect(overview.monthlySpend).toBe(usdToRub(100));
    expect(overview.itemAnalytics.current_month.totalAmount).toBe(usdToRub(5));
    expect(overview.categorySpend[0]).toMatchObject({
      amount: usdToRub(100),
      id: "groceries",
    });
  });

  it("filters item analytics by normalized and raw item names", () => {
    const snapshot = createItemAnalyticsSnapshot();
    const baseReceipt = snapshot.receipts[0];
    const baseItem = snapshot.receiptItems[0];

    snapshot.receipts.push({
      ...baseReceipt,
      currency: "USD",
      date: "2026-06-12",
      id: "receipt-confirmed-june-organic",
      status: "confirmed",
    });
    snapshot.receiptItems.push({
      ...baseItem,
      categoryId: "dairy",
      id: "item-june-organic-milk",
      normalizedName: "milk",
      rawName: "Organic whole milk",
      receiptId: "receipt-confirmed-june-organic",
      tags: ["dairy"],
      totalPrice: 4,
    });

    const analytics = buildReceiptItemAnalytics(snapshot, {
      monthKey: "2026-06",
      period: "current_month",
    });
    const normalizedSearch = filterReceiptItemAnalytics(analytics, {
      searchQuery: "milk",
    });
    const rawSearch = filterReceiptItemAnalytics(analytics, {
      searchQuery: "organic",
    });

    expect(normalizedSearch.itemCount).toBe(2);
    expect(normalizedSearch.totalAmount).toBe(usdToRub(9));
    expect(rawSearch.itemCount).toBe(1);
    expect(rawSearch.details[0]).toMatchObject({
      normalizedName: "milk",
      rawName: "Organic whole milk",
    });
  });

  it("filters item analytics by category", () => {
    const analytics = buildReceiptItemAnalytics(createItemAnalyticsSnapshot(), {
      monthKey: "2026-06",
      period: "all_time",
    });

    const dairy = filterReceiptItemAnalytics(analytics, {
      categoryId: "dairy",
    });

    expect(dairy.itemCount).toBe(2);
    expect(dairy.totalAmount).toBe(roundMoney(usdToRub(5) + eurToRub(7)));
    expect(dairy.topCategories).toHaveLength(1);
    expect(dairy.topCategories[0]).toMatchObject({
      id: "dairy",
      name: "Dairy",
    });
    expect(dairy.details.every((detail) => detail.categoryId === "dairy")).toBe(
      true,
    );
  });

  it("keeps item detail conversion display-only", () => {
    const snapshot = createItemAnalyticsSnapshot();
    const originalReceipts = structuredClone(snapshot.receipts);
    const originalItems = structuredClone(snapshot.receiptItems);

    const analytics = buildReceiptItemAnalytics(snapshot, {
      monthKey: "2026-06",
      period: "current_month",
    });
    const detail = analytics.details[0];

    expect(detail).toMatchObject({
      displayAmount: usdToRub(5),
      merchant: "Green Market",
      normalizedName: "milk",
      originalAmount: 5,
      originalCurrency: "USD",
      rawName: "Milk",
      receiptDate: "2026-06-08",
    });
    expect(snapshot.receipts).toEqual(originalReceipts);
    expect(snapshot.receiptItems).toEqual(originalItems);
  });
});

function usdToRub(amount: number): number {
  return convertMoney(amount, "USD", "RUB", defaultCurrencySettings);
}

function eurToRub(amount: number): number {
  return convertMoney(amount, "EUR", "RUB", defaultCurrencySettings);
}

function gbpToRub(amount: number): number {
  return convertMoney(amount, "GBP", "RUB", defaultCurrencySettings);
}

function sumUsdToRub(amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, amount) => sum + usdToRub(amount), 0));
}

function createItemAnalyticsSnapshot(): FinanceSnapshot {
  const snapshot = createSeedFinanceSnapshot();
  const baseReceipt = snapshot.receipts[0];
  const baseItem = snapshot.receiptItems[0];

  snapshot.transactions = [
    {
      ...snapshot.transactions[0],
      amount: 100,
      currency: "USD",
      date: "2026-06-08",
      id: "tx-confirmed-june",
      receiptId: "receipt-confirmed-june",
      source: "receipt",
    },
  ];
  snapshot.receipts = [
    {
      ...baseReceipt,
      currency: "USD",
      date: "2026-06-08",
      id: "receipt-confirmed-june",
      status: "confirmed",
    },
    {
      ...baseReceipt,
      currency: "EUR",
      date: "2026-05-31",
      id: "receipt-confirmed-may",
      status: "confirmed",
    },
    {
      ...baseReceipt,
      currency: "USD",
      date: "2026-06-09",
      id: "receipt-needs-review",
      status: "needs_review",
    },
    {
      ...baseReceipt,
      currency: "GBP",
      date: undefined,
      id: "receipt-confirmed-no-date",
      status: "confirmed",
    },
  ];
  snapshot.receiptItems = [
    {
      ...baseItem,
      categoryId: "dairy",
      id: "item-june-milk",
      normalizedName: "milk",
      rawName: "Milk",
      receiptId: "receipt-confirmed-june",
      tags: ["dairy"],
      totalPrice: 5,
    },
    {
      ...baseItem,
      categoryId: "dairy",
      id: "item-may-milk",
      normalizedName: "milk",
      rawName: "Milk",
      receiptId: "receipt-confirmed-may",
      tags: ["dairy"],
      totalPrice: 7,
    },
    {
      ...baseItem,
      categoryId: "groceries",
      id: "item-review-coffee",
      normalizedName: "coffee",
      rawName: "Coffee",
      receiptId: "receipt-needs-review",
      tags: ["groceries"],
      totalPrice: 999,
    },
    {
      ...baseItem,
      categoryId: "groceries",
      id: "item-no-date-tea",
      normalizedName: "tea",
      rawName: "Tea",
      receiptId: "receipt-confirmed-no-date",
      tags: ["groceries"],
      totalPrice: 10,
    },
  ];
  snapshot.recurringExpenses = [];

  return snapshot;
}
