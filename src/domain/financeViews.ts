import {
  type Category,
  type FinanceSnapshot,
  type Receipt,
  type ReceiptItem,
  type RecurringExpense,
  type Transaction,
} from "./models";

export interface CategorySpend {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface MerchantSpend {
  merchant: string;
  amount: number;
}

export interface ProductSpend {
  id: string;
  name: string;
  amount: number;
  tag: string;
}

export interface FinanceOverview {
  monthKey: string;
  monthlySpend: number;
  recurringMonthlyTotal: number;
  pendingReceiptCount: number;
  categorySpend: CategorySpend[];
  merchantSpend: MerchantSpend[];
  topProducts: ProductSpend[];
  recentTransactions: Transaction[];
  recentReceipts: Receipt[];
  recurringExpenses: RecurringExpense[];
}

interface OverviewOptions {
  monthKey?: string;
}

const fallbackCategory: Category = {
  id: "uncategorized",
  name: "Uncategorized",
  type: "expense",
  color: "#64748b",
  icon: "circle",
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function buildFinanceOverview(
  snapshot: FinanceSnapshot,
  options: OverviewOptions = {},
): FinanceOverview {
  const monthKey = options.monthKey ?? getCurrentMonthKey();
  const monthTransactions = snapshot.transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  );

  return {
    monthKey,
    monthlySpend: roundMoney(sumAmounts(monthTransactions)),
    recurringMonthlyTotal: roundMoney(
      snapshot.recurringExpenses
        .filter((expense) => expense.status === "active")
        .reduce((sum, expense) => sum + toMonthlyRecurringAmount(expense), 0),
    ),
    pendingReceiptCount: snapshot.receipts.filter(
      (receipt) => receipt.status !== "confirmed",
    ).length,
    categorySpend: getCategorySpend(monthTransactions, snapshot.categories),
    merchantSpend: getMerchantSpend(monthTransactions),
    topProducts: getTopProducts(snapshot.receiptItems),
    recentTransactions: sortByDateDesc(snapshot.transactions).slice(0, 4),
    recentReceipts: sortReceiptsByDateDesc(snapshot.receipts).slice(0, 4),
    recurringExpenses: sortRecurringByDueDate(snapshot.recurringExpenses),
  };
}

export function getCategorySpend(
  transactions: Transaction[],
  categories: Category[],
): CategorySpend[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    const categoryId = transaction.categoryId ?? fallbackCategory.id;
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + transaction.amount);
  });

  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId) ?? fallbackCategory;

      return {
        id: category.id,
        name: category.name,
        amount: roundMoney(amount),
        color: category.color ?? fallbackCategory.color ?? "#64748b",
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

export function getMerchantSpend(transactions: Transaction[]): MerchantSpend[] {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    totals.set(
      transaction.merchant,
      (totals.get(transaction.merchant) ?? 0) + transaction.amount,
    );
  });

  return [...totals.entries()]
    .map(([merchant, amount]) => ({ merchant, amount: roundMoney(amount) }))
    .sort((left, right) => right.amount - left.amount);
}

export function getTopProducts(items: ReceiptItem[]): ProductSpend[] {
  const totals = new Map<string, ProductSpend>();

  items.forEach((item) => {
    const current = totals.get(item.normalizedName);
    const tag = item.tags[0] ?? "item";

    totals.set(item.normalizedName, {
      id: item.normalizedName,
      name: item.rawName,
      amount: roundMoney((current?.amount ?? 0) + item.totalPrice),
      tag: current?.tag ?? tag,
    });
  });

  return [...totals.values()].sort((left, right) => right.amount - left.amount);
}

export function toMonthlyRecurringAmount(expense: RecurringExpense): number {
  if (expense.frequency === "weekly") {
    return roundMoney(expense.amount * 52 / 12);
  }

  if (expense.frequency === "yearly") {
    return roundMoney(expense.amount / 12);
  }

  return roundMoney(expense.amount);
}

function sumAmounts(transactions: Transaction[]): number {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
}

function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => right.date.localeCompare(left.date));
}

function sortReceiptsByDateDesc(receipts: Receipt[]): Receipt[] {
  return [...receipts].sort((left, right) =>
    (right.date ?? "").localeCompare(left.date ?? ""),
  );
}

function sortRecurringByDueDate(
  recurringExpenses: RecurringExpense[],
): RecurringExpense[] {
  return [...recurringExpenses].sort((left, right) =>
    left.nextDueDate.localeCompare(right.nextDueDate),
  );
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

