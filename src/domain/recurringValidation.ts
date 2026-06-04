import {
  type CurrencyCode,
  type RecurringExpense,
  type RecurringFrequency,
} from "./models";

export interface RecurringExpenseInput {
  accountId: string;
  amount: number;
  categoryId?: string;
  currency: CurrencyCode;
  frequency: RecurringFrequency;
  merchant?: string;
  name: string;
  nextDueDate: string;
  note?: string;
  status: "active" | "paused";
  tags: string[];
}

export interface RecurringExpenseFormValues {
  accountId: string;
  amount: string;
  categoryId: string;
  currency: CurrencyCode;
  frequency: RecurringFrequency;
  merchant: string;
  name: string;
  nextDueDate: string;
  note: string;
  status: "active" | "paused";
  tagsText: string;
}

export type RecurringExpenseValidationErrors = Partial<
  Record<keyof RecurringExpenseFormValues, string>
>;

export class RecurringExpenseValidationError extends Error {
  constructor(public readonly errors: RecurringExpenseValidationErrors) {
    super("Recurring expense input is invalid.");
    this.name = "RecurringExpenseValidationError";
  }
}

const validFrequencies: RecurringFrequency[] = ["weekly", "monthly", "yearly"];

export function emptyRecurringExpenseFormValues(defaults: {
  accountId?: string;
  categoryId?: string;
  currency?: CurrencyCode;
} = {}): RecurringExpenseFormValues {
  return {
    accountId: defaults.accountId ?? "",
    amount: "",
    categoryId: defaults.categoryId ?? "",
    currency: defaults.currency ?? "USD",
    frequency: "monthly",
    merchant: "",
    name: "",
    nextDueDate: "",
    note: "",
    status: "active",
    tagsText: "",
  };
}

export function recurringExpenseToFormValues(
  expense: RecurringExpense,
): RecurringExpenseFormValues {
  return {
    accountId: expense.accountId ?? "",
    amount: String(expense.amount),
    categoryId: expense.categoryId ?? "",
    currency: expense.currency,
    frequency: expense.frequency,
    merchant: expense.merchant ?? "",
    name: expense.name,
    nextDueDate: expense.nextDueDate,
    note: expense.note ?? "",
    status: expense.status === "active" ? "active" : "paused",
    tagsText: (expense.tags ?? []).join(", "),
  };
}

export function formValuesToRecurringExpenseInput(
  values: RecurringExpenseFormValues,
): RecurringExpenseInput {
  return {
    accountId: values.accountId,
    amount: Number(values.amount),
    categoryId: values.categoryId || undefined,
    currency: values.currency,
    frequency: values.frequency,
    merchant: values.merchant.trim() || undefined,
    name: values.name,
    nextDueDate: values.nextDueDate,
    note: values.note.trim() || undefined,
    status: values.status,
    tags: values.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export function assertValidRecurringExpenseInput(
  input: RecurringExpenseInput,
): void {
  const errors = validateRecurringExpenseInput(input);

  if (Object.keys(errors).length > 0) {
    throw new RecurringExpenseValidationError(errors);
  }
}

export function validateRecurringExpenseInput(
  input: RecurringExpenseInput,
): RecurringExpenseValidationErrors {
  const errors: RecurringExpenseValidationErrors = {};

  if (!input.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!input.currency.trim()) {
    errors.currency = "Currency is required.";
  }

  if (!input.accountId.trim()) {
    errors.accountId = "Account is required.";
  }

  if (!validFrequencies.includes(input.frequency)) {
    errors.frequency = "Frequency is invalid.";
  }

  if (!isValidIsoDate(input.nextDueDate)) {
    errors.nextDueDate = "Next due date must be a valid date.";
  }

  return errors;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
