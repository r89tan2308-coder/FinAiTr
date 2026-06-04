import { createSeedFinanceSnapshot, seedVersion } from "../../data/seedData";
import {
  parseCurrencySettings,
  serializeCurrencySettings,
} from "../../domain/currencySettings";
import {
  type Category,
  type CurrencyCode,
  type CurrencySettings,
  type FinanceSnapshot,
  type ISODateString,
  type Receipt,
  type ReceiptDraft,
  type ReceiptDraftItem,
  type ReceiptDraftItemFlag,
  type ReceiptDraftLineKind,
  type ReceiptDraftStatus,
  type ReceiptItem,
  type ReceiptSource,
  type Transaction,
} from "../../domain/models";
import {
  assertValidTransactionInput,
  type TransactionInput,
} from "../../domain/transactionValidation";
import { canUseIndexedDb, financeDb } from "../db";

const seedVersionKey = "seedVersion";
const currencySettingsKey = "currencySettings";

export type RepositoryStorageMode = "indexeddb" | "seed_fallback";

export interface FinanceRepositorySnapshot {
  snapshot: FinanceSnapshot;
  storageMode: RepositoryStorageMode;
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
