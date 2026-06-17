import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  buildFinanceOverview,
  type FinanceOverview,
} from "../domain/financeViews";
import {
  type Category,
  type CurrencySettings,
  type FinanceSnapshot,
} from "../domain/models";
import {
  type TransactionInput,
  type TransactionValidationErrors,
  TransactionValidationError,
} from "../domain/transactionValidation";
import { type ParsedReceiptDraft } from "../receipt-parser/types";
import {
  buildManualAiReceiptCandidate,
  buildReceiptExtractionRequest,
  type ManualAiExtractionInput,
  mockAiReceiptExtractionProvider,
} from "../receipt-ingestion/manualAiExtractionSimulator";
import {
  type ReceiptExtractionCategoryHint,
  type ReceiptExtractionResult,
  type ReceiptTextCandidate,
} from "../receipt-ingestion/types";
import {
  addRecurringExpense,
  confirmReceiptDraft,
  deleteRecurringExpense,
  addManualTransaction,
  deleteReceiptDraft,
  deleteTransaction,
  exportLocalJsonBackup,
  getReceiptDraftRecordById,
  getFinanceSnapshot,
  listReceiptDraftRecords,
  resetLocalDataToSeed,
  saveReceiptDraft,
  updateReceiptDraft,
  updateRecurringExpense,
  updateCurrencySettings,
  updateTransaction,
  type LocalJsonBackup,
  type ReceiptDraftConfirmationInput,
  type ReceiptDraftConfirmationRecord,
  type ReceiptDraftUpdateInput,
  type ReceiptDraftRecord,
  type RepositoryStorageMode,
} from "../persistence/repositories/financeRepository";
import {
  RecurringExpenseValidationError,
  type RecurringExpenseInput,
  type RecurringExpenseValidationErrors,
} from "../domain/recurringValidation";

export type FinanceLoadStatus = "loading" | "ready" | "error";
export type FinanceStorageMode = RepositoryStorageMode;
export type {
  LocalJsonBackup,
  ManualAiExtractionInput,
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

export interface RecurringExpenseActionResult {
  data?: FinanceDataState;
  errors?: RecurringExpenseValidationErrors;
  errorMessage?: string;
  ok: boolean;
}

export interface ReceiptDraftActionResult {
  confirmation?: ReceiptDraftConfirmationRecord;
  data?: FinanceDataState;
  draft?: ReceiptDraftRecord;
  extraction?: ReceiptExtractionResult;
  errorMessage?: string;
  ok: boolean;
}

export interface CurrencySettingsActionResult {
  data?: FinanceDataState;
  errorMessage?: string;
  ok: boolean;
}

export interface LocalBackupExportActionResult {
  backup?: LocalJsonBackup;
  errorMessage?: string;
  filename?: string;
  ok: boolean;
}

export interface LocalDataResetActionResult {
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

export async function createRecurringExpenseAndReload(
  input: RecurringExpenseInput,
): Promise<RecurringExpenseActionResult> {
  return runRecurringExpenseAction(async () => {
    await addRecurringExpense(input);
  });
}

export async function updateRecurringExpenseAndReload(
  recurringExpenseId: string,
  input: RecurringExpenseInput,
): Promise<RecurringExpenseActionResult> {
  return runRecurringExpenseAction(async () => {
    await updateRecurringExpense(recurringExpenseId, input);
  });
}

export async function deleteRecurringExpenseAndReload(
  recurringExpenseId: string,
): Promise<RecurringExpenseActionResult> {
  return runRecurringExpenseAction(async () => {
    await deleteRecurringExpense(recurringExpenseId);
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

export async function simulateAiReceiptExtractionAndSaveDraftAndReload(
  input: ManualAiExtractionInput,
): Promise<ReceiptDraftActionResult> {
  try {
    const candidate = buildManualAiReceiptCandidate(input);
    const { snapshot } = await getFinanceSnapshot();
    const extraction = await mockAiReceiptExtractionProvider.extractReceiptDraft(
      buildReceiptExtractionRequest(
        candidate,
        categoriesToExtractionHints(snapshot.categories),
      ),
    );
    const draft = await saveReceiptDraft(
      aiExtractionResultToReceiptDraftInput(candidate, extraction),
    );

    return {
      data: await loadFinanceData(),
      draft,
      extraction,
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "AI receipt extraction could not be simulated.",
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

export async function exportLocalJsonBackupForDownload(): Promise<LocalBackupExportActionResult> {
  try {
    const backup = await exportLocalJsonBackup();

    return {
      backup,
      filename: buildBackupFilename(backup.exportedAt),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Local backup could not be exported.",
      ok: false,
    };
  }
}

export async function resetLocalDataAndReload(): Promise<LocalDataResetActionResult> {
  try {
    await resetLocalDataToSeed();

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error ? error.message : "Local data could not be reset.",
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

async function runRecurringExpenseAction(
  action: () => Promise<void>,
): Promise<RecurringExpenseActionResult> {
  try {
    await action();

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    if (error instanceof RecurringExpenseValidationError) {
      return {
        errors: error.errors,
        ok: false,
      };
    }

    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Recurring expense action could not be completed.",
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

function aiExtractionResultToReceiptDraftInput(
  candidate: ReceiptTextCandidate,
  extraction: ReceiptExtractionResult,
) {
  return {
    confidence: extraction.draft.confidence,
    currency: extraction.draft.currency,
    date: extraction.draft.receiptDate,
    items: extraction.draft.items.map((item) => ({
      categoryId: item.categoryId,
      confidence: item.confidence,
      flags: [...item.flags],
      kind: item.kind,
      normalizedName: item.normalizedName,
      quantity: item.quantity,
      rawLine: item.rawLine ?? item.rawName,
      rawName: item.rawName,
      tags: [...item.tags],
      totalPrice: item.totalPrice,
      unitPrice: item.unitPrice,
    })),
    merchant: extraction.draft.merchantName,
    rawText: candidate.rawText,
    source: "ai_extraction_mock" as const,
    sourceMetadata: {
      ...candidate.source,
      extractedAt: extraction.extractedAt,
      fetchedAt: candidate.source.fetchedAt ?? candidate.detectedAt,
      modelName: extraction.modelName,
      providerName: extraction.providerName,
    },
    status: "draft" as const,
    total: extraction.draft.totalAmount,
    warnings: [...candidate.warnings, ...extraction.draft.warnings],
  };
}

function categoriesToExtractionHints(
  categories: Category[],
): ReceiptExtractionCategoryHint[] {
  return categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      id: category.id,
      keywords: [category.id, category.name.toLowerCase()],
      name: category.name,
    }));
}

function buildBackupFilename(exportedAt: string): string {
  const safeTimestamp = exportedAt.replace(/[:.]/g, "-");

  return `finaitr-backup-${safeTimestamp}.json`;
}
