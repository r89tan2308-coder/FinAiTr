import { createSeedFinanceSnapshot, seedVersion } from "../../data/seedData";
import { type FinanceSnapshot, type Transaction } from "../../domain/models";
import {
  assertValidTransactionInput,
  type TransactionInput,
} from "../../domain/transactionValidation";
import { canUseIndexedDb, financeDb } from "../db";

const seedVersionKey = "seedVersion";

export type RepositoryStorageMode = "indexeddb" | "seed_fallback";

export interface FinanceRepositorySnapshot {
  snapshot: FinanceSnapshot;
  storageMode: RepositoryStorageMode;
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
    recurringExpenses,
  ] = await Promise.all([
    financeDb.accounts.toArray(),
    financeDb.categories.toArray(),
    financeDb.transactions.toArray(),
    financeDb.receipts.toArray(),
    financeDb.receiptItems.toArray(),
    financeDb.recurringExpenses.toArray(),
  ]);

  return {
    snapshot: {
      accounts,
      transactions,
      receipts,
      receiptItems,
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

  if (currentSeed?.value === String(seedVersion)) {
    return;
  }

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
        financeDb.recurringExpenses.bulkPut(seed.recurringExpenses),
      ]);

      await financeDb.appMeta.put({
        key: seedVersionKey,
        value: String(seedVersion),
        updatedAt: now,
      });
    },
  );
}

export async function addManualTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  assertIndexedDbWritable();
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
  assertIndexedDbWritable();
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
  assertIndexedDbWritable();
  await ensureSeedData();
  await financeDb.transactions.delete(transactionId);
}

function assertIndexedDbWritable(): void {
  if (!canUseIndexedDb()) {
    throw new Error("IndexedDB is not available for local transaction writes.");
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
