import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { CategoriesPage } from "../pages/CategoriesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ReceiptsPage } from "../pages/ReceiptsPage";
import { RecurringPage } from "../pages/RecurringPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import {
  createInitialFinanceDataState,
  confirmTransactionCsvImportAndReload,
  confirmReceiptDraftAndReload,
  confirmRecurringCsvImportAndReload,
  createManualTransactionAndReload,
  createRecurringExpenseAndReload,
  deleteReceiptDraftAndReload,
  deleteRecurringExpenseAndReload,
  deleteTransactionAndReload,
  exportLocalCsvForDownload,
  exportLocalJsonBackupForDownload,
  loadFinanceData,
  getMockGoogleReceiptSourceSummaries,
  ingestMockGoogleReceiptSourceAndReload,
  previewTransactionCsvImportFromText,
  previewLocalJsonBackupRestoreFromText,
  previewRecurringCsvImportFromText,
  resetLocalDataAndReload,
  restoreLocalJsonBackupAndReload,
  saveParsedReceiptDraftAndReload,
  simulateAiReceiptExtractionAndSaveDraftAndReload,
  updateCurrencySettingsAndReload,
  updateRecurringExpenseAndReload,
  updateReceiptDraftAndReload,
  type CurrencySettingsActionResult,
  type LocalBackupRestoreActionResult,
  type LocalDataResetActionResult,
  type ReceiptDraftActionResult,
  type RecurringExpenseActionResult,
  type RecurringCsvImportActionResult,
  type TransactionActionResult,
  type TransactionCsvImportActionResult,
  updateTransactionAndReload,
} from "../services/financeDataService";
import { appRoutes, type RouteId } from "./routes";

export function App() {
  const [currentRouteId, setCurrentRouteId] = useState<RouteId>("dashboard");
  const [financeData, setFinanceData] = useState(createInitialFinanceDataState);

  const activeRoute = useMemo(
    () => appRoutes.find((route) => route.id === currentRouteId) ?? appRoutes[0],
    [currentRouteId],
  );
  const mockGoogleSourceCandidates = useMemo(
    () => getMockGoogleReceiptSourceSummaries(),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    void loadFinanceData().then((nextState) => {
      if (isMounted) {
        setFinanceData(nextState);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function applyTransactionActionResult(result: TransactionActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyReceiptDraftActionResult(result: ReceiptDraftActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyRecurringExpenseActionResult(result: RecurringExpenseActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyCurrencySettingsActionResult(result: CurrencySettingsActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyLocalDataResetActionResult(result: LocalDataResetActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyLocalBackupRestoreActionResult(
    result: LocalBackupRestoreActionResult,
  ) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyTransactionCsvImportActionResult(
    result: TransactionCsvImportActionResult,
  ) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  function applyRecurringCsvImportActionResult(
    result: RecurringCsvImportActionResult,
  ) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }
  return (
    <AppShell
      activeRoute={activeRoute}
      currentRouteId={currentRouteId}
      onRouteChange={setCurrentRouteId}
    >
      {currentRouteId === "dashboard" && (
        <DashboardPage
          categories={financeData.snapshot.categories}
          currencySettings={financeData.snapshot.currencySettings}
          overview={financeData.overview}
        />
      )}
      {currentRouteId === "transactions" && (
        <TransactionsPage
          accounts={financeData.snapshot.accounts}
          categories={financeData.snapshot.categories}
          currencySettings={financeData.snapshot.currencySettings}
          loadStatus={financeData.status}
          onCreate={async (input) =>
            applyTransactionActionResult(
              await createManualTransactionAndReload(input),
            )
          }
          onDelete={async (transactionId) =>
            applyTransactionActionResult(
              await deleteTransactionAndReload(transactionId),
            )
          }
          onUpdate={async (transactionId, input) =>
            applyTransactionActionResult(
              await updateTransactionAndReload(transactionId, input),
            )
          }
          transactions={financeData.snapshot.transactions}
        />
      )}
      {currentRouteId === "receipts" && (
        <ReceiptsPage
          accounts={financeData.snapshot.accounts}
          categories={financeData.snapshot.categories}
          currencySettings={financeData.snapshot.currencySettings}
          onConfirmDraft={async (draftId, input) =>
            applyReceiptDraftActionResult(
              await confirmReceiptDraftAndReload(draftId, input),
            )
          }
          onDeleteDraft={async (draftId) =>
            applyReceiptDraftActionResult(await deleteReceiptDraftAndReload(draftId))
          }
          onSaveDraft={async (draft) =>
            applyReceiptDraftActionResult(
              await saveParsedReceiptDraftAndReload(draft),
            )
          }
          mockGoogleSourceCandidates={mockGoogleSourceCandidates}
          onIngestMockGoogleSource={async (candidateId) =>
            applyReceiptDraftActionResult(
              await ingestMockGoogleReceiptSourceAndReload(candidateId),
            )
          }
          onSimulateAiExtraction={async (input) =>
            applyReceiptDraftActionResult(
              await simulateAiReceiptExtractionAndSaveDraftAndReload(input),
            )
          }
          onUpdateDraft={async (draftId, input) =>
            applyReceiptDraftActionResult(
              await updateReceiptDraftAndReload(draftId, input),
            )
          }
          receiptDraftItems={financeData.snapshot.receiptDraftItems}
          receiptDrafts={financeData.snapshot.receiptDrafts}
          receiptItems={financeData.snapshot.receiptItems}
          receipts={financeData.snapshot.receipts}
          transactions={financeData.snapshot.transactions}
        />
      )}
      {currentRouteId === "recurring" && (
        <RecurringPage
          accounts={financeData.snapshot.accounts}
          categories={financeData.snapshot.categories}
          currencySettings={financeData.snapshot.currencySettings}
          monthlyEstimate={financeData.overview.recurringMonthlyTotal}
          onCreate={async (input) =>
            applyRecurringExpenseActionResult(
              await createRecurringExpenseAndReload(input),
            )
          }
          onDelete={async (recurringExpenseId) =>
            applyRecurringExpenseActionResult(
              await deleteRecurringExpenseAndReload(recurringExpenseId),
            )
          }
          onUpdate={async (recurringExpenseId, input) =>
            applyRecurringExpenseActionResult(
              await updateRecurringExpenseAndReload(recurringExpenseId, input),
            )
          }
          recurringExpenses={financeData.snapshot.recurringExpenses}
        />
      )}
      {currentRouteId === "categories" && (
        <CategoriesPage
          categories={financeData.snapshot.categories}
          categorySpend={financeData.overview.categorySpend}
          displayCurrency={financeData.overview.displayCurrency}
        />
      )}
      {currentRouteId === "settings" && (
        <SettingsPage
          currencySettings={financeData.snapshot.currencySettings}
          errorMessage={financeData.errorMessage}
          onExportLocalBackup={exportLocalJsonBackupForDownload}
          onExportLocalCsv={exportLocalCsvForDownload}
          onPreviewLocalBackupRestore={previewLocalJsonBackupRestoreFromText}
          onPreviewRecurringCsvImport={previewRecurringCsvImportFromText}
          onPreviewTransactionCsvImport={previewTransactionCsvImportFromText}
          onConfirmTransactionCsvImport={async (preview) =>
            applyTransactionCsvImportActionResult(
              await confirmTransactionCsvImportAndReload(preview),
            )
          }
          onConfirmRecurringCsvImport={async (preview) =>
            applyRecurringCsvImportActionResult(
              await confirmRecurringCsvImportAndReload(preview),
            )
          }
          onResetLocalData={async () =>
            applyLocalDataResetActionResult(await resetLocalDataAndReload())
          }
          onRestoreLocalBackup={async (backup) =>
            applyLocalBackupRestoreActionResult(
              await restoreLocalJsonBackupAndReload(backup),
            )
          }
          onUpdateCurrencySettings={async (settings) =>
            applyCurrencySettingsActionResult(
              await updateCurrencySettingsAndReload(settings),
            )
          }
          snapshot={financeData.snapshot}
          status={financeData.status}
          storageMode={financeData.storageMode}
        />
      )}
    </AppShell>
  );
}
