import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  buildFinanceOverview,
  type FinanceOverview,
} from "../domain/financeViews";
import {
  buildRecurringCsvImportPreview,
  type RecurringCsvImportPreview,
} from "../domain/csvRecurringImport";
import {
  buildTransactionCsvImportPreview,
  type TransactionCsvImportPreview,
} from "../domain/csvTransactionImport";
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
  buildLocalDriveDocsSelectedFileCandidate,
  type LocalDriveDocsSelectedFileInput,
  type LocalDriveDocsSelectedFileSourceKind,
} from "../receipt-ingestion/localDriveDocsSelectedFileSource";
import {
  buildLocalGmailManualReceiptCandidate,
  type LocalGmailManualReceiptInput,
} from "../receipt-ingestion/localGmailManualReceiptSource";
import {
  getMockGoogleReceiptSourceCandidate,
  listMockGoogleReceiptSourceSummaries,
  type MockGoogleReceiptSourceSummary,
} from "../receipt-ingestion/mockGoogleSourceProvider";
import {
  type ReceiptExtractionCategoryHint,
  type ReceiptExtractionProvider,
  type ReceiptExtractionResult,
  type ReceiptTextCandidate,
  type ReceiptTextSourceProvider,
} from "../receipt-ingestion/types";
import {
  validateReceiptExtractionResult,
} from "../receipt-ingestion/receiptExtractionValidation";
import {
  addRecurringExpense,
  buildLocalJsonRestorePreview,
  confirmReceiptDraft,
  deleteRecurringExpense,
  addManualTransaction,
  deleteReceiptDraft,
  deleteTransaction,
  exportLocalCsv,
  exportLocalJsonBackup,
  getReceiptDraftRecordById,
  getFinanceSnapshot,
  importRecurringCsvRows,
  importTransactionCsvRows,
  listReceiptDraftRecords,
  resetLocalDataToSeed,
  restoreLocalJsonBackup,
  saveReceiptDraft,
  updateReceiptDraft,
  updateRecurringExpense,
  updateCurrencySettings,
  updateTransaction,
  type LocalCsvExport,
  type LocalCsvExportKind,
  type LocalJsonBackup,
  type LocalJsonRestorePreview,
  type ReceiptDraftConfirmationInput,
  type ReceiptDraftConfirmationRecord,
  type ReceiptDraftUpdateInput,
  type ReceiptDraftRecord,
  type RepositoryStorageMode,
  type RecurringCsvImportRowInput,
  type TransactionCsvImportRowInput,
} from "../persistence/repositories/financeRepository";
import {
  RecurringExpenseValidationError,
  type RecurringExpenseInput,
  type RecurringExpenseValidationErrors,
} from "../domain/recurringValidation";

export type FinanceLoadStatus = "loading" | "ready" | "error";
export type FinanceStorageMode = RepositoryStorageMode;
export type {
  LocalCsvExport,
  LocalCsvExportKind,
  LocalJsonBackup,
  LocalJsonRestorePreview,
  RecurringCsvImportPreview,
  RecurringCsvImportRowInput,
  TransactionCsvImportPreview,
  TransactionCsvImportRowInput,
  ManualAiExtractionInput,
  LocalGmailManualReceiptInput,
  LocalDriveDocsSelectedFileInput,
  LocalDriveDocsSelectedFileSourceKind,
  MockGoogleReceiptSourceSummary,
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
  candidate?: ReceiptTextCandidate;
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

export interface LocalCsvExportActionResult {
  csv?: LocalCsvExport;
  errorMessage?: string;
  ok: boolean;
}

export interface RecurringCsvImportPreviewActionResult {
  errorMessage?: string;
  ok: boolean;
  preview?: RecurringCsvImportPreview;
}

export interface RecurringCsvImportActionResult {
  data?: FinanceDataState;
  errorMessage?: string;
  importedCount?: number;
  ok: boolean;
}

export interface TransactionCsvImportPreviewActionResult {
  errorMessage?: string;
  ok: boolean;
  preview?: TransactionCsvImportPreview;
}

export interface TransactionCsvImportActionResult {
  data?: FinanceDataState;
  errorMessage?: string;
  importedCount?: number;
  ok: boolean;
}

export interface LocalDataResetActionResult {
  data?: FinanceDataState;
  errorMessage?: string;
  ok: boolean;
}

export interface LocalBackupRestorePreviewActionResult {
  backup?: LocalJsonBackup;
  errorMessage?: string;
  ok: boolean;
  preview?: LocalJsonRestorePreview;
}

export interface LocalBackupRestoreActionResult {
  data?: FinanceDataState;
  errorMessage?: string;
  ok: boolean;
}

interface MockGoogleReceiptSourceIngestionOptions {
  extractionProvider?: ReceiptExtractionProvider;
  sourceProviders?: readonly ReceiptTextSourceProvider[];
}

interface LocalDriveDocsSelectedFileIngestionOptions {
  extractionProvider?: ReceiptExtractionProvider;
}

interface LocalGmailManualReceiptIngestionOptions {
  extractionProvider?: ReceiptExtractionProvider;
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
  provider: ReceiptExtractionProvider = mockAiReceiptExtractionProvider,
): Promise<ReceiptDraftActionResult> {
  try {
    const candidate = buildManualAiReceiptCandidate(input);
    const { snapshot } = await getFinanceSnapshot();
    const categoryHints = categoriesToExtractionHints(snapshot.categories);
    const extraction = validateReceiptExtractionResult(
      await provider.extractReceiptDraft(
        buildReceiptExtractionRequest(candidate, categoryHints),
      ),
      {
        categoryIds: snapshot.categories.map((category) => category.id),
        source: candidate.source,
      },
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

export function getMockGoogleReceiptSourceSummaries(): MockGoogleReceiptSourceSummary[] {
  return listMockGoogleReceiptSourceSummaries();
}

export async function importLocalDriveDocsSelectedFileAndReload(
  input: LocalDriveDocsSelectedFileInput,
  options: LocalDriveDocsSelectedFileIngestionOptions = {},
): Promise<ReceiptDraftActionResult> {
  try {
    const candidate = buildLocalDriveDocsSelectedFileCandidate(input);
    const { snapshot } = await getFinanceSnapshot();
    const duplicateMessage = findDuplicateReceiptSource(
      candidate,
      snapshot,
      `Local ${formatSourceKind(candidate.source.kind)} selected file`,
    );

    if (duplicateMessage) {
      throw new Error(duplicateMessage);
    }

    const categoryHints = categoriesToExtractionHints(snapshot.categories);
    const extractionProvider =
      options.extractionProvider ?? mockAiReceiptExtractionProvider;
    const extraction = validateReceiptExtractionResult(
      await extractionProvider.extractReceiptDraft(
        buildReceiptExtractionRequest(candidate, categoryHints),
      ),
      {
        categoryIds: snapshot.categories.map((category) => category.id),
        source: candidate.source,
      },
    );
    const draft = await saveReceiptDraft(
      aiExtractionResultToReceiptDraftInput(candidate, extraction),
    );

    return {
      candidate,
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
          : "Selected Drive/Docs file could not be imported.",
      ok: false,
    };
  }
}

export async function importLocalGmailManualReceiptAndReload(
  input: LocalGmailManualReceiptInput,
  options: LocalGmailManualReceiptIngestionOptions = {},
): Promise<ReceiptDraftActionResult> {
  try {
    const candidate = buildLocalGmailManualReceiptCandidate(input);
    const { snapshot } = await getFinanceSnapshot();
    const duplicateMessage = findDuplicateReceiptSource(
      candidate,
      snapshot,
      "Local Gmail message",
    );

    if (duplicateMessage) {
      throw new Error(duplicateMessage);
    }

    const categoryHints = categoriesToExtractionHints(snapshot.categories);
    const extractionProvider =
      options.extractionProvider ?? mockAiReceiptExtractionProvider;
    const extraction = validateReceiptExtractionResult(
      await extractionProvider.extractReceiptDraft(
        buildReceiptExtractionRequest(candidate, categoryHints),
      ),
      {
        categoryIds: snapshot.categories.map((category) => category.id),
        source: candidate.source,
      },
    );
    const draft = await saveReceiptDraft(
      aiExtractionResultToReceiptDraftInput(candidate, extraction),
    );

    return {
      candidate,
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
          : "Local Gmail receipt could not be imported.",
      ok: false,
    };
  }
}

export async function ingestMockGoogleReceiptSourceAndReload(
  candidateId: string,
  options: MockGoogleReceiptSourceIngestionOptions = {},
): Promise<ReceiptDraftActionResult> {
  try {
    const candidate = await getMockGoogleReceiptSourceCandidate(
      candidateId,
      options.sourceProviders,
    );
    const { snapshot } = await getFinanceSnapshot();
    const duplicateMessage = findDuplicateReceiptSource(candidate, snapshot);

    if (duplicateMessage) {
      throw new Error(duplicateMessage);
    }

    const categoryHints = categoriesToExtractionHints(snapshot.categories);
    const extractionProvider =
      options.extractionProvider ?? mockAiReceiptExtractionProvider;
    const extraction = validateReceiptExtractionResult(
      await extractionProvider.extractReceiptDraft(
        buildReceiptExtractionRequest(candidate, categoryHints),
      ),
      {
        categoryIds: snapshot.categories.map((category) => category.id),
        source: candidate.source,
      },
    );
    const draft = await saveReceiptDraft(
      aiExtractionResultToReceiptDraftInput(candidate, extraction),
    );

    return {
      candidate,
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
          : "Mock Google receipt source could not be ingested.",
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

export async function exportLocalCsvForDownload(
  kind: LocalCsvExportKind,
): Promise<LocalCsvExportActionResult> {
  try {
    return {
      csv: await exportLocalCsv(kind),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error ? error.message : "Local CSV could not be exported.",
      ok: false,
    };
  }
}

export async function previewRecurringCsvImportFromText(
  rawCsv: string,
): Promise<RecurringCsvImportPreviewActionResult> {
  try {
    const { snapshot } = await getFinanceSnapshot();

    return {
      ok: true,
      preview: buildRecurringCsvImportPreview(rawCsv, snapshot),
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Recurring CSV could not be validated.",
      ok: false,
    };
  }
}

export async function confirmRecurringCsvImportAndReload(
  preview: RecurringCsvImportPreview,
): Promise<RecurringCsvImportActionResult> {
  if (!preview.canImport) {
    return {
      errorMessage: "Recurring CSV import requires a valid preview with no row errors.",
      ok: false,
    };
  }

  try {
    const importedRecurringExpenses = await importRecurringCsvRows(
      preview.importableRows,
    );

    return {
      data: await loadFinanceData(),
      importedCount: importedRecurringExpenses.length,
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Recurring CSV could not be imported.",
      ok: false,
    };
  }
}
export async function previewTransactionCsvImportFromText(
  rawCsv: string,
): Promise<TransactionCsvImportPreviewActionResult> {
  try {
    const { snapshot } = await getFinanceSnapshot();

    return {
      ok: true,
      preview: buildTransactionCsvImportPreview(rawCsv, snapshot),
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Transaction CSV could not be validated.",
      ok: false,
    };
  }
}

export async function confirmTransactionCsvImportAndReload(
  preview: TransactionCsvImportPreview,
): Promise<TransactionCsvImportActionResult> {
  if (!preview.canImport) {
    return {
      errorMessage: "Transaction CSV import requires a valid preview with no row errors.",
      ok: false,
    };
  }

  try {
    const importedTransactions = await importTransactionCsvRows(
      preview.importableRows,
    );

    return {
      data: await loadFinanceData(),
      importedCount: importedTransactions.length,
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Transaction CSV could not be imported.",
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

export async function previewLocalJsonBackupRestoreFromText(
  rawJson: string,
): Promise<LocalBackupRestorePreviewActionResult> {
  try {
    const parsedBackup = JSON.parse(rawJson) as unknown;
    const preview = buildLocalJsonRestorePreview(parsedBackup);

    return {
      backup: parsedBackup as LocalJsonBackup,
      ok: true,
      preview,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof SyntaxError
          ? "Backup file is not valid JSON."
          : error instanceof Error
            ? error.message
            : "Backup file could not be validated.",
      ok: false,
    };
  }
}

export async function restoreLocalJsonBackupAndReload(
  backup: LocalJsonBackup,
): Promise<LocalBackupRestoreActionResult> {
  try {
    await restoreLocalJsonBackup(backup);

    return {
      data: await loadFinanceData(),
      ok: true,
    };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error ? error.message : "Local backup could not be restored.",
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

function findDuplicateReceiptSource(
  candidate: ReceiptTextCandidate,
  snapshot: FinanceSnapshot,
  sourceLabel = `Mock ${formatSourceKind(candidate.source.kind)} source`,
): string | undefined {
  const { contentHash, kind, sourceId } = candidate.source;

  for (const draft of snapshot.receiptDrafts) {
    if (isDuplicateSourceMetadata(draft.sourceMetadata, kind, sourceId, contentHash)) {
      return `${sourceLabel} has already been saved as receipt draft "${draft.merchant ?? draft.id}".`;
    }
  }

  for (const receipt of snapshot.receipts) {
    if (isDuplicateSourceMetadata(receipt.sourceMetadata, kind, sourceId, contentHash)) {
      return `${sourceLabel} has already been confirmed as receipt "${receipt.merchant ?? receipt.id}".`;
    }
  }

  return undefined;
}

function isDuplicateSourceMetadata(
  metadata: FinanceSnapshot["receiptDrafts"][number]["sourceMetadata"],
  kind: ReceiptTextCandidate["source"]["kind"],
  sourceId: string | undefined,
  contentHash: string | undefined,
): boolean {
  if (!metadata || metadata.kind !== kind) {
    return false;
  }

  if (sourceId && metadata.sourceId === sourceId) {
    return true;
  }

  return Boolean(contentHash && metadata.contentHash === contentHash);
}

function formatSourceKind(kind: ReceiptTextCandidate["source"]["kind"]): string {
  return kind
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
