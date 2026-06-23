import { isSupportedCurrencyCode, roundMoney } from "./currencySettings";
import type { Account, Category, FinanceSnapshot } from "./models";
import type { TransactionInput } from "./transactionValidation";

export interface TransactionCsvImportRowInput extends TransactionInput {
  categoryId: string;
}

export interface TransactionCsvImportPreviewRow {
  errors: string[];
  input?: TransactionCsvImportRowInput;
  isDuplicate: boolean;
  rowNumber: number;
  values: Record<string, string>;
  warnings: string[];
}

export interface TransactionCsvImportPreview {
  canImport: boolean;
  duplicateCount: number;
  errorCount: number;
  fileErrors: string[];
  headers: string[];
  importableRows: TransactionCsvImportRowInput[];
  rowCount: number;
  rows: TransactionCsvImportPreviewRow[];
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
  date: ["date"],
  description: ["description", "note", "notes"],
  merchant: ["merchant", "payee", "vendor"],
  tags: ["tags"],
} as const;

export function buildTransactionCsvImportPreview(
  rawCsv: string,
  snapshot: FinanceSnapshot,
): TransactionCsvImportPreview {
  const parsed = parseCsvSafely(rawCsv);

  if ("fileErrors" in parsed) {
    return emptyPreview(parsed.fileErrors);
  }

  const accountLookup = buildAccountLookup(snapshot.accounts);
  const categoryLookup = buildCategoryLookup(snapshot.categories);
  const existingDuplicateKeys = new Set(
    snapshot.transactions.map((transaction) =>
      buildDuplicateKey({
        accountId: transaction.accountId,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        merchant: transaction.merchant,
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
    rows.length === 0 ? ["CSV file does not contain transaction rows."] : [];

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
): TransactionCsvImportPreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const date = readField(record.values, headerAliases.date);
  const rawAmount = readField(record.values, headerAliases.amount);
  const currency = readField(record.values, headerAliases.currency).toUpperCase();
  const merchant = readField(record.values, headerAliases.merchant);
  const description = readField(record.values, headerAliases.description);
  const account = resolveRecord(
    accountLookup,
    readField(record.values, headerAliases.accountId),
    readField(record.values, headerAliases.accountName),
    "account",
  );
  const category = resolveRecord(
    categoryLookup,
    readField(record.values, headerAliases.categoryId),
    readField(record.values, headerAliases.categoryName),
    "category",
  );
  const amount = Number(rawAmount);

  if (!date) {
    errors.push("Date is required.");
  } else if (!isValidIsoDate(date)) {
    errors.push("Date must be a valid YYYY-MM-DD value.");
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

  if (!merchant && !description) {
    errors.push("Merchant or description is required.");
  }

  if (!account.record) {
    errors.push(account.errorMessage);
  }

  if (!category.record) {
    errors.push(category.errorMessage);
  }

  const accountRecord = account.record;
  const categoryRecord = category.record;

  if (errors.length > 0 || !accountRecord || !categoryRecord) {
    return {
      errors,
      isDuplicate: false,
      rowNumber: record.rowNumber,
      values: record.values,
      warnings,
    };
  }

  const input: TransactionCsvImportRowInput = {
    accountId: accountRecord.id,
    amount: roundMoney(amount),
    categoryId: categoryRecord.id,
    currency,
    date,
    description: description || undefined,
    merchant: merchant || description,
    tags: parseCsvTags(readField(record.values, headerAliases.tags)),
  };
  const duplicateKey = buildDuplicateKey(input);
  const existingDuplicate = existingDuplicateKeys.has(duplicateKey);
  const importDuplicate = importDuplicateKeys.has(duplicateKey);

  if (existingDuplicate) {
    warnings.push("Likely duplicate of an existing transaction.");
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
          "CSV header row must include date, amount, currency, merchant or description, account, and category fields.",
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

function hasRequiredHeaders(headers: string[]): boolean {
  const headerSet = new Set(headers);
  const hasAny = (aliases: readonly string[]) =>
    aliases.some((alias) => headerSet.has(alias));

  return (
    hasAny(headerAliases.date) &&
    hasAny(headerAliases.amount) &&
    hasAny(headerAliases.currency) &&
    (hasAny(headerAliases.merchant) || hasAny(headerAliases.description)) &&
    (hasAny(headerAliases.accountId) || hasAny(headerAliases.accountName)) &&
    (hasAny(headerAliases.categoryId) || hasAny(headerAliases.categoryName))
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
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  merchant: string;
}): string {
  return [
    input.date,
    roundMoney(input.amount).toFixed(2),
    input.currency.trim().toUpperCase(),
    normalizeLookupKey(input.merchant),
    input.accountId,
  ].join("|");
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

function emptyPreview(fileErrors: string[]): TransactionCsvImportPreview {
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
