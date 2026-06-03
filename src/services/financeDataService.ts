import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  buildFinanceOverview,
  type FinanceOverview,
} from "../domain/financeViews";
import { type FinanceSnapshot } from "../domain/models";
import {
  type TransactionInput,
  type TransactionValidationErrors,
  TransactionValidationError,
} from "../domain/transactionValidation";
import {
  addManualTransaction,
  deleteTransaction,
  getFinanceSnapshot,
  updateTransaction,
  type RepositoryStorageMode,
} from "../persistence/repositories/financeRepository";

export type FinanceLoadStatus = "loading" | "ready" | "error";
export type FinanceStorageMode = RepositoryStorageMode;

export interface FinanceDataState {
  snapshot: FinanceSnapshot;
  overview: FinanceOverview;
  storageMode: RepositoryStorageMode;
  status: FinanceLoadStatus;
  errorMessage?: string;
}

export function createInitialFinanceDataState(): FinanceDataState {
  const snapshot = createSeedFinanceSnapshot();

  return {
    snapshot,
    overview: buildFinanceOverview(snapshot),
    storageMode: "seed_fallback",
    status: "loading",
  };
}

export async function loadFinanceData(): Promise<FinanceDataState> {
  try {
    const result = await getFinanceSnapshot();

    return {
      snapshot: result.snapshot,
      overview: buildFinanceOverview(result.snapshot),
      storageMode: result.storageMode,
      status: "ready",
    };
  } catch (error) {
    const snapshot = createSeedFinanceSnapshot();

    return {
      snapshot,
      overview: buildFinanceOverview(snapshot),
      storageMode: "seed_fallback",
      status: "error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Local finance data could not be loaded.",
    };
  }
}

export interface TransactionActionResult {
  data?: FinanceDataState;
  errors?: TransactionValidationErrors;
  errorMessage?: string;
  ok: boolean;
}

export async function createManualTransactionAndReload(
  input: TransactionInput,
): Promise<TransactionActionResult> {
  return runTransactionAction(async () => {
    await addManualTransaction(input);
  });
}

export async function updateTransactionAndReload(
  transactionId: string,
  input: TransactionInput,
): Promise<TransactionActionResult> {
  return runTransactionAction(async () => {
    await updateTransaction(transactionId, input);
  });
}

export async function deleteTransactionAndReload(
  transactionId: string,
): Promise<TransactionActionResult> {
  return runTransactionAction(async () => {
    await deleteTransaction(transactionId);
  });
}

async function runTransactionAction(
  action: () => Promise<void>,
): Promise<TransactionActionResult> {
  try {
    await action();

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return {
        errors: error.errors,
        ok: false,
      };
    }

    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Transaction action could not be completed.",
      ok: false,
    };
  }
}
