export type ISODateString = string;
export type ISODateTimeString = string;
export type CurrencyCode = string;
export type SupportedCurrencyCode = "USD" | "RUB" | "EUR" | "GBP";

export interface CurrencySettings {
  displayCurrency: SupportedCurrencyCode;
  ratesToRub: Record<SupportedCurrencyCode, number>;
  source: string;
  updatedAt: ISODateTimeString;
}

export type AccountType =
  | "cash"
  | "debit_card"
  | "credit_card"
  | "bank_mock"
  | "other";

export type TransactionSource =
  | "manual"
  | "receipt"
  | "csv_import"
  | "adjustment";

export type ReceiptStatus = "draft" | "needs_review" | "confirmed" | "rejected";

export type ReceiptSource =
  | "pasted_text"
  | "manual_upload_mock"
  | "ai_extraction_mock";

export type ReceiptDraftStatus = "draft" | "reviewed" | "confirmed";

export type ReceiptDraftSourceKind =
  | "manual_paste"
  | "gmail"
  | "google_drive"
  | "google_docs";

export interface ReceiptDraftSourceMetadata {
  kind: ReceiptDraftSourceKind;
  sourceId?: string;
  title?: string;
  sender?: string;
  url?: string;
  receivedAt?: ISODateTimeString;
  modifiedAt?: ISODateTimeString;
  fetchedAt?: ISODateTimeString;
  sourceProviderName?: string;
  providerName?: string;
  modelName?: string;
  extractedAt?: ISODateTimeString;
  contentHash?: string;
}

export type ReceiptDraftLineKind =
  | "item"
  | "discount"
  | "fee"
  | "tax"
  | "total"
  | "unclear";

export type ReceiptDraftItemFlag =
  | "low_confidence"
  | "unclear_line"
  | "discount_line"
  | "fee_line"
  | "tax_line"
  | "uncategorized"
  | "quantity_uncertain"
  | "unit_price_uncertain";

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
  sourceMetadata?: ReceiptDraftSourceMetadata;
  transactionId?: string;
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
  flags: ReceiptDraftItemFlag[];
  confidence?: number;
}

export interface ReceiptDraft {
  id: string;
  date?: ISODateString;
  merchant?: string;
  total?: number;
  currency: CurrencyCode;
  rawText: string;
  status: ReceiptDraftStatus;
  source: ReceiptSource;
  sourceMetadata?: ReceiptDraftSourceMetadata;
  confidence: number;
  warnings: string[];
  confirmedReceiptId?: string;
  linkedTransactionId?: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ReceiptDraftItem {
  id: string;
  draftId: string;
  rawLine: string;
  rawName: string;
  normalizedName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  categoryId: string;
  tags: string[];
  confidence: number;
  flags: ReceiptDraftItemFlag[];
  kind: ReceiptDraftLineKind;
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
  note?: string;
  status: RecurringStatus;
  tags: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface FinanceSnapshot {
  accounts: Account[];
  currencySettings: CurrencySettings;
  transactions: Transaction[];
  receipts: Receipt[];
  receiptItems: ReceiptItem[];
  receiptDrafts: ReceiptDraft[];
  receiptDraftItems: ReceiptDraftItem[];
  categories: Category[];
  recurringExpenses: RecurringExpense[];
}
