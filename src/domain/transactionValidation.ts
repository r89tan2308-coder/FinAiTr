import { type Transaction } from "./models";

export interface TransactionInput {
  date: string;
  amount: number;
  currency: string;
  merchant: string;
  accountId: string;
  categoryId?: string;
  description?: string;
  tags: string[];
}

export type TransactionInputField = keyof TransactionInput;

export type TransactionValidationErrors = Partial<
  Record<TransactionInputField, string>
>;

export interface TransactionValidationResult {
  errors: TransactionValidationErrors;
  isValid: boolean;
}

export interface TransactionFormValues {
  accountId: string;
  amount: string;
  categoryId: string;
  currency: string;
  date: string;
  description: string;
  merchant: string;
  tagsText: string;
}

export function transactionToFormValues(
  transaction: Transaction,
): TransactionFormValues {
  return {
    accountId: transaction.accountId,
    amount: String(transaction.amount),
    categoryId: transaction.categoryId ?? "",
    currency: transaction.currency,
    date: transaction.date,
    description: transaction.description ?? "",
    merchant: transaction.merchant,
    tagsText: transaction.tags.join(", "),
  };
}

export function emptyTransactionFormValues(
  defaults: Partial<TransactionFormValues> = {},
): TransactionFormValues {
  return {
    accountId: "",
    amount: "",
    categoryId: "",
    currency: "USD",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    merchant: "",
    tagsText: "",
    ...defaults,
  };
}

export function formValuesToTransactionInput(
  values: TransactionFormValues,
): TransactionInput {
  const merchant = values.merchant.trim();
  const description = values.description.trim();

  return {
    accountId: values.accountId,
    amount: Number(values.amount),
    categoryId: values.categoryId || undefined,
    currency: values.currency.trim().toUpperCase(),
    date: values.date,
    description: description || undefined,
    merchant: merchant || description,
    tags: parseTags(values.tagsText),
  };
}

export function validateTransactionInput(
  input: TransactionInput,
): TransactionValidationResult {
  const errors: TransactionValidationErrors = {};

  if (!input.date) {
    errors.date = "Date is required.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!input.currency.trim()) {
    errors.currency = "Currency is required.";
  }

  if (!input.merchant.trim() && !input.description?.trim()) {
    errors.merchant = "Merchant or note is required.";
  }

  if (!input.accountId) {
    errors.accountId = "Account is required.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function assertValidTransactionInput(input: TransactionInput): void {
  const validation = validateTransactionInput(input);

  if (!validation.isValid) {
    throw new TransactionValidationError(validation.errors);
  }
}

export class TransactionValidationError extends Error {
  constructor(public readonly errors: TransactionValidationErrors) {
    super("Transaction input is invalid.");
    this.name = "TransactionValidationError";
  }
}

export function parseTags(tagsText: string): string[] {
  return [...new Set(
    tagsText
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  )];
}

