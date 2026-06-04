import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  buildFinanceOverview,
  type FinanceOverview,
} from "../domain/financeViews";
import { type CurrencySettings, type FinanceSnapshot } from "../domain/models";
import {
  type TransactionInput,
  type TransactionValidationErrors,
  TransactionValidationError,
} from "../domain/transactionValidation";
import { type ParsedReceiptDraft } from "../receipt-parser/types";
import {
  confirmReceiptDraft,
  addManualTransaction,
  deleteReceiptDraft,
  deleteTransaction,
  getReceiptDraftRecordById,
  getFinanceSnapshot,
  listReceiptDraftRecords,
  saveReceiptDraft,
  updateReceiptDraft,
  updateCurrencySettings,
  updateTransaction,
  type ReceiptDraftConfirmationInput,
  type ReceiptDraftConfirmationRecord,
  type ReceiptDraftUpdateInput,
  type ReceiptDraftRecord,
  type RepositoryStorageMode,
} from "../persistence/repositories/financeRepository";

export type FinanceLoadStatus = "loading" | "ready" | "error";
export type FinanceStorageMode = RepositoryStorageMode;
export type {
  ReceiptDraftConfirmationInput,
  ReceiptDraftConfirmationRecord,
  ReceiptDraftUpdateInput,
};

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

export interface ReceiptDraftActionResult {
  confirmation?: ReceiptDraftConfirmationRecord;
  data?: FinanceDataState;
  draft?: ReceiptDraftRecord;
  errorMessage?: string;
  ok: boolean;
}

export interface CurrencySettingsActionResult {
  data?: FinanceDataState;
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

export async function saveParsedReceiptDraftAndReload(
  parsedDraft: ParsedReceiptDraft,
): Promise<ReceiptDraftActionResult> {
  try {
    const draft = await saveReceiptDraft(parsedReceiptDraftToInput(parsedDraft));

    return {
      data: await loadFinanceData(),
      draft,
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Receipt draft could not be saved.",
      ok: false,
    };
  }
}

export async function deleteReceiptDraftAndReload(
  draftId: string,
): Promise<ReceiptDraftActionResult> {
  try {
    await deleteReceiptDraft(draftId);

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Receipt draft could not be deleted.",
      ok: false,
    };
  }
}

export async function updateReceiptDraftAndReload(
  draftId: string,
  input: ReceiptDraftUpdateInput,
): Promise<ReceiptDraftActionResult> {
  try {
    const draft = await updateReceiptDraft(draftId, input);

    return {
      data: await loadFinanceData(),
      draft,
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Receipt draft could not be updated.",
      ok: false,
    };
  }
}

export async function confirmReceiptDraftAndReload(
  draftId: string,
  input: ReceiptDraftConfirmationInput,
): Promise<ReceiptDraftActionResult> {
  try {
    const confirmation = await confirmReceiptDraft(draftId, input);

    return {
      confirmation,
      data: await loadFinanceData(),
      draft: await getReceiptDraftRecordById(draftId),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Receipt draft could not be confirmed.",
      ok: false,
    };
  }
}

export async function updateCurrencySettingsAndReload(
  settings: CurrencySettings,
): Promise<CurrencySettingsActionResult> {
  try {
    await updateCurrencySettings(settings);

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Currency settings could not be saved.",
      ok: false,
    };
  }
}

export async function listReceiptDrafts(): Promise<ReceiptDraftRecord[]> {
  return listReceiptDraftRecords();
}

export async function getReceiptDraftById(
  draftId: string,
): Promise<ReceiptDraftRecord | undefined> {
  return getReceiptDraftRecordById(draftId);
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

function parsedReceiptDraftToInput(parsedDraft: ParsedReceiptDraft) {
  return {
    confidence: parsedDraft.confidence,
    currency: parsedDraft.currency,
    date: parsedDraft.receiptDate,
    items: parsedDraft.items.map((item) => ({
      categoryId: item.categoryId,
      confidence: item.confidence,
      flags: item.flags,
      kind: item.kind,
      normalizedName: item.normalizedName,
      quantity: item.quantity,
      rawLine: item.rawLine,
      rawName: item.rawName,
      tags: item.tags,
      totalPrice: item.totalPrice,
      unitPrice: item.unitPrice,
    })),
    merchant: parsedDraft.merchantName,
    rawText: parsedDraft.rawText,
    status: "draft" as const,
    total: parsedDraft.totalAmount,
    warnings: parsedDraft.warnings,
  };
}
