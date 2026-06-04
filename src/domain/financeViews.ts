import {
  convertMoney,
  defaultCurrencySettings,
  roundMoney,
} from "./currencySettings";
import {
  type Category,
  type CurrencyCode,
  type CurrencySettings,
  type FinanceSnapshot,
  type ISODateString,
  type Receipt,
  type ReceiptDraftItemFlag,
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

export type ItemAnalyticsPeriod = "current_month" | "all_time";

export interface ReceiptItemAnalyticsItem {
  id: string;
  name: string;
  totalAmount: number;
  itemCount: number;
  averageItemPrice: number;
  categoryId: string;
  categoryName: string;
}

export interface ReceiptItemAnalyticsDetail {
  id: string;
  itemId: string;
  receiptId: string;
  receiptDate?: ISODateString;
  merchant?: string;
  rawName: string;
  normalizedName: string;
  quantity?: number;
  unitPrice?: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  originalAmount: number;
  originalCurrency: CurrencyCode;
  displayAmount: number;
  flags: ReceiptDraftItemFlag[];
}

export interface ReceiptItemCategoryAnalytics {
  id: string;
  name: string;
  totalAmount: number;
  itemCount: number;
  averageItemPrice: number;
  color: string;
}

export interface ReceiptItemAnalyticsSummary {
  averageItemPrice: number;
  details: ReceiptItemAnalyticsDetail[];
  itemCount: number;
  monthKey?: string;
  period: ItemAnalyticsPeriod;
  topCategories: ReceiptItemCategoryAnalytics[];
  topItems: ReceiptItemAnalyticsItem[];
  totalAmount: number;
}

export interface ReceiptItemAnalyticsFilters {
  categoryId?: string;
  searchQuery?: string;
}

export interface FinanceOverview {
  displayCurrency: CurrencySettings["displayCurrency"];
  monthKey: string;
  monthlySpend: number;
  recurringMonthlyTotal: number;
  pendingReceiptCount: number;
  categorySpend: CategorySpend[];
  itemAnalytics: Record<ItemAnalyticsPeriod, ReceiptItemAnalyticsSummary>;
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
  const currencySettings = snapshot.currencySettings ?? defaultCurrencySettings;
  const displayCurrency = currencySettings.displayCurrency;
  const monthTransactions = snapshot.transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  );
  const currentMonthItemAnalytics = buildReceiptItemAnalytics(snapshot, {
    monthKey,
    period: "current_month",
  });
  const allTimeItemAnalytics = buildReceiptItemAnalytics(snapshot, {
    monthKey,
    period: "all_time",
  });

  return {
    displayCurrency,
    monthKey,
    monthlySpend: roundMoney(sumAmounts(monthTransactions, currencySettings)),
    recurringMonthlyTotal: roundMoney(
      snapshot.recurringExpenses
        .filter((expense) => expense.status === "active")
        .reduce(
          (sum, expense) =>
            sum +
            convertMoney(
              toMonthlyRecurringAmount(expense),
              expense.currency,
              displayCurrency,
              currencySettings,
            ),
          0,
        ),
    ),
    pendingReceiptCount: snapshot.receipts.filter(
      (receipt) => receipt.status !== "confirmed",
    ).length,
    categorySpend: getCategorySpend(
      monthTransactions,
      snapshot.categories,
      currencySettings,
    ),
    itemAnalytics: {
      all_time: allTimeItemAnalytics,
      current_month: currentMonthItemAnalytics,
    },
    merchantSpend: getMerchantSpend(monthTransactions, currencySettings),
    topProducts: currentMonthItemAnalytics.topItems.map((item) => ({
      amount: item.totalAmount,
      id: item.id,
      name: item.name,
      tag: item.categoryName,
    })),
    recentTransactions: sortByDateDesc(snapshot.transactions).slice(0, 4),
    recentReceipts: sortReceiptsByDateDesc(snapshot.receipts).slice(0, 4),
    recurringExpenses: sortRecurringByDueDate(snapshot.recurringExpenses),
  };
}

export function getCategorySpend(
  transactions: Transaction[],
  categories: Category[],
  currencySettings: CurrencySettings = defaultCurrencySettings,
): CategorySpend[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();
  const displayCurrency = currencySettings.displayCurrency;

  transactions.forEach((transaction) => {
    const categoryId = transaction.categoryId ?? fallbackCategory.id;
    totals.set(
      categoryId,
      (totals.get(categoryId) ?? 0) +
        convertMoney(
          transaction.amount,
          transaction.currency,
          displayCurrency,
          currencySettings,
        ),
    );
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

export function getMerchantSpend(
  transactions: Transaction[],
  currencySettings: CurrencySettings = defaultCurrencySettings,
): MerchantSpend[] {
  const totals = new Map<string, number>();
  const displayCurrency = currencySettings.displayCurrency;

  transactions.forEach((transaction) => {
    totals.set(
      transaction.merchant,
      (totals.get(transaction.merchant) ?? 0) +
        convertMoney(
          transaction.amount,
          transaction.currency,
          displayCurrency,
          currencySettings,
        ),
    );
  });

  return [...totals.entries()]
    .map(([merchant, amount]) => ({ merchant, amount: roundMoney(amount) }))
    .sort((left, right) => right.amount - left.amount);
}

export function buildReceiptItemAnalytics(
  snapshot: FinanceSnapshot,
  options: {
    monthKey?: string;
    period?: ItemAnalyticsPeriod;
  } = {},
): ReceiptItemAnalyticsSummary {
  const currencySettings = snapshot.currencySettings ?? defaultCurrencySettings;
  const displayCurrency = currencySettings.displayCurrency;
  const monthKey = options.monthKey ?? getCurrentMonthKey();
  const period = options.period ?? "current_month";
  const categoryMap = new Map(
    snapshot.categories.map((category) => [category.id, category]),
  );
  const confirmedReceiptById = new Map(
    snapshot.receipts
      .filter((receipt) => receipt.status === "confirmed")
      .filter((receipt) =>
        period === "current_month"
          ? Boolean(receipt.date?.startsWith(monthKey))
          : true,
      )
      .map((receipt) => [receipt.id, receipt]),
  );
  const details: ReceiptItemAnalyticsDetail[] = [];

  snapshot.receiptItems.forEach((item) => {
    const receipt = confirmedReceiptById.get(item.receiptId);

    if (!receipt) {
      return;
    }

    const convertedAmount = convertMoney(
      item.totalPrice,
      receipt.currency,
      displayCurrency,
      currencySettings,
    );
    const itemId = getItemAnalyticsId(item);
    const category = categoryMap.get(item.categoryId ?? "") ?? fallbackCategory;
    const categoryColor = category.color ?? fallbackCategory.color ?? "#64748b";

    details.push({
      categoryColor,
      categoryId: category.id,
      categoryName: category.name,
      displayAmount: convertedAmount,
      flags: [...item.flags],
      id: item.id,
      itemId,
      merchant: receipt.merchant,
      normalizedName: item.normalizedName,
      originalAmount: item.totalPrice,
      originalCurrency: receipt.currency,
      quantity: item.quantity,
      rawName: item.rawName,
      receiptDate: receipt.date,
      receiptId: receipt.id,
      unitPrice: item.unitPrice,
    });
  });

  return buildReceiptItemAnalyticsSummaryFromDetails(details, {
    monthKey: period === "current_month" ? monthKey : undefined,
    period,
  });
}

export function filterReceiptItemAnalytics(
  summary: ReceiptItemAnalyticsSummary,
  filters: ReceiptItemAnalyticsFilters = {},
): ReceiptItemAnalyticsSummary {
  const normalizedSearch = normalizeSearchText(filters.searchQuery ?? "");
  const categoryId = filters.categoryId?.trim();
  const filteredDetails = summary.details.filter((detail) => {
    const matchesCategory = !categoryId || detail.categoryId === categoryId;
    const matchesSearch =
      !normalizedSearch ||
      normalizeSearchText(`${detail.normalizedName} ${detail.rawName}`).includes(
        normalizedSearch,
      );

    return matchesCategory && matchesSearch;
  });

  return buildReceiptItemAnalyticsSummaryFromDetails(filteredDetails, {
    monthKey: summary.monthKey,
    period: summary.period,
  });
}

export function getTopProducts(
  items: ReceiptItem[],
  receipts: Receipt[] = [],
  currencySettings: CurrencySettings = defaultCurrencySettings,
): ProductSpend[] {
  const totals = new Map<string, ProductSpend>();
  const displayCurrency = currencySettings.displayCurrency;
  const receiptCurrencyById = new Map(
    receipts
      .filter((receipt) => receipt.status === "confirmed")
      .map((receipt) => [receipt.id, receipt.currency]),
  );

  items.forEach((item) => {
    if (!receiptCurrencyById.has(item.receiptId)) {
      return;
    }

    const current = totals.get(item.normalizedName);
    const tag = item.tags[0] ?? "item";
    const sourceCurrency = receiptCurrencyById.get(item.receiptId) ?? "USD";

    totals.set(item.normalizedName, {
      id: item.normalizedName,
      name: item.rawName,
      amount: roundMoney(
        (current?.amount ?? 0) +
          convertMoney(
            item.totalPrice,
            sourceCurrency,
            displayCurrency,
            currencySettings,
          ),
      ),
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

function sumAmounts(
  transactions: Transaction[],
  currencySettings: CurrencySettings,
): number {
  const displayCurrency = currencySettings.displayCurrency;

  return transactions.reduce(
    (sum, transaction) =>
      sum +
      convertMoney(
        transaction.amount,
        transaction.currency,
        displayCurrency,
        currencySettings,
      ),
    0,
  );
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

function sortItemAnalytics(
  items: ReceiptItemAnalyticsItem[],
): ReceiptItemAnalyticsItem[] {
  return items.sort(
    (left, right) =>
      right.totalAmount - left.totalAmount || left.name.localeCompare(right.name),
  );
}

function sortItemCategoryAnalytics(
  categories: ReceiptItemCategoryAnalytics[],
): ReceiptItemCategoryAnalytics[] {
  return categories.sort(
    (left, right) =>
      right.totalAmount - left.totalAmount || left.name.localeCompare(right.name),
  );
}

function buildReceiptItemAnalyticsSummaryFromDetails(
  details: ReceiptItemAnalyticsDetail[],
  options: {
    monthKey?: string;
    period: ItemAnalyticsPeriod;
  },
): ReceiptItemAnalyticsSummary {
  const itemTotals = new Map<string, ReceiptItemAnalyticsItem>();
  const categoryTotals = new Map<string, ReceiptItemCategoryAnalytics>();
  let totalAmount = 0;

  details.forEach((detail) => {
    const currentItem = itemTotals.get(detail.itemId);
    const currentItemCount = (currentItem?.itemCount ?? 0) + 1;
    const currentItemTotal = roundMoney(
      (currentItem?.totalAmount ?? 0) + detail.displayAmount,
    );
    const currentCategory = categoryTotals.get(detail.categoryId);
    const currentCategoryCount = (currentCategory?.itemCount ?? 0) + 1;
    const currentCategoryTotal = roundMoney(
      (currentCategory?.totalAmount ?? 0) + detail.displayAmount,
    );

    totalAmount += detail.displayAmount;

    itemTotals.set(detail.itemId, {
      averageItemPrice: roundMoney(currentItemTotal / currentItemCount),
      categoryId: currentItem?.categoryId ?? detail.categoryId,
      categoryName: currentItem?.categoryName ?? detail.categoryName,
      id: detail.itemId,
      itemCount: currentItemCount,
      name: currentItem?.name ?? detail.rawName,
      totalAmount: currentItemTotal,
    });

    categoryTotals.set(detail.categoryId, {
      averageItemPrice: roundMoney(currentCategoryTotal / currentCategoryCount),
      color: detail.categoryColor,
      id: detail.categoryId,
      itemCount: currentCategoryCount,
      name: detail.categoryName,
      totalAmount: currentCategoryTotal,
    });
  });

  const roundedTotalAmount = roundMoney(totalAmount);

  return {
    averageItemPrice:
      details.length > 0 ? roundMoney(roundedTotalAmount / details.length) : 0,
    details: sortReceiptItemAnalyticsDetails(details),
    itemCount: details.length,
    monthKey: options.monthKey,
    period: options.period,
    topCategories: sortItemCategoryAnalytics([...categoryTotals.values()]),
    topItems: sortItemAnalytics([...itemTotals.values()]),
    totalAmount: roundedTotalAmount,
  };
}

function getItemAnalyticsId(item: ReceiptItem): string {
  return normalizeSearchText(item.normalizedName || item.rawName) || item.id;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function sortReceiptItemAnalyticsDetails(
  details: ReceiptItemAnalyticsDetail[],
): ReceiptItemAnalyticsDetail[] {
  return [...details].sort(
    (left, right) =>
      (right.receiptDate ?? "").localeCompare(left.receiptDate ?? "") ||
      (left.merchant ?? "").localeCompare(right.merchant ?? "") ||
      left.rawName.localeCompare(right.rawName),
  );
}
