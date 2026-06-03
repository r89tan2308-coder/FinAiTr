export type ISODateString = string;
export type ISODateTimeString = string;
export type CurrencyCode = string;

export type AccountType =
  | "cash"
  | "debit_card"
  | "credit_card"
  | "bank_mock"
  | "other";

export type TransactionSource =
  | "manual"
  | "receipt"
  | "csv_mock"
  | "adjustment";

export type ReceiptStatus = "draft" | "needs_review" | "confirmed" | "rejected";

export type ReceiptSource = "pasted_text" | "manual_upload_mock";

export type CategoryType = "expense" | "income" | "transfer";

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export type RecurringStatus = "active" | "paused" | "cancelled";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: number;
  currentBalance?: number;
  isArchived: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface Transaction {
  id: string;
  date: ISODateString;
  amount: number;
  currency: CurrencyCode;
  merchant: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  source: TransactionSource;
  receiptId?: string;
  tags: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface Receipt {
  id: string;
  date?: ISODateString;
  merchant?: string;
  total?: number;
  currency: CurrencyCode;
  rawText: string;
  status: ReceiptStatus;
  source: ReceiptSource;
  confidence?: number;
  warnings: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ReceiptItem {
  id: string;
  receiptId: string;
  rawName: string;
  normalizedName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  categoryId?: string;
  tags: string[];
  confidence?: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  merchant?: string;
  amount: number;
  currency: CurrencyCode;
  frequency: RecurringFrequency;
  nextDueDate: ISODateString;
  categoryId?: string;
  accountId?: string;
  status: RecurringStatus;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface FinanceSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  receipts: Receipt[];
  receiptItems: ReceiptItem[];
  categories: Category[];
  recurringExpenses: RecurringExpense[];
}

