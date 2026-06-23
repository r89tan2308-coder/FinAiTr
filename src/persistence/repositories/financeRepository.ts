import { createSeedFinanceSnapshot, seedVersion } from "../../data/seedData";
import {
  assertValidCurrencySettings,
  parseCurrencySettings,
  serializeCurrencySettings,
} from "../../domain/currencySettings";
import { appInfo } from "../../app/appInfo";
import {
  buildLocalCsvExport,
  type LocalCsvExport,
  type LocalCsvExportKind,
} from "../../domain/csvExport";
import { type TransactionCsvImportRowInput } from "../../domain/csvTransactionImport";
import {
  type Category,
  type CurrencyCode,
  type CurrencySettings,
  type FinanceSnapshot,
  type ISODateString,
  type Account,
  type Receipt,
  type ReceiptDraft,
  type ReceiptDraftItem,
  type ReceiptDraftItemFlag,
  type ReceiptDraftLineKind,
  type ReceiptDraftSourceMetadata,
  type ReceiptDraftStatus,
  type ReceiptItem,
  type ReceiptSource,
  type RecurringExpense,
  type SupportedCurrencyCode,
  type Transaction,
} from "../../domain/models";
import {
  assertValidRecurringExpenseInput,
  type RecurringExpenseInput,
} from "../../domain/recurringValidation";
import {
  assertValidTransactionInput,
  type TransactionInput,
} from "../../domain/transactionValidation";
import { canUseIndexedDb, financeDb, type AppMetaRecord } from "../db";

const seedVersionKey = "seedVersion";
const currencySettingsKey = "currencySettings";

export type RepositoryStorageMode = "indexeddb" | "seed_fallback";
export type {
  LocalCsvExport,
  LocalCsvExportKind,
  TransactionCsvImportRowInput,
};

export interface FinanceRepositorySnapshot {
  snapshot: FinanceSnapshot;
  storageMode: RepositoryStorageMode;
}

export const localJsonBackupSchemaVersion = 1;

export interface LocalJsonBackup {
  app: {
    name: string;
    version: string;
  };
  exportedAt: string;
  schemaVersion: typeof localJsonBackupSchemaVersion;
  seedVersion: number;
  storageMode: RepositoryStorageMode;
  tables: {
    accounts: Account[];
    appMeta: AppMetaRecord[];
    categories: Category[];
    receiptDraftItems: ReceiptDraftItem[];
    receiptDrafts: ReceiptDraft[];
    receiptItems: ReceiptItem[];
    receipts: Receipt[];
    recurringExpenses: RecurringExpense[];
    settings: {
      currencySettings: CurrencySettings;
    };
    transactions: Transaction[];
  };
}

export interface LocalJsonRestorePreview {
  app: {
    name: string;
    version: string;
  };
  displayCurrency: SupportedCurrencyCode;
  exportedAt: string;
  recordCounts: {
    accounts: number;
    appMeta: number;
    categories: number;
    receiptDraftItems: number;
    receiptDrafts: number;
    receiptItems: number;
    receipts: number;
    recurringExpenses: number;
    total: number;
    transactions: number;
  };
  schemaVersion: typeof localJsonBackupSchemaVersion;
  seedVersion: number;
  storageMode: RepositoryStorageMode;
  warnings: string[];
}

export interface ReceiptDraftItemInput {
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

export interface ReceiptDraftInput {
  confidence: number;
  currency: CurrencyCode;
  date?: ISODateString;
  items: ReceiptDraftItemInput[];
  merchant?: string;
  rawText: string;
  source?: ReceiptSource;
  sourceMetadata?: ReceiptDraftSourceMetadata;
  status?: ReceiptDraftStatus;
  total?: number;
  warnings: string[];
}

export interface ReceiptDraftItemUpdateInput {
  id: string;
  categoryId: string;
  confidence: number;
  flags: ReceiptDraftItemFlag[];
  kind: ReceiptDraftLineKind;
  normalizedName: string;
  quantity?: number;
  tags: string[];
  totalPrice: number;
  unitPrice?: number;
}

export interface ReceiptDraftUpdateInput {
  currency: CurrencyCode;
  date?: ISODateString;
  items: ReceiptDraftItemUpdateInput[];
  merchant?: string;
  status: ReceiptDraftStatus;
  total?: number;
}

export interface ReceiptDraftRecord {
  draft: ReceiptDraft;
  items: ReceiptDraftItem[];
}

export interface ReceiptDraftConfirmationInput {
  accountId: string;
  categoryId?: string;
}

export interface ReceiptDraftConfirmationRecord {
  draft: ReceiptDraft;
  receipt: Receipt;
  items: ReceiptItem[];
  transaction: Transaction;
}

export async function getFinanceSnapshot(): Promise<FinanceRepositorySnapshot> {
  if (!canUseIndexedDb()) {
    return {
      snapshot: createSeedFinanceSnapshot(),
      storageMode: "seed_fallback",
    };
  }

  await ensureSeedData();

  const [
    accounts,
    categories,
    transactions,
    receipts,
    receiptItems,
    receiptDrafts,
    receiptDraftItems,
    recurringExpenses,
    currencySettingsRecord,
  ] = await Promise.all([
    financeDb.accounts.toArray(),
    financeDb.categories.toArray(),
    financeDb.transactions.toArray(),
    financeDb.receipts.toArray(),
    financeDb.receiptItems.toArray(),
    financeDb.receiptDrafts.toArray(),
    financeDb.receiptDraftItems.toArray(),
    financeDb.recurringExpenses.toArray(),
    financeDb.appMeta.get(currencySettingsKey),
  ]);

  return {
    snapshot: {
      accounts,
      currencySettings: parseCurrencySettings(currencySettingsRecord?.value),
      transactions,
      receipts,
      receiptItems,
      receiptDrafts,
      receiptDraftItems,
      categories,
      recurringExpenses,
    },
    storageMode: "indexeddb",
  };
}

export async function exportLocalJsonBackup(): Promise<LocalJsonBackup> {
  const exportedAt = new Date().toISOString();
  const { snapshot, storageMode } = await getFinanceSnapshot();
  const appMeta = canUseIndexedDb()
    ? await financeDb.appMeta.toArray()
    : seedAppMetaRecords(exportedAt);

  return cloneJsonValue({
    app: appInfo,
    exportedAt,
    schemaVersion: localJsonBackupSchemaVersion,
    seedVersion,
    storageMode,
    tables: {
      accounts: snapshot.accounts,
      appMeta,
      categories: snapshot.categories,
      receiptDraftItems: snapshot.receiptDraftItems,
      receiptDrafts: snapshot.receiptDrafts,
      receiptItems: snapshot.receiptItems,
      receipts: snapshot.receipts,
      recurringExpenses: snapshot.recurringExpenses,
      settings: {
        currencySettings: snapshot.currencySettings,
      },
      transactions: snapshot.transactions,
    },
  });
}

export async function exportLocalCsv(
  kind: LocalCsvExportKind,
): Promise<LocalCsvExport> {
  const { snapshot } = await getFinanceSnapshot();

  return buildLocalCsvExport(snapshot, kind);
}

export async function resetLocalDataToSeed(): Promise<void> {
  assertIndexedDbWritable("local data reset");

  const seed = createSeedFinanceSnapshot();
  const now = new Date().toISOString();

  await financeDb.transaction(
    "rw",
    [
      financeDb.accounts,
      financeDb.categories,
      financeDb.transactions,
      financeDb.receipts,
      financeDb.receiptItems,
      financeDb.receiptDrafts,
      financeDb.receiptDraftItems,
      financeDb.recurringExpenses,
      financeDb.appMeta,
    ],
    async () => {
      await Promise.all([
        financeDb.accounts.clear(),
        financeDb.categories.clear(),
        financeDb.transactions.clear(),
        financeDb.receipts.clear(),
        financeDb.receiptItems.clear(),
        financeDb.receiptDrafts.clear(),
        financeDb.receiptDraftItems.clear(),
        financeDb.recurringExpenses.clear(),
        financeDb.appMeta.clear(),
      ]);

      await Promise.all([
        financeDb.accounts.bulkPut(seed.accounts),
        financeDb.categories.bulkPut(seed.categories),
        financeDb.transactions.bulkPut(seed.transactions),
        financeDb.receipts.bulkPut(seed.receipts),
        financeDb.receiptItems.bulkPut(seed.receiptItems),
        financeDb.receiptDrafts.bulkPut(seed.receiptDrafts),
        financeDb.receiptDraftItems.bulkPut(seed.receiptDraftItems),
        financeDb.recurringExpenses.bulkPut(seed.recurringExpenses),
      ]);

      await financeDb.appMeta.bulkPut(seedAppMetaRecords(now));
    },
  );
}

export function buildLocalJsonRestorePreview(
  backupValue: unknown,
): LocalJsonRestorePreview {
  const backup = validateLocalJsonBackup(backupValue);
  const recordCounts = {
    accounts: backup.tables.accounts.length,
    appMeta: backup.tables.appMeta.length,
    categories: backup.tables.categories.length,
    receiptDraftItems: backup.tables.receiptDraftItems.length,
    receiptDrafts: backup.tables.receiptDrafts.length,
    receiptItems: backup.tables.receiptItems.length,
    receipts: backup.tables.receipts.length,
    recurringExpenses: backup.tables.recurringExpenses.length,
    transactions: backup.tables.transactions.length,
  };

  return {
    app: backup.app,
    displayCurrency: backup.tables.settings.currencySettings.displayCurrency,
    exportedAt: backup.exportedAt,
    recordCounts: {
      ...recordCounts,
      total: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
    },
    schemaVersion: backup.schemaVersion,
    seedVersion: backup.seedVersion,
    storageMode: backup.storageMode,
    warnings: buildRestoreWarnings(backup),
  };
}

export async function restoreLocalJsonBackup(
  backupValue: unknown,
): Promise<void> {
  assertIndexedDbWritable("local JSON backup restore");

  const backup = validateLocalJsonBackup(backupValue);
  const appMeta = appMetaRecordsForRestore(backup);

  await financeDb.transaction(
    "rw",
    [
      financeDb.accounts,
      financeDb.categories,
      financeDb.transactions,
      financeDb.receipts,
      financeDb.receiptItems,
      financeDb.receiptDrafts,
      financeDb.receiptDraftItems,
      financeDb.recurringExpenses,
      financeDb.appMeta,
    ],
    async () => {
      await Promise.all([
        financeDb.accounts.clear(),
        financeDb.categories.clear(),
        financeDb.transactions.clear(),
        financeDb.receipts.clear(),
        financeDb.receiptItems.clear(),
        financeDb.receiptDrafts.clear(),
        financeDb.receiptDraftItems.clear(),
        financeDb.recurringExpenses.clear(),
        financeDb.appMeta.clear(),
      ]);

      await Promise.all([
        financeDb.accounts.bulkPut(cloneJsonValue(backup.tables.accounts)),
        financeDb.categories.bulkPut(cloneJsonValue(backup.tables.categories)),
        financeDb.transactions.bulkPut(
          cloneJsonValue(backup.tables.transactions),
        ),
        financeDb.receipts.bulkPut(cloneJsonValue(backup.tables.receipts)),
        financeDb.receiptItems.bulkPut(
          cloneJsonValue(backup.tables.receiptItems),
        ),
        financeDb.receiptDrafts.bulkPut(
          cloneJsonValue(backup.tables.receiptDrafts),
        ),
        financeDb.receiptDraftItems.bulkPut(
          cloneJsonValue(backup.tables.receiptDraftItems),
        ),
        financeDb.recurringExpenses.bulkPut(
          cloneJsonValue(backup.tables.recurringExpenses),
        ),
      ]);

      await financeDb.appMeta.bulkPut(appMeta);
    },
  );
}

export async function ensureSeedData(): Promise<void> {
  if (!canUseIndexedDb()) {
    return;
  }

  const currentSeed = await financeDb.appMeta.get(seedVersionKey);
  const currentCurrencySettings = await financeDb.appMeta.get(currencySettingsKey);

  if (currentSeed?.value === String(seedVersion)) {
    if (!currentCurrencySettings) {
      const seed = createSeedFinanceSnapshot();
      const now = new Date().toISOString();

      await financeDb.appMeta.put({
        key: currencySettingsKey,
        value: serializeCurrencySettings(seed.currencySettings),
        updatedAt: now,
      });
    }

    return;
  }

  const seed = createSeedFinanceSnapshot();
  const now = new Date().toISOString();
  const currencySettingsValue =
    currentCurrencySettings?.value ?? serializeCurrencySettings(seed.currencySettings);

  await financeDb.transaction(
    "rw",
    [
      financeDb.accounts,
      financeDb.categories,
      financeDb.transactions,
      financeDb.receipts,
      financeDb.receiptItems,
      financeDb.receiptDrafts,
      financeDb.receiptDraftItems,
      financeDb.recurringExpenses,
      financeDb.appMeta,
    ],
    async () => {
      await Promise.all([
        financeDb.accounts.bulkPut(seed.accounts),
        financeDb.categories.bulkPut(seed.categories),
        financeDb.transactions.bulkPut(seed.transactions),
        financeDb.receipts.bulkPut(seed.receipts),
        financeDb.receiptItems.bulkPut(seed.receiptItems),
        financeDb.receiptDrafts.bulkPut(seed.receiptDrafts),
        financeDb.receiptDraftItems.bulkPut(seed.receiptDraftItems),
        financeDb.recurringExpenses.bulkPut(seed.recurringExpenses),
      ]);

      await financeDb.appMeta.put({
        key: seedVersionKey,
        value: String(seedVersion),
        updatedAt: now,
      });

      await financeDb.appMeta.put({
        key: currencySettingsKey,
        value: currencySettingsValue,
        updatedAt: now,
      });
    },
  );
}

export async function updateCurrencySettings(
  settings: CurrencySettings,
): Promise<CurrencySettings> {
  assertIndexedDbWritable("local currency settings writes");
  await ensureSeedData();

  const updatedSettings: CurrencySettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  const serializedSettings = serializeCurrencySettings(updatedSettings);

  await financeDb.appMeta.put({
    key: currencySettingsKey,
    value: serializedSettings,
    updatedAt: updatedSettings.updatedAt,
  });

  return parseCurrencySettings(serializedSettings);
}

export async function addManualTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  assertIndexedDbWritable("local transaction writes");
  assertValidTransactionInput(input);
  await ensureSeedData();

  const now = new Date().toISOString();
  const transaction: Transaction = {
    id: createRecordId("tx"),
    accountId: input.accountId,
    amount: roundMoney(input.amount),
    categoryId: input.categoryId,
    createdAt: now,
    currency: input.currency,
    date: input.date,
    description: input.description,
    merchant: input.merchant.trim(),
    source: "manual",
    tags: input.tags,
    updatedAt: now,
  };

  await financeDb.transactions.put(transaction);

  return transaction;
}

export async function importTransactionCsvRows(
  inputs: TransactionCsvImportRowInput[],
): Promise<Transaction[]> {
  assertIndexedDbWritable("transaction CSV import");

  if (inputs.length === 0) {
    throw new Error("Select at least one valid transaction row before import.");
  }

  inputs.forEach(assertValidTransactionCsvImportInput);
  await ensureSeedData();

  return financeDb.transaction(
    "rw",
    [financeDb.accounts, financeDb.categories, financeDb.transactions],
    async () => {
      const [accounts, categories] = await Promise.all([
        financeDb.accounts.toArray(),
        financeDb.categories.toArray(),
      ]);
      const activeAccountIds = new Set(
        accounts
          .filter((account) => !account.isArchived)
          .map((account) => account.id),
      );
      const categoryIds = new Set(categories.map((category) => category.id));
      const now = new Date().toISOString();
      const transactions = inputs.map((input): Transaction => {
        if (!activeAccountIds.has(input.accountId)) {
          throw new Error(`CSV import account is not available: ${input.accountId}.`);
        }

        if (!categoryIds.has(input.categoryId)) {
          throw new Error(`CSV import category is not available: ${input.categoryId}.`);
        }

        return {
          id: createRecordId("tx-csv"),
          accountId: input.accountId,
          amount: roundMoney(input.amount),
          categoryId: input.categoryId,
          createdAt: now,
          currency: input.currency,
          date: input.date,
          description: input.description?.trim() || undefined,
          merchant: input.merchant.trim() || input.description?.trim() || "",
          source: "csv_import",
          tags: [...input.tags],
          updatedAt: now,
        };
      });

      await financeDb.transactions.bulkAdd(transactions);

      return transactions;
    },
  );
}
export async function updateTransaction(
  transactionId: string,
  input: TransactionInput,
): Promise<Transaction> {
  assertIndexedDbWritable("local transaction writes");
  assertValidTransactionInput(input);
  await ensureSeedData();

  const existing = await financeDb.transactions.get(transactionId);

  if (!existing) {
    throw new Error("Transaction was not found.");
  }

  const updated: Transaction = {
    ...existing,
    accountId: input.accountId,
    amount: roundMoney(input.amount),
    categoryId: input.categoryId,
    currency: input.currency,
    date: input.date,
    description: input.description,
    merchant: input.merchant.trim(),
    tags: input.tags,
    updatedAt: new Date().toISOString(),
  };

  await financeDb.transactions.put(updated);

  return updated;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  assertIndexedDbWritable("local transaction writes");
  await ensureSeedData();
  await financeDb.transactions.delete(transactionId);
}

export async function addRecurringExpense(
  input: RecurringExpenseInput,
): Promise<RecurringExpense> {
  assertIndexedDbWritable("local recurring expense writes");
  assertValidRecurringExpenseInput(input);
  await ensureSeedData();

  const now = new Date().toISOString();
  const recurringExpense: RecurringExpense = {
    id: createRecordId("rec"),
    accountId: normalizeRequiredText(input.accountId, "Account is required."),
    amount: roundMoney(input.amount),
    categoryId: normalizeOptionalText(input.categoryId),
    createdAt: now,
    currency: normalizeRequiredText(input.currency, "Currency is required."),
    frequency: input.frequency,
    merchant: normalizeOptionalText(input.merchant),
    name: normalizeRequiredText(input.name, "Name is required."),
    nextDueDate: input.nextDueDate,
    note: normalizeOptionalText(input.note),
    status: input.status,
    tags: [...input.tags],
    updatedAt: now,
  };

  await financeDb.recurringExpenses.put(recurringExpense);

  return recurringExpense;
}

export async function updateRecurringExpense(
  recurringExpenseId: string,
  input: RecurringExpenseInput,
): Promise<RecurringExpense> {
  assertIndexedDbWritable("local recurring expense writes");
  assertValidRecurringExpenseInput(input);
  await ensureSeedData();

  const existing = await financeDb.recurringExpenses.get(recurringExpenseId);

  if (!existing) {
    throw new Error("Recurring expense was not found.");
  }

  const updated: RecurringExpense = {
    ...existing,
    accountId: normalizeRequiredText(input.accountId, "Account is required."),
    amount: roundMoney(input.amount),
    categoryId: normalizeOptionalText(input.categoryId),
    currency: normalizeRequiredText(input.currency, "Currency is required."),
    frequency: input.frequency,
    merchant: normalizeOptionalText(input.merchant),
    name: normalizeRequiredText(input.name, "Name is required."),
    nextDueDate: input.nextDueDate,
    note: normalizeOptionalText(input.note),
    status: input.status,
    tags: [...input.tags],
    updatedAt: new Date().toISOString(),
  };

  await financeDb.recurringExpenses.put(updated);

  return updated;
}

export async function deleteRecurringExpense(
  recurringExpenseId: string,
): Promise<void> {
  assertIndexedDbWritable("local recurring expense writes");
  await ensureSeedData();
  await financeDb.recurringExpenses.delete(recurringExpenseId);
}

export async function saveReceiptDraft(
  input: ReceiptDraftInput,
): Promise<ReceiptDraftRecord> {
  assertIndexedDbWritable("local receipt draft writes");
  await ensureSeedData();

  if (input.status === "confirmed") {
    throw new Error("Use receipt confirmation to confirm receipt drafts.");
  }

  const now = new Date().toISOString();
  const draftId = createRecordId("receipt-draft");
  const draft: ReceiptDraft = {
    id: draftId,
    confidence: input.confidence,
    currency: input.currency,
    date: input.date,
    merchant: normalizeOptionalText(input.merchant),
    rawText: input.rawText,
    source: input.source ?? "pasted_text",
    sourceMetadata: normalizeReceiptSourceMetadata(input.sourceMetadata),
    status: input.status ?? "draft",
    total: input.total === undefined ? undefined : roundMoney(input.total),
    warnings: [...input.warnings],
    createdAt: now,
    updatedAt: now,
  };
  const items: ReceiptDraftItem[] = input.items.map((item) => ({
    id: createRecordId("receipt-draft-item"),
    categoryId: item.categoryId,
    confidence: item.confidence,
    draftId,
    flags: [...item.flags],
    kind: item.kind,
    normalizedName: item.normalizedName,
    quantity: item.quantity,
    rawLine: item.rawLine,
    rawName: item.rawName,
    tags: [...item.tags],
    totalPrice: roundMoney(item.totalPrice),
    unitPrice: item.unitPrice,
  }));

  await financeDb.transaction(
    "rw",
    [financeDb.receiptDrafts, financeDb.receiptDraftItems],
    async () => {
      await financeDb.receiptDrafts.put(draft);
      await financeDb.receiptDraftItems.bulkPut(items);
    },
  );

  return { draft, items };
}

export async function updateReceiptDraft(
  draftId: string,
  input: ReceiptDraftUpdateInput,
): Promise<ReceiptDraftRecord> {
  assertIndexedDbWritable("local receipt draft writes");
  await ensureSeedData();

  const existingDraft = await financeDb.receiptDrafts.get(draftId);

  if (!existingDraft) {
    throw new Error("Receipt draft was not found.");
  }

  if (existingDraft.status === "confirmed") {
    throw new Error("Confirmed receipt drafts cannot be edited.");
  }

  if (input.status === "confirmed") {
    throw new Error("Use receipt confirmation to confirm receipt drafts.");
  }

  const existingItems = await financeDb.receiptDraftItems
    .where("draftId")
    .equals(draftId)
    .toArray();
  const existingItemsById = new Map(
    existingItems.map((item) => [item.id, item] as const),
  );
  const nextItems = input.items.map((itemInput) => {
    const existingItem = existingItemsById.get(itemInput.id);

    if (!existingItem) {
      throw new Error("Receipt draft item was not found.");
    }

    return {
      ...existingItem,
      categoryId: normalizeRequiredText(
        itemInput.categoryId,
        "Receipt draft item category is required.",
      ),
      confidence: itemInput.confidence,
      flags: [...itemInput.flags],
      kind: itemInput.kind,
      normalizedName: normalizeRequiredText(
        itemInput.normalizedName,
        "Receipt draft item name is required.",
      ),
      quantity: itemInput.quantity,
      tags: [...itemInput.tags],
      totalPrice: roundMoney(itemInput.totalPrice),
      unitPrice: itemInput.unitPrice,
    };
  });
  const now = new Date().toISOString();
  const updatedDraft: ReceiptDraft = {
    ...existingDraft,
    currency: normalizeRequiredText(input.currency, "Currency is required."),
    date: input.date,
    merchant: normalizeOptionalText(input.merchant),
    status: input.status,
    total: input.total === undefined ? undefined : roundMoney(input.total),
    updatedAt: now,
  };

  await financeDb.transaction(
    "rw",
    [financeDb.receiptDrafts, financeDb.receiptDraftItems],
    async () => {
      await financeDb.receiptDrafts.put(updatedDraft);
      await financeDb.receiptDraftItems.bulkPut(nextItems);
    },
  );

  return { draft: updatedDraft, items: nextItems };
}

export async function confirmReceiptDraft(
  draftId: string,
  input: ReceiptDraftConfirmationInput,
): Promise<ReceiptDraftConfirmationRecord> {
  assertIndexedDbWritable("local receipt confirmation writes");
  await ensureSeedData();

  return financeDb.transaction(
    "rw",
    [
      financeDb.accounts,
      financeDb.categories,
      financeDb.transactions,
      financeDb.receipts,
      financeDb.receiptItems,
      financeDb.receiptDrafts,
      financeDb.receiptDraftItems,
    ],
    async () => {
      const draft = await financeDb.receiptDrafts.get(draftId);

      if (!draft) {
        throw new Error("Receipt draft was not found.");
      }

      if (draft.status === "confirmed") {
        return loadExistingReceiptDraftConfirmation(draft);
      }

      if (draft.status !== "reviewed") {
        throw new Error("Receipt draft must be reviewed before confirmation.");
      }

      if (draft.confirmedReceiptId || draft.linkedTransactionId) {
        throw new Error("Receipt draft already has confirmation links.");
      }

      const accountId = normalizeRequiredText(
        input.accountId,
        "Select an account before confirming this receipt.",
      );
      const account = await financeDb.accounts.get(accountId);

      if (!account || account.isArchived) {
        throw new Error("Selected account is not available.");
      }

      const categoryId = await resolveReceiptTransactionCategoryId(
        input.categoryId,
      );
      const draftItems = await financeDb.receiptDraftItems
        .where("draftId")
        .equals(draft.id)
        .toArray();
      const now = new Date().toISOString();
      const receiptId = createRecordId("receipt");
      const transactionId = createRecordId("tx");
      const merchant = normalizeRequiredText(
        draft.merchant ?? "",
        "Merchant is required before confirming this receipt.",
      );
      const date = normalizeRequiredText(
        draft.date ?? "",
        "Receipt date is required before confirmation.",
      );
      const amount = getConfirmableReceiptTotal(draft.total);
      const currency = normalizeRequiredText(
        draft.currency,
        "Receipt currency is required before confirmation.",
      );
      const receipt: Receipt = {
        id: receiptId,
        confidence: draft.confidence,
        currency,
        date,
        merchant,
        rawText: draft.rawText,
        source: draft.source,
        sourceMetadata: normalizeReceiptSourceMetadata(draft.sourceMetadata),
        status: "confirmed",
        total: amount,
        transactionId,
        warnings: [...draft.warnings],
        createdAt: now,
        updatedAt: now,
      };
      const transaction: Transaction = {
        id: transactionId,
        accountId,
        amount,
        categoryId,
        createdAt: now,
        currency,
        date,
        description: `Confirmed from receipt draft ${draft.id}`,
        merchant,
        receiptId,
        source: "receipt",
        tags: ["receipt", "receipt-draft"],
        updatedAt: now,
      };
      const receiptItems = draftItems.map((item) =>
        receiptDraftItemToReceiptItem(item, receiptId),
      );
      const updatedDraft: ReceiptDraft = {
        ...draft,
        confirmedReceiptId: receiptId,
        linkedTransactionId: transactionId,
        status: "confirmed",
        updatedAt: now,
      };

      await financeDb.receipts.put(receipt);
      await financeDb.transactions.put(transaction);

      if (receiptItems.length > 0) {
        await financeDb.receiptItems.bulkPut(receiptItems);
      }

      await financeDb.receiptDrafts.put(updatedDraft);

      return {
        draft: updatedDraft,
        items: receiptItems,
        receipt,
        transaction,
      };
    },
  );
}

export async function listReceiptDraftRecords(): Promise<ReceiptDraftRecord[]> {
  if (!canUseIndexedDb()) {
    return [];
  }

  await ensureSeedData();

  const drafts = await financeDb.receiptDrafts
    .orderBy("updatedAt")
    .reverse()
    .toArray();

  if (drafts.length === 0) {
    return [];
  }

  const items = await financeDb.receiptDraftItems.toArray();
  const itemsByDraft = new Map<string, ReceiptDraftItem[]>();

  items.forEach((item) => {
    const currentItems = itemsByDraft.get(item.draftId) ?? [];
    currentItems.push(item);
    itemsByDraft.set(item.draftId, currentItems);
  });

  return drafts.map((draft) => ({
    draft,
    items: itemsByDraft.get(draft.id) ?? [],
  }));
}

export async function getReceiptDraftRecordById(
  draftId: string,
): Promise<ReceiptDraftRecord | undefined> {
  if (!canUseIndexedDb()) {
    return undefined;
  }

  await ensureSeedData();

  const draft = await financeDb.receiptDrafts.get(draftId);

  if (!draft) {
    return undefined;
  }

  const items = await financeDb.receiptDraftItems
    .where("draftId")
    .equals(draftId)
    .toArray();

  return { draft, items };
}

export async function deleteReceiptDraft(draftId: string): Promise<void> {
  assertIndexedDbWritable("local receipt draft writes");
  await ensureSeedData();

  await financeDb.transaction(
    "rw",
    [financeDb.receiptDrafts, financeDb.receiptDraftItems],
    async () => {
      await financeDb.receiptDraftItems.where("draftId").equals(draftId).delete();
      await financeDb.receiptDrafts.delete(draftId);
    },
  );
}

async function loadExistingReceiptDraftConfirmation(
  draft: ReceiptDraft,
): Promise<ReceiptDraftConfirmationRecord> {
  const receiptId = draft.confirmedReceiptId;
  const transactionId = draft.linkedTransactionId;

  if (!receiptId || !transactionId) {
    throw new Error("Receipt draft was already confirmed without complete links.");
  }

  const [receipt, transaction, items] = await Promise.all([
    financeDb.receipts.get(receiptId),
    financeDb.transactions.get(transactionId),
    financeDb.receiptItems.where("receiptId").equals(receiptId).toArray(),
  ]);

  if (!receipt || !transaction) {
    throw new Error("Confirmed receipt draft linked records could not be found.");
  }

  return {
    draft,
    items,
    receipt,
    transaction,
  };
}

async function resolveReceiptTransactionCategoryId(
  requestedCategoryId: string | undefined,
): Promise<string> {
  const categories = await financeDb.categories.toArray();
  const requestedId = normalizeOptionalText(requestedCategoryId);

  if (requestedId) {
    const selectedCategory = categories.find(
      (category) => category.id === requestedId && category.type === "expense",
    );

    if (!selectedCategory) {
      throw new Error("Selected transaction category is not available.");
    }

    return selectedCategory.id;
  }

  const defaultCategory = getDefaultReceiptTransactionCategory(categories);

  if (!defaultCategory) {
    throw new Error("No expense category is available for receipt confirmation.");
  }

  return defaultCategory.id;
}

function getDefaultReceiptTransactionCategory(
  categories: Category[],
): Category | undefined {
  const expenseCategories = categories.filter(
    (category) => category.type === "expense",
  );

  return (
    expenseCategories.find((category) => {
      const categoryKey = `${category.id} ${category.name}`.toLowerCase();
      return categoryKey.includes("grocer") || categoryKey.includes("food");
    }) ?? expenseCategories[0]
  );
}

function receiptDraftItemToReceiptItem(
  item: ReceiptDraftItem,
  receiptId: string,
): ReceiptItem {
  const normalizedName = normalizeRequiredText(
    item.normalizedName,
    "Receipt item name is required before confirmation.",
  );
  const rawName =
    normalizeOptionalText(item.rawName) ??
    normalizeOptionalText(item.rawLine) ??
    normalizedName;

  if (!Number.isFinite(item.totalPrice) || item.totalPrice < 0) {
    throw new Error(`${rawName} total price must be a non-negative number.`);
  }

  return {
    id: createRecordId("receipt-item"),
    categoryId: normalizeOptionalText(item.categoryId),
    confidence: item.confidence,
    flags: [...item.flags],
    normalizedName,
    quantity: item.quantity,
    rawName,
    receiptId,
    tags: [...item.tags],
    totalPrice: roundMoney(item.totalPrice),
    unitPrice: item.unitPrice,
  };
}

function getConfirmableReceiptTotal(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error("Receipt total must be greater than zero before confirmation.");
  }

  return roundMoney(value);
}

function assertIndexedDbWritable(action: string): void {
  if (!canUseIndexedDb()) {
    throw new Error(`IndexedDB is not available for ${action}.`);
  }
}

function assertValidTransactionCsvImportInput(
  input: TransactionCsvImportRowInput,
): void {
  assertValidTransactionInput(input);

  if (!input.categoryId) {
    throw new Error("Category is required for CSV transaction import.");
  }
}
function createRecordId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();

  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeRequiredText(value: string, message: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeReceiptSourceMetadata(
  metadata: ReceiptDraftSourceMetadata | undefined,
): ReceiptDraftSourceMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    kind: metadata.kind,
    extractedAt: normalizeOptionalText(metadata.extractedAt),
    fetchedAt: normalizeOptionalText(metadata.fetchedAt),
    modelName: normalizeOptionalText(metadata.modelName),
    providerName: normalizeOptionalText(metadata.providerName),
    receivedAt: normalizeOptionalText(metadata.receivedAt),
    sender: normalizeOptionalText(metadata.sender),
    sourceId: normalizeOptionalText(metadata.sourceId),
    title: normalizeOptionalText(metadata.title),
    url: normalizeOptionalText(metadata.url),
  };
}

function validateLocalJsonBackup(backupValue: unknown): LocalJsonBackup {
  const backup = requireRecord(backupValue, "Backup file");
  const app = requireRecord(backup.app, "Backup app metadata");
  const tables = requireRecord(backup.tables, "Backup tables");
  const settings = requireRecord(tables.settings, "Backup settings");
  const currencySettings = requireCurrencySettings(
    settings.currencySettings,
    "Backup currency settings",
  );
  const exportedAt = requireString(backup.exportedAt, "Backup export timestamp");
  const schemaVersion = requireNumber(
    backup.schemaVersion,
    "Backup schema version",
  );
  const backupSeedVersion = requireNumber(backup.seedVersion, "Backup seed version");
  const backupStorageMode = requireString(backup.storageMode, "Backup storage mode");
  const appName = requireString(app.name, "Backup app name");
  const appVersion = requireString(app.version, "Backup app version");

  if (schemaVersion !== localJsonBackupSchemaVersion) {
    throw new Error(
      `Unsupported backup schema version ${schemaVersion}. Expected ${localJsonBackupSchemaVersion}.`,
    );
  }

  if (appName !== appInfo.name) {
    throw new Error("Backup app metadata is not supported.");
  }

  if (Number.isNaN(Date.parse(exportedAt))) {
    throw new Error("Backup export timestamp is invalid.");
  }

  if (!Number.isInteger(backupSeedVersion) || backupSeedVersion < 0) {
    throw new Error("Backup seed version is invalid.");
  }

  if (!isRepositoryStorageMode(backupStorageMode)) {
    throw new Error("Backup storage mode is invalid.");
  }

  const accounts = requireArray<Account>(tables.accounts, "accounts");
  const appMeta = requireArray<AppMetaRecord>(tables.appMeta, "appMeta");
  const categories = requireArray<Category>(tables.categories, "categories");
  const transactions = requireArray<Transaction>(
    tables.transactions,
    "transactions",
  );
  const receipts = requireArray<Receipt>(tables.receipts, "receipts");
  const receiptItems = requireArray<ReceiptItem>(
    tables.receiptItems,
    "receiptItems",
  );
  const receiptDrafts = requireArray<ReceiptDraft>(
    tables.receiptDrafts,
    "receiptDrafts",
  );
  const receiptDraftItems = requireArray<ReceiptDraftItem>(
    tables.receiptDraftItems,
    "receiptDraftItems",
  );
  const recurringExpenses = requireArray<RecurringExpense>(
    tables.recurringExpenses,
    "recurringExpenses",
  );

  accounts.forEach(validateAccountRecord);
  appMeta.forEach(validateAppMetaRecord);
  categories.forEach(validateCategoryRecord);
  transactions.forEach(validateTransactionRecord);
  receipts.forEach(validateReceiptRecord);
  receiptItems.forEach(validateReceiptItemRecord);
  receiptDrafts.forEach(validateReceiptDraftRecord);
  receiptDraftItems.forEach(validateReceiptDraftItemRecord);
  recurringExpenses.forEach(validateRecurringExpenseRecord);

  assertUniqueIds(accounts, "accounts");
  assertUniqueIds(categories, "categories");
  assertUniqueIds(transactions, "transactions");
  assertUniqueIds(receipts, "receipts");
  assertUniqueIds(receiptItems, "receiptItems");
  assertUniqueIds(receiptDrafts, "receiptDrafts");
  assertUniqueIds(receiptDraftItems, "receiptDraftItems");
  assertUniqueIds(recurringExpenses, "recurringExpenses");
  assertUniqueAppMetaKeys(appMeta);

  return cloneJsonValue({
    app: {
      name: appName,
      version: appVersion,
    },
    exportedAt,
    schemaVersion: localJsonBackupSchemaVersion,
    seedVersion: backupSeedVersion,
    storageMode: backupStorageMode,
    tables: {
      accounts,
      appMeta,
      categories,
      receiptDraftItems,
      receiptDrafts,
      receiptItems,
      receipts,
      recurringExpenses,
      settings: {
        currencySettings,
      },
      transactions,
    },
  });
}

function buildRestoreWarnings(backup: LocalJsonBackup): string[] {
  const warnings: string[] = [];

  if (backup.app.version !== appInfo.version) {
    warnings.push(
      `Backup app version ${backup.app.version} differs from current app version ${appInfo.version}.`,
    );
  }

  if (backup.seedVersion !== seedVersion) {
    warnings.push(
      `Backup seed version ${backup.seedVersion} differs from current seed version ${seedVersion}.`,
    );
  }

  if (backup.storageMode !== "indexeddb") {
    warnings.push("Backup was exported from seed fallback mode.");
  }

  return warnings;
}

function appMetaRecordsForRestore(backup: LocalJsonBackup): AppMetaRecord[] {
  const recordsByKey = new Map(
    backup.tables.appMeta.map((record) => [record.key, record] as const),
  );
  const seedVersionRecord = recordsByKey.get(seedVersionKey);
  const currencySettingsRecord = recordsByKey.get(currencySettingsKey);

  recordsByKey.set(seedVersionKey, {
    key: seedVersionKey,
    updatedAt: seedVersionRecord?.updatedAt ?? backup.exportedAt,
    value: String(backup.seedVersion),
  });
  recordsByKey.set(currencySettingsKey, {
    key: currencySettingsKey,
    updatedAt:
      currencySettingsRecord?.updatedAt ??
      backup.tables.settings.currencySettings.updatedAt ??
      backup.exportedAt,
    value: serializeCurrencySettings(backup.tables.settings.currencySettings),
  });

  return cloneJsonValue(Array.from(recordsByKey.values()));
}

function validateAccountRecord(record: Account, index: number): void {
  const label = `accounts[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.name, `${label}.name`);
  requireString(record.type, `${label}.type`);
  requireString(record.currency, `${label}.currency`);
  requireNumber(record.openingBalance, `${label}.openingBalance`);
  requireOptionalNumber(record.currentBalance, `${label}.currentBalance`);
  requireBoolean(record.isArchived, `${label}.isArchived`);
  requireString(record.createdAt, `${label}.createdAt`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function validateAppMetaRecord(record: AppMetaRecord, index: number): void {
  const label = `appMeta[${index}]`;
  requireRecord(record, label);
  requireString(record.key, `${label}.key`);
  requireString(record.value, `${label}.value`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function validateCategoryRecord(record: Category, index: number): void {
  const label = `categories[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.name, `${label}.name`);
  requireOptionalString(record.parentId, `${label}.parentId`);
  requireString(record.type, `${label}.type`);
  requireOptionalString(record.color, `${label}.color`);
  requireOptionalString(record.icon, `${label}.icon`);

  if (!["expense", "income", "transfer"].includes(record.type)) {
    throw new Error(`${label}.type is invalid.`);
  }
}

function validateTransactionRecord(record: Transaction, index: number): void {
  const label = `transactions[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.date, `${label}.date`);
  requireNumber(record.amount, `${label}.amount`);
  requireString(record.currency, `${label}.currency`);
  requireString(record.merchant, `${label}.merchant`);
  requireString(record.accountId, `${label}.accountId`);
  requireOptionalString(record.categoryId, `${label}.categoryId`);
  requireOptionalString(record.description, `${label}.description`);
  requireString(record.source, `${label}.source`);
  requireOptionalString(record.receiptId, `${label}.receiptId`);
  requireStringArray(record.tags, `${label}.tags`);
  requireString(record.createdAt, `${label}.createdAt`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function validateReceiptRecord(record: Receipt, index: number): void {
  const label = `receipts[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireOptionalString(record.date, `${label}.date`);
  requireOptionalString(record.merchant, `${label}.merchant`);
  requireOptionalNumber(record.total, `${label}.total`);
  requireString(record.currency, `${label}.currency`);
  requireString(record.rawText, `${label}.rawText`);
  requireString(record.status, `${label}.status`);
  requireString(record.source, `${label}.source`);
  requireOptionalSourceMetadata(record.sourceMetadata, `${label}.sourceMetadata`);
  requireOptionalString(record.transactionId, `${label}.transactionId`);
  requireOptionalNumber(record.confidence, `${label}.confidence`);
  requireStringArray(record.warnings, `${label}.warnings`);
  requireString(record.createdAt, `${label}.createdAt`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function validateReceiptItemRecord(record: ReceiptItem, index: number): void {
  const label = `receiptItems[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.receiptId, `${label}.receiptId`);
  requireString(record.rawName, `${label}.rawName`);
  requireString(record.normalizedName, `${label}.normalizedName`);
  requireOptionalNumber(record.quantity, `${label}.quantity`);
  requireOptionalNumber(record.unitPrice, `${label}.unitPrice`);
  requireNumber(record.totalPrice, `${label}.totalPrice`);
  requireOptionalString(record.categoryId, `${label}.categoryId`);
  requireStringArray(record.tags, `${label}.tags`);
  requireStringArray(record.flags, `${label}.flags`);
  requireOptionalNumber(record.confidence, `${label}.confidence`);
}

function validateReceiptDraftRecord(record: ReceiptDraft, index: number): void {
  const label = `receiptDrafts[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireOptionalString(record.date, `${label}.date`);
  requireOptionalString(record.merchant, `${label}.merchant`);
  requireOptionalNumber(record.total, `${label}.total`);
  requireString(record.currency, `${label}.currency`);
  requireString(record.rawText, `${label}.rawText`);
  requireString(record.status, `${label}.status`);
  requireString(record.source, `${label}.source`);
  requireOptionalSourceMetadata(record.sourceMetadata, `${label}.sourceMetadata`);
  requireNumber(record.confidence, `${label}.confidence`);
  requireStringArray(record.warnings, `${label}.warnings`);
  requireOptionalString(record.confirmedReceiptId, `${label}.confirmedReceiptId`);
  requireOptionalString(record.linkedTransactionId, `${label}.linkedTransactionId`);
  requireString(record.createdAt, `${label}.createdAt`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function validateReceiptDraftItemRecord(
  record: ReceiptDraftItem,
  index: number,
): void {
  const label = `receiptDraftItems[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.draftId, `${label}.draftId`);
  requireString(record.rawLine, `${label}.rawLine`);
  requireString(record.rawName, `${label}.rawName`);
  requireString(record.normalizedName, `${label}.normalizedName`);
  requireOptionalNumber(record.quantity, `${label}.quantity`);
  requireOptionalNumber(record.unitPrice, `${label}.unitPrice`);
  requireNumber(record.totalPrice, `${label}.totalPrice`);
  requireString(record.categoryId, `${label}.categoryId`);
  requireStringArray(record.tags, `${label}.tags`);
  requireNumber(record.confidence, `${label}.confidence`);
  requireStringArray(record.flags, `${label}.flags`);
  requireString(record.kind, `${label}.kind`);
}

function validateRecurringExpenseRecord(
  record: RecurringExpense,
  index: number,
): void {
  const label = `recurringExpenses[${index}]`;
  requireRecord(record, label);
  requireString(record.id, `${label}.id`);
  requireString(record.name, `${label}.name`);
  requireOptionalString(record.merchant, `${label}.merchant`);
  requireNumber(record.amount, `${label}.amount`);
  requireString(record.currency, `${label}.currency`);
  requireString(record.frequency, `${label}.frequency`);
  requireString(record.nextDueDate, `${label}.nextDueDate`);
  requireOptionalString(record.categoryId, `${label}.categoryId`);
  requireOptionalString(record.accountId, `${label}.accountId`);
  requireOptionalString(record.note, `${label}.note`);
  requireString(record.status, `${label}.status`);
  requireStringArray(record.tags, `${label}.tags`);
  requireString(record.createdAt, `${label}.createdAt`);
  requireString(record.updatedAt, `${label}.updatedAt`);
}

function requireCurrencySettings(
  value: unknown,
  label: string,
): CurrencySettings {
  const settings = requireRecord(value, label) as unknown as CurrencySettings;
  requireString(settings.displayCurrency, `${label}.displayCurrency`);
  requireRecord(settings.ratesToRub, `${label}.ratesToRub`);
  requireNumber(settings.ratesToRub.USD, `${label}.ratesToRub.USD`);
  requireNumber(settings.ratesToRub.RUB, `${label}.ratesToRub.RUB`);
  requireNumber(settings.ratesToRub.EUR, `${label}.ratesToRub.EUR`);
  requireNumber(settings.ratesToRub.GBP, `${label}.ratesToRub.GBP`);
  requireString(settings.source, `${label}.source`);
  requireString(settings.updatedAt, `${label}.updatedAt`);
  assertValidCurrencySettings(settings);

  return settings;
}

function requireOptionalSourceMetadata(
  metadata: ReceiptDraftSourceMetadata | undefined,
  label: string,
): void {
  if (metadata === undefined) {
    return;
  }

  requireRecord(metadata, label);
  requireString(metadata.kind, `${label}.kind`);
  requireOptionalString(metadata.sourceId, `${label}.sourceId`);
  requireOptionalString(metadata.title, `${label}.title`);
  requireOptionalString(metadata.sender, `${label}.sender`);
  requireOptionalString(metadata.url, `${label}.url`);
  requireOptionalString(metadata.receivedAt, `${label}.receivedAt`);
  requireOptionalString(metadata.fetchedAt, `${label}.fetchedAt`);
  requireOptionalString(metadata.providerName, `${label}.providerName`);
  requireOptionalString(metadata.modelName, `${label}.modelName`);
  requireOptionalString(metadata.extractedAt, `${label}.extractedAt`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function requireArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Backup table ${label} is missing or invalid.`);
  }

  return value as T[];
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function requireOptionalString(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${label} must be a string when present.`);
  }
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function requireOptionalNumber(value: unknown, label: string): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error(`${label} must be a finite number when present.`);
  }
}

function requireBoolean(value: unknown, label: string): void {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
}

function requireStringArray(value: unknown, label: string): void {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new Error(`${label} must be an array of strings.`);
  }
}

function assertUniqueIds(records: Array<{ id: string }>, label: string): void {
  const ids = new Set<string>();

  records.forEach((record) => {
    if (ids.has(record.id)) {
      throw new Error(`Backup table ${label} has duplicate id ${record.id}.`);
    }

    ids.add(record.id);
  });
}

function assertUniqueAppMetaKeys(records: AppMetaRecord[]): void {
  const keys = new Set<string>();

  records.forEach((record) => {
    if (keys.has(record.key)) {
      throw new Error(`Backup appMeta has duplicate key ${record.key}.`);
    }

    keys.add(record.key);
  });
}

function isRepositoryStorageMode(value: string): value is RepositoryStorageMode {
  return value === "indexeddb" || value === "seed_fallback";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function seedAppMetaRecords(updatedAt: string): AppMetaRecord[] {
  const seed = createSeedFinanceSnapshot();

  return [
    {
      key: seedVersionKey,
      updatedAt,
      value: String(seedVersion),
    },
    {
      key: currencySettingsKey,
      updatedAt,
      value: serializeCurrencySettings(seed.currencySettings),
    },
  ];
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
