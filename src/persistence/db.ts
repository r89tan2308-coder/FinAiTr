import Dexie, { type Table } from "dexie";
import {
  type Account,
  type Category,
  type Receipt,
  type ReceiptItem,
  type RecurringExpense,
  type Transaction,
} from "../domain/models";

export interface AppMetaRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  receipts!: Table<Receipt, string>;
  receiptItems!: Table<ReceiptItem, string>;
  recurringExpenses!: Table<RecurringExpense, string>;
  appMeta!: Table<AppMetaRecord, string>;

  constructor() {
    super("finaitr-local");

    this.version(1).stores({
      accounts: "id, name, type, currency, isArchived",
      categories: "id, name, parentId, type",
      transactions:
        "id, date, merchant, accountId, categoryId, source, receiptId, *tags",
      receipts: "id, date, merchant, status, source",
      receiptItems: "id, receiptId, categoryId, normalizedName, *tags",
      recurringExpenses:
        "id, name, merchant, status, nextDueDate, categoryId, accountId",
      appMeta: "key",
    });
  }
}

export const financeDb = new FinanceDatabase();

export function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

