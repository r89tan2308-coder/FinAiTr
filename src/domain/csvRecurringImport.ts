import { isSupportedCurrencyCode, roundMoney } from "./currencySettings";
import type {
  Account,
  Category,
  FinanceSnapshot,
  RecurringFrequency,
  RecurringStatus,
} from "./models";
import type { RecurringExpenseInput } from "./recurringValidation";

export interface RecurringCsvImportRowInput extends RecurringExpenseInput {
  accountId: string;
  status: RecurringStatus;
}

export interface RecurringCsvImportPreviewRow {
  errors: string[];
  input?: RecurringCsvImportRowInput;
  isDuplicate: boolean;
  rowNumber: number;
  values: Record<string, string>;
  warnings: string[];
}

export interface RecurringCsvImportPreview {
  canImport: boolean;
  duplicateCount: number;
  errorCount: number;
  fileErrors: string[];
  headers: string[];
  importableRows: RecurringCsvImportRowInput[];
  rowCount: number;
  rows: RecurringCsvImportPreviewRow[];
  validRowCount: number;
  warningCount: number;
}

interface ParsedCsv {
  headers: string[];
  records: CsvRecord[];
}

interface CsvRecord {
  rowNumber: number;
  values: Record<string, string>;
}

const headerAliases = {
  accountId: ["account_id", "accountid"],
  accountName: ["account_name", "account"],
  amount: ["amount"],
  categoryId: ["category_id", "categoryid"],
  categoryName: ["category_name", "category"],
  currency: ["currency"],
  frequency: ["frequency"],
  merchant: ["merchant", "vendor", "payee"],
  name: ["name", "title"],
  nextDueDate: ["next_due_date", "next_due", "due_date", "date"],
  note: ["note", "description", "notes"],
  status: ["status"],
  tags: ["tags"],
} as const;

const validFrequencies: RecurringFrequency[] = ["weekly", "monthly", "yearly"];
const validStatuses: RecurringStatus[] = ["active", "paused", "cancelled"];

export function buildRecurringCsvImportPreview(
  rawCsv: string,
  snapshot: FinanceSnapshot,
): RecurringCsvImportPreview {
  const parsed = parseCsvSafely(rawCsv);

  if ("fileErrors" in parsed) {
    return emptyPreview(parsed.fileErrors);
  }

  const accountLookup = buildAccountLookup(snapshot.accounts);
  const categoryLookup = buildCategoryLookup(snapshot.categories);
  const existingDuplicateKeys = new Set(
    snapshot.recurringExpenses.map((expense) =>
      buildDuplicateKey({
        amount: expense.amount,
        currency: expense.currency,
        frequency: expense.frequency,
        merchant: expense.merchant ?? expense.note ?? "",
        name: expense.name,
        nextDueDate: expense.nextDueDate,
      }),
    ),
  );
  const importDuplicateKeys = new Set<string>();
  const rows = parsed.records
    .filter((record) => hasAnyValue(record.values))
    .map((record) =>
      buildPreviewRow(
        record,
        accountLookup,
        categoryLookup,
        existingDuplicateKeys,
        importDuplicateKeys,
      ),
    );
  const errorCount = rows.reduce((count, row) => count + row.errors.length, 0);
  const warningCount = rows.reduce(
    (count, row) => count + row.warnings.length,
    0,
  );
  const importableRows = rows.flatMap((row) =>
    row.input && row.errors.length === 0 ? [row.input] : [],
  );
  const fileErrors =
    rows.length === 0 ? ["CSV file does not contain recurring expense rows."] : [];

  return {
    canImport: fileErrors.length === 0 && errorCount === 0 && importableRows.length > 0,
    duplicateCount: rows.filter((row) => row.isDuplicate).length,
    errorCount,
    fileErrors,
    headers: parsed.headers,
    importableRows,
    rowCount: rows.length,
    rows,
    validRowCount: importableRows.length,
    warningCount,
  };
}

function buildPreviewRow(
  record: CsvRecord,
  accountLookup: Map<string, Account>,
  categoryLookup: Map<string, Category>,
  existingDuplicateKeys: Set<string>,
  importDuplicateKeys: Set<string>,
): RecurringCsvImportPreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = readField(record.values, headerAliases.name);
  const merchant = readField(record.values, headerAliases.merchant);
  const note = readField(record.values, headerAliases.note);
  const rawAmount = readField(record.values, headerAliases.amount);
  const currency = readField(record.values, headerAliases.currency).toUpperCase();
  const frequency = readField(record.values, headerAliases.frequency).toLowerCase();
  const nextDueDate = readField(record.values, headerAliases.nextDueDate);
  const rawStatus = readField(record.values, headerAliases.status).toLowerCase();
  const status = rawStatus || "active";
  const account = resolveRecord(
    accountLookup,
    readField(record.values, headerAliases.accountId),
    readField(record.values, headerAliases.accountName),
    "account",
  );
  const category = resolveOptionalRecord(
    categoryLookup,
    readField(record.values, headerAliases.categoryId),
    readField(record.values, headerAliases.categoryName),
    "category",
  );
  const amount = Number(rawAmount);

  if (!name) {
    errors.push("Name is required.");
  }

  if (!rawAmount) {
    errors.push("Amount is required.");
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Amount must be greater than zero.");
  }

  if (!currency) {
    errors.push("Currency is required.");
  } else if (!isSupportedCurrencyCode(currency)) {
    warnings.push(
      "Currency is not in the local FX rate list; display conversion will use the original amount.",
    );
  }

  if (!frequency) {
    errors.push("Frequency is required.");
  } else if (!isRecurringFrequency(frequency)) {
    errors.push("Frequency must be weekly, monthly, or yearly.");
  }

  if (!nextDueDate) {
    errors.push("Next due date is required.");
  } else if (!isValidIsoDate(nextDueDate)) {
    errors.push("Next due date must be a valid YYYY-MM-DD value.");
  }

  if (rawStatus && !isRecurringStatus(status)) {
    errors.push("Status must be active, paused, or cancelled.");
  }

  if (!account.record) {
    errors.push(account.errorMessage);
  }

  if (category.errorMessage) {
    errors.push(category.errorMessage);
  }

  const accountRecord = account.record;

  if (
    errors.length > 0 ||
    !accountRecord ||
    !isRecurringFrequency(frequency) ||
    !isRecurringStatus(status)
  ) {
    return {
      errors,
      isDuplicate: false,
      rowNumber: record.rowNumber,
      values: record.values,
      warnings,
    };
  }

  const input: RecurringCsvImportRowInput = {
    accountId: accountRecord.id,
    amount: roundMoney(amount),
    categoryId: category.record?.id,
    currency,
    frequency,
    merchant: merchant || undefined,
    name,
    nextDueDate,
    note: note || undefined,
    status,
    tags: parseCsvTags(readField(record.values, headerAliases.tags)),
  };
  const duplicateKey = buildDuplicateKey({
    ...input,
    merchant: input.merchant ?? input.note ?? "",
  });
  const existingDuplicate = existingDuplicateKeys.has(duplicateKey);
  const importDuplicate = importDuplicateKeys.has(duplicateKey);

  if (existingDuplicate) {
    warnings.push("Likely duplicate of an existing recurring expense.");
  }

  if (importDuplicate) {
    warnings.push("Likely duplicate of another row in this CSV file.");
  }

  importDuplicateKeys.add(duplicateKey);

  return {
    errors,
    input,
    isDuplicate: existingDuplicate || importDuplicate,
    rowNumber: record.rowNumber,
    values: record.values,
    warnings,
  };
}

function parseCsvSafely(
  rawCsv: string,
): ParsedCsv | { fileErrors: string[] } {
  try {
    const rows = parseCsvRows(rawCsv);

    if (rows.length === 0) {
      return { fileErrors: ["CSV file is empty."] };
    }

    const headers = rows[0].map((header) => normalizeHeader(header));

    if (headers.every((header) => !header)) {
      return { fileErrors: ["CSV header row is empty."] };
    }

    if (!hasRequiredHeaders(headers)) {
      return {
        fileErrors: [
          "CSV header row must include name, amount, currency, frequency, next due date, and account fields.",
        ],
      };
    }

    return {
      headers,
      records: rows.slice(1).map((row, index) => ({
        rowNumber: index + 2,
        values: rowToRecord(headers, row),
      })),
    };
  } catch (error) {
    return {
      fileErrors: [
        error instanceof Error ? error.message : "CSV file could not be parsed.",
      ],
    };
  }
}

function parseCsvRows(rawCsv: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let insideQuotes = false;
  let fieldStartedWithQuote = false;

  for (let index = 0; index < rawCsv.length; index += 1) {
    const char = rawCsv[index];

    if (insideQuotes) {
      if (char === '"') {
        if (rawCsv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      if (field.length === 0 && !fieldStartedWithQuote) {
        insideQuotes = true;
        fieldStartedWithQuote = true;
        continue;
      }

      throw new Error("CSV contains an unescaped quote.");
    }

    if (char === ",") {
      row.push(field);
      field = "";
      fieldStartedWithQuote = false;
      continue;
    }

    if (char === "\r" || char === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      fieldStartedWithQuote = false;

      if (char === "\r" && rawCsv[index + 1] === "\n") {
        index += 1;
      }

      continue;
    }

    if (fieldStartedWithQuote && char.trim() !== "") {
      throw new Error("CSV contains characters after a closing quote.");
    }

    field += char;
  }

  if (insideQuotes) {
    throw new Error("CSV contains an unclosed quoted value.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    if (header) {
      record[header] = (row[index] ?? "").trim();
    }

    return record;
  }, {});
}

function buildAccountLookup(accounts: Account[]): Map<string, Account> {
  const lookup = new Map<string, Account>();

  accounts.forEach((account) => {
    if (!account.isArchived) {
      lookup.set(normalizeLookupKey(account.id), account);
      lookup.set(normalizeLookupKey(account.name), account);
    }
  });

  return lookup;
}

function buildCategoryLookup(categories: Category[]): Map<string, Category> {
  const lookup = new Map<string, Category>();

  categories.forEach((category) => {
    lookup.set(normalizeLookupKey(category.id), category);
    lookup.set(normalizeLookupKey(category.name), category);
  });

  return lookup;
}

function resolveRecord<T>(
  lookup: Map<string, T>,
  idValue: string,
  nameValue: string,
  label: "account" | "category",
): { errorMessage: string; record?: T } {
  const rawValue = idValue || nameValue;
  const record = rawValue ? lookup.get(normalizeLookupKey(rawValue)) : undefined;

  if (record) {
    return {
      errorMessage: "",
      record,
    };
  }

  return {
    errorMessage: rawValue
      ? `Unknown ${label}: ${rawValue}.`
      : `${capitalize(label)} is required.`,
  };
}

function resolveOptionalRecord<T>(
  lookup: Map<string, T>,
  idValue: string,
  nameValue: string,
  label: "category",
): { errorMessage?: string; record?: T } {
  const rawValue = idValue || nameValue;

  if (!rawValue) {
    return {};
  }

  const record = lookup.get(normalizeLookupKey(rawValue));

  if (record) {
    return { record };
  }

  return { errorMessage: `Unknown ${label}: ${rawValue}.` };
}

function hasRequiredHeaders(headers: string[]): boolean {
  const headerSet = new Set(headers);
  const hasAny = (aliases: readonly string[]) =>
    aliases.some((alias) => headerSet.has(alias));

  return (
    hasAny(headerAliases.name) &&
    hasAny(headerAliases.amount) &&
    hasAny(headerAliases.currency) &&
    hasAny(headerAliases.frequency) &&
    hasAny(headerAliases.nextDueDate) &&
    (hasAny(headerAliases.accountId) || hasAny(headerAliases.accountName))
  );
}

function hasAnyValue(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

function readField(
  values: Record<string, string>,
  aliases: readonly string[],
): string {
  for (const alias of aliases) {
    const value = values[alias];

    if (value !== undefined) {
      return value.trim();
    }
  }

  return "";
}

function parseCsvTags(rawTags: string): string[] {
  return [
    ...new Set(
      rawTags
        .split(/[;,]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function buildDuplicateKey(input: {
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  merchant: string;
  name: string;
  nextDueDate: string;
}): string {
  return [
    normalizeLookupKey(input.name),
    normalizeLookupKey(input.merchant),
    roundMoney(input.amount).toFixed(2),
    input.currency.trim().toUpperCase(),
    input.frequency,
    input.nextDueDate,
  ].join("|");
}

function isRecurringFrequency(value: string): value is RecurringFrequency {
  return validFrequencies.includes(value as RecurringFrequency);
}

function isRecurringStatus(value: string): value is RecurringStatus {
  return validStatuses.includes(value as RecurringStatus);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function emptyPreview(fileErrors: string[]): RecurringCsvImportPreview {
  return {
    canImport: false,
    duplicateCount: 0,
    errorCount: 0,
    fileErrors,
    headers: [],
    importableRows: [],
    rowCount: 0,
    rows: [],
    validRowCount: 0,
    warningCount: 0,
  };
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
