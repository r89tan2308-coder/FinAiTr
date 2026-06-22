import { convertMoney, roundMoney } from "./currencySettings";
import { toMonthlyRecurringAmount } from "./financeViews";
import type {
  Account,
  Category,
  CurrencyCode,
  FinanceSnapshot,
  Receipt,
  ReceiptDraftSourceMetadata,
  RecurringExpense,
  SupportedCurrencyCode,
  Transaction,
} from "./models";

export const localCsvExportKinds = [
  "transactions",
  "confirmed_receipt_items",
  "recurring_expenses",
] as const;

export type LocalCsvExportKind = (typeof localCsvExportKinds)[number];

export interface LocalCsvExport {
  content: string;
  exportedAt: string;
  filename: string;
  kind: LocalCsvExportKind;
  rowCount: number;
}

interface LocalCsvExportOptions {
  exportedAt?: string;
}

type CsvPrimitive = boolean | number | string | undefined;

interface CsvTable {
  filenameStem: string;
  headers: string[];
  rows: CsvPrimitive[][];
}

const transactionHeaders = [
  "transaction_id",
  "date",
  "merchant",
  "description",
  "account_id",
  "account_name",
  "category_id",
  "category_name",
  "source",
  "receipt_id",
  "amount",
  "currency",
  "display_amount",
  "display_currency",
  "tags",
  "created_at",
  "updated_at",
];

const confirmedReceiptItemHeaders = [
  "receipt_item_id",
  "receipt_id",
  "receipt_date",
  "merchant",
  "receipt_source",
  "source_kind",
  "source_id",
  "source_title",
  "source_sender",
  "source_url",
  "source_received_at",
  "source_provider",
  "source_model",
  "item_raw_name",
  "item_normalized_name",
  "category_id",
  "category_name",
  "quantity",
  "unit_price",
  "total_price",
  "currency",
  "display_total",
  "display_currency",
  "tags",
  "flags",
  "confidence",
];

const recurringExpenseHeaders = [
  "recurring_id",
  "name",
  "merchant",
  "account_id",
  "account_name",
  "category_id",
  "category_name",
  "status",
  "frequency",
  "next_due_date",
  "amount",
  "currency",
  "monthly_amount",
  "display_monthly_amount",
  "display_currency",
  "tags",
  "note",
  "created_at",
  "updated_at",
];

export function buildLocalCsvExport(
  snapshot: FinanceSnapshot,
  kind: LocalCsvExportKind,
  options: LocalCsvExportOptions = {},
): LocalCsvExport {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const table = buildCsvTable(snapshot, kind);

  return {
    content: serializeCsv([table.headers, ...table.rows]),
    exportedAt,
    filename: `finaitr-${table.filenameStem}-${safeTimestamp(exportedAt)}.csv`,
    kind,
    rowCount: table.rows.length,
  };
}

export function serializeCsv(rows: ReadonlyArray<ReadonlyArray<CsvPrimitive>>): string {
  return `${rows.map((row) => row.map(formatCsvValue).join(",")).join("\r\n")}\r\n`;
}

function buildCsvTable(
  snapshot: FinanceSnapshot,
  kind: LocalCsvExportKind,
): CsvTable {
  if (kind === "transactions") {
    return {
      filenameStem: "transactions",
      headers: transactionHeaders,
      rows: buildTransactionRows(snapshot),
    };
  }

  if (kind === "confirmed_receipt_items") {
    return {
      filenameStem: "confirmed-receipt-items",
      headers: confirmedReceiptItemHeaders,
      rows: buildConfirmedReceiptItemRows(snapshot),
    };
  }

  return {
    filenameStem: "recurring-expenses",
    headers: recurringExpenseHeaders,
    rows: buildRecurringExpenseRows(snapshot),
  };
}

function buildTransactionRows(snapshot: FinanceSnapshot): CsvPrimitive[][] {
  const accountMap = buildRecordMap(snapshot.accounts);
  const categoryMap = buildRecordMap(snapshot.categories);
  const displayCurrency = snapshot.currencySettings.displayCurrency;

  return [...snapshot.transactions]
    .sort(compareTransactions)
    .map((transaction) => [
      transaction.id,
      transaction.date,
      transaction.merchant,
      transaction.description,
      transaction.accountId,
      accountName(accountMap, transaction.accountId),
      transaction.categoryId,
      categoryName(categoryMap, transaction.categoryId),
      transaction.source,
      transaction.receiptId,
      numberValue(transaction.amount),
      transaction.currency,
      displayAmount(
        transaction.amount,
        transaction.currency,
        displayCurrency,
        snapshot,
      ),
      displayCurrency,
      listValue(transaction.tags),
      transaction.createdAt,
      transaction.updatedAt,
    ]);
}

function buildConfirmedReceiptItemRows(snapshot: FinanceSnapshot): CsvPrimitive[][] {
  const categoryMap = buildRecordMap(snapshot.categories);
  const confirmedReceipts = new Map(
    snapshot.receipts
      .filter((receipt) => receipt.status === "confirmed")
      .map((receipt) => [receipt.id, receipt] as const),
  );
  const displayCurrency = snapshot.currencySettings.displayCurrency;

  return [...snapshot.receiptItems]
    .map((item) => ({
      item,
      receipt: confirmedReceipts.get(item.receiptId),
    }))
    .filter(
      (entry): entry is {
        item: (typeof snapshot.receiptItems)[number];
        receipt: Receipt;
      } => Boolean(entry.receipt),
    )
    .sort((left, right) => compareReceiptItems(left.receipt, left.item.id, right.receipt, right.item.id))
    .map(({ item, receipt }) => {
      const sourceMetadata = receipt.sourceMetadata;

      return [
        item.id,
        item.receiptId,
        receipt.date,
        receipt.merchant,
        receipt.source,
        sourceMetadata?.kind,
        sourceMetadata?.sourceId,
        sourceMetadata?.title,
        sourceMetadata?.sender,
        sourceMetadata?.url,
        sourceMetadata?.receivedAt,
        providerValue(sourceMetadata),
        sourceMetadata?.modelName,
        item.rawName,
        item.normalizedName,
        item.categoryId,
        categoryName(categoryMap, item.categoryId),
        numberValue(item.quantity),
        numberValue(item.unitPrice),
        numberValue(item.totalPrice),
        receipt.currency,
        displayAmount(
          item.totalPrice,
          receipt.currency,
          displayCurrency,
          snapshot,
        ),
        displayCurrency,
        listValue(item.tags),
        listValue(item.flags),
        numberValue(item.confidence),
      ];
    });
}

function buildRecurringExpenseRows(snapshot: FinanceSnapshot): CsvPrimitive[][] {
  const accountMap = buildRecordMap(snapshot.accounts);
  const categoryMap = buildRecordMap(snapshot.categories);
  const displayCurrency = snapshot.currencySettings.displayCurrency;

  return [...snapshot.recurringExpenses]
    .sort(compareRecurringExpenses)
    .map((expense) => {
      const monthlyAmount = toMonthlyRecurringAmount(expense);

      return [
        expense.id,
        expense.name,
        expense.merchant,
        expense.accountId,
        accountName(accountMap, expense.accountId),
        expense.categoryId,
        categoryName(categoryMap, expense.categoryId),
        expense.status,
        expense.frequency,
        expense.nextDueDate,
        numberValue(expense.amount),
        expense.currency,
        numberValue(monthlyAmount),
        displayAmount(monthlyAmount, expense.currency, displayCurrency, snapshot),
        displayCurrency,
        listValue(expense.tags),
        expense.note,
        expense.createdAt,
        expense.updatedAt,
      ];
    });
}

function buildRecordMap<T extends Account | Category>(
  records: T[],
): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

function accountName(
  accountMap: Map<string, Account>,
  accountId: string | undefined,
): string {
  return accountId ? accountMap.get(accountId)?.name ?? accountId : "";
}

function categoryName(
  categoryMap: Map<string, Category>,
  categoryId: string | undefined,
): string {
  return categoryId ? categoryMap.get(categoryId)?.name ?? categoryId : "Uncategorized";
}

function displayAmount(
  amount: number,
  sourceCurrency: CurrencyCode,
  displayCurrency: SupportedCurrencyCode,
  snapshot: FinanceSnapshot,
): string {
  return numberValue(
    convertMoney(amount, sourceCurrency, displayCurrency, snapshot.currencySettings),
  );
}

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(roundMoney(value));
}

function listValue(items: string[]): string {
  return items.join("; ");
}

function providerValue(
  metadata: ReceiptDraftSourceMetadata | undefined,
): string | undefined {
  return metadata?.providerName;
}

function formatCsvValue(value: CsvPrimitive): string {
  const text = value === undefined ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function compareTransactions(left: Transaction, right: Transaction): number {
  return left.date.localeCompare(right.date) || left.id.localeCompare(right.id);
}

function compareReceiptItems(
  leftReceipt: Receipt,
  leftItemId: string,
  rightReceipt: Receipt,
  rightItemId: string,
): number {
  return (
    (leftReceipt.date ?? "").localeCompare(rightReceipt.date ?? "") ||
    leftReceipt.id.localeCompare(rightReceipt.id) ||
    leftItemId.localeCompare(rightItemId)
  );
}

function compareRecurringExpenses(
  left: RecurringExpense,
  right: RecurringExpense,
): number {
  return left.nextDueDate.localeCompare(right.nextDueDate) || left.id.localeCompare(right.id);
}

function safeTimestamp(exportedAt: string): string {
  return exportedAt.replace(/[:.]/g, "-");
}
