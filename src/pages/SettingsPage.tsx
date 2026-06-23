import {
  AlertTriangle,
  Database,
  Download,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { PageSection } from "../components/PageSection";
import { defaultCurrencySettings } from "../domain/currencySettings";
import {
  type CurrencySettings,
  type FinanceSnapshot,
  type SupportedCurrencyCode,
} from "../domain/models";
import {
  type CurrencySettingsActionResult,
  type FinanceLoadStatus,
  type FinanceStorageMode,
  type LocalBackupExportActionResult,
  type LocalBackupRestoreActionResult,
  type LocalBackupRestorePreviewActionResult,
  type LocalCsvExportActionResult,
  type LocalCsvExportKind,
  type TransactionCsvImportActionResult,
  type TransactionCsvImportPreview,
  type TransactionCsvImportPreviewActionResult,
  type LocalDataResetActionResult,
  type LocalJsonBackup,
  type LocalJsonRestorePreview,
} from "../services/financeDataService";

interface SettingsPageProps {
  currencySettings: CurrencySettings;
  errorMessage?: string;
  onExportLocalBackup: () => Promise<LocalBackupExportActionResult>;
  onExportLocalCsv: (
    kind: LocalCsvExportKind,
  ) => Promise<LocalCsvExportActionResult>;
  onConfirmTransactionCsvImport: (
    preview: TransactionCsvImportPreview,
  ) => Promise<TransactionCsvImportActionResult>;
  onPreviewLocalBackupRestore: (
    rawJson: string,
  ) => Promise<LocalBackupRestorePreviewActionResult>;
  onPreviewTransactionCsvImport: (
    rawCsv: string,
  ) => Promise<TransactionCsvImportPreviewActionResult>;
  onResetLocalData: () => Promise<LocalDataResetActionResult>;
  onRestoreLocalBackup: (
    backup: LocalJsonBackup,
  ) => Promise<LocalBackupRestoreActionResult>;
  onUpdateCurrencySettings: (
    settings: CurrencySettings,
  ) => Promise<CurrencySettingsActionResult>;
  snapshot: FinanceSnapshot;
  status: FinanceLoadStatus;
  storageMode: FinanceStorageMode;
}

interface CurrencyFormValues {
  displayCurrency: SupportedCurrencyCode;
  EUR: string;
  GBP: string;
  USD: string;
}

const resetConfirmationPhrase = "RESET LOCAL DATA";
const restoreConfirmationPhrase = "RESTORE LOCAL DATA";
const transactionCsvImportConfirmationPhrase = "IMPORT TRANSACTIONS CSV";
const csvExportLabels: Record<LocalCsvExportKind, string> = {
  confirmed_receipt_items: "Confirmed receipt items",
  recurring_expenses: "Recurring expenses",
  transactions: "Transactions",
};

export function SettingsPage({
  currencySettings,
  errorMessage,
  onExportLocalBackup,
  onExportLocalCsv,
  onPreviewLocalBackupRestore,
  onPreviewTransactionCsvImport,
  onResetLocalData,
  onRestoreLocalBackup,
  onConfirmTransactionCsvImport,
  onUpdateCurrencySettings,
  snapshot,
  status,
  storageMode,
}: SettingsPageProps) {
  const [currencyForm, setCurrencyForm] = useState(() =>
    currencySettingsToFormValues(currencySettings),
  );
  const [currencyMessage, setCurrencyMessage] = useState<string>();
  const [currencyError, setCurrencyError] = useState<string>();
  const [currencySaveStatus, setCurrencySaveStatus] = useState<
    "idle" | "saving"
  >("idle");
  const [backupStatus, setBackupStatus] = useState<"idle" | "exporting">("idle");
  const [csvExportStatus, setCsvExportStatus] = useState<
    "idle" | LocalCsvExportKind
  >("idle");
  const [transactionCsvConfirmation, setTransactionCsvConfirmation] = useState("");
  const [transactionCsvPreview, setTransactionCsvPreview] =
    useState<TransactionCsvImportPreview>();
  const [transactionCsvStatus, setTransactionCsvStatus] = useState<
    "idle" | "previewing" | "importing"
  >("idle");
  const [localDataMessage, setLocalDataMessage] = useState<string>();
  const [localDataError, setLocalDataError] = useState<string>();
  const [restoreBackup, setRestoreBackup] = useState<LocalJsonBackup>();
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restorePreview, setRestorePreview] = useState<LocalJsonRestorePreview>();
  const [restoreStatus, setRestoreStatus] = useState<
    "idle" | "previewing" | "restoring"
  >("idle");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "resetting">("idle");

  useEffect(() => {
    setCurrencyForm(currencySettingsToFormValues(currencySettings));
  }, [currencySettings]);

  const settingsItems = useMemo(
    () => [
      {
        icon: Database,
        label: "Storage",
        value: storageMode === "indexeddb" ? "IndexedDB" : "Seed fallback",
      },
      { icon: Smartphone, label: "PWA", value: "Ready" },
      { icon: ShieldCheck, label: "Integrations", value: "Mock only" },
      {
        icon: Database,
        label: "Records",
        value: String(
          snapshot.accounts.length +
            snapshot.transactions.length +
            snapshot.receipts.length +
            snapshot.receiptItems.length +
            snapshot.receiptDrafts.length +
            snapshot.receiptDraftItems.length +
            snapshot.categories.length +
            snapshot.recurringExpenses.length,
        ),
      },
    ],
    [
      snapshot.accounts.length,
      snapshot.categories.length,
      snapshot.receiptDraftItems.length,
      snapshot.receiptDrafts.length,
      snapshot.receiptItems.length,
      snapshot.receipts.length,
      snapshot.recurringExpenses.length,
      snapshot.transactions.length,
      storageMode,
    ],
  );

  function updateCurrencyForm<K extends keyof CurrencyFormValues>(
    field: K,
    value: CurrencyFormValues[K],
  ): void {
    setCurrencyForm((current) => ({ ...current, [field]: value }));
    setCurrencyError(undefined);
    setCurrencyMessage(undefined);
  }

  async function saveCurrencySettings(): Promise<void> {
    const nextSettings = buildCurrencySettings(currencyForm, currencySettings);

    if (!nextSettings) {
      setCurrencyError("Rates must be greater than zero.");
      setCurrencyMessage(undefined);
      return;
    }

    setCurrencySaveStatus("saving");
    setCurrencyError(undefined);
    setCurrencyMessage(undefined);

    const result = await onUpdateCurrencySettings(nextSettings);

    setCurrencySaveStatus("idle");

    if (result.ok) {
      setCurrencyMessage("Currency settings saved.");
      return;
    }

    setCurrencyError(result.errorMessage ?? "Currency settings could not be saved.");
  }

  async function exportBackup(): Promise<void> {
    setBackupStatus("exporting");
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    try {
      const result = await onExportLocalBackup();

      if (result.ok && result.backup) {
        downloadJsonBackup(
          result.backup,
          result.filename ?? `finaitr-backup-${Date.now()}.json`,
        );
        setLocalDataMessage("Backup JSON exported.");
        return;
      }

      setLocalDataError(result.errorMessage ?? "Local backup could not be exported.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error
          ? error.message
          : "Local backup could not be exported.",
      );
    } finally {
      setBackupStatus("idle");
    }
  }

  async function exportCsv(kind: LocalCsvExportKind): Promise<void> {
    setCsvExportStatus(kind);
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    try {
      const result = await onExportLocalCsv(kind);

      if (result.ok && result.csv) {
        downloadTextFile(
          result.csv.content,
          result.csv.filename,
          "text/csv;charset=utf-8",
        );
        setLocalDataMessage(`${csvExportLabels[kind]} CSV exported.`);
        return;
      }

      setLocalDataError(result.errorMessage ?? "Local CSV could not be exported.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error ? error.message : "Local CSV could not be exported.",
      );
    } finally {
      setCsvExportStatus("idle");
    }
  }

  async function previewTransactionCsvImport(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFile = event.target.files?.[0];

    setTransactionCsvConfirmation("");
    setTransactionCsvPreview(undefined);
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    if (!selectedFile) {
      return;
    }

    setTransactionCsvStatus("previewing");

    try {
      const rawCsv = await readTextFile(
        selectedFile,
        "Transaction CSV file could not be read.",
      );
      const result = await onPreviewTransactionCsvImport(rawCsv);

      if (result.ok && result.preview) {
        setTransactionCsvPreview(result.preview);

        if (
          result.preview.fileErrors.length > 0 ||
          result.preview.errorCount > 0
        ) {
          setLocalDataError("Transaction CSV has errors. Fix the file before import.");
          return;
        }

        setLocalDataMessage("Transaction CSV validated. Review rows before import.");
        return;
      }

      setLocalDataError(
        result.errorMessage ?? "Transaction CSV file could not be validated.",
      );
    } catch (error) {
      setLocalDataError(
        error instanceof Error
          ? error.message
          : "Transaction CSV file could not be validated.",
      );
    } finally {
      setTransactionCsvStatus("idle");
    }
  }

  async function importTransactionCsv(): Promise<void> {
    if (!transactionCsvPreview) {
      setLocalDataError("Select a valid transaction CSV file before import.");
      setLocalDataMessage(undefined);
      return;
    }

    if (transactionCsvConfirmation !== transactionCsvImportConfirmationPhrase) {
      setLocalDataError(`Type ${transactionCsvImportConfirmationPhrase} before import.`);
      setLocalDataMessage(undefined);
      return;
    }

    setTransactionCsvStatus("importing");
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    try {
      const result = await onConfirmTransactionCsvImport(transactionCsvPreview);

      if (result.ok) {
        setTransactionCsvConfirmation("");
        setTransactionCsvPreview(undefined);
        setLocalDataMessage(
          `Imported ${result.importedCount ?? 0} transactions from CSV.`,
        );
        return;
      }

      setLocalDataError(result.errorMessage ?? "Transaction CSV could not be imported.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error
          ? error.message
          : "Transaction CSV could not be imported.",
      );
    } finally {
      setTransactionCsvStatus("idle");
    }
  }
  async function previewRestoreBackup(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFile = event.target.files?.[0];

    setRestoreBackup(undefined);
    setRestoreConfirmation("");
    setRestorePreview(undefined);
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    if (!selectedFile) {
      return;
    }

    setRestoreStatus("previewing");

    try {
      const rawJson = await readTextFile(selectedFile);
      const result = await onPreviewLocalBackupRestore(rawJson);

      if (result.ok && result.backup && result.preview) {
        setRestoreBackup(result.backup);
        setRestorePreview(result.preview);
        setLocalDataMessage("Backup JSON validated. Review summary before restore.");
        return;
      }

      setLocalDataError(result.errorMessage ?? "Backup file could not be validated.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error
          ? error.message
          : "Backup file could not be validated.",
      );
    } finally {
      setRestoreStatus("idle");
    }
  }

  async function restoreLocalBackup(): Promise<void> {
    if (!restoreBackup) {
      setLocalDataError("Select a valid backup file before restore.");
      setLocalDataMessage(undefined);
      return;
    }

    if (restoreConfirmation !== restoreConfirmationPhrase) {
      setLocalDataError(`Type ${restoreConfirmationPhrase} before restore.`);
      setLocalDataMessage(undefined);
      return;
    }

    setRestoreStatus("restoring");
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    try {
      const result = await onRestoreLocalBackup(restoreBackup);

      if (result.ok) {
        setRestoreBackup(undefined);
        setRestoreConfirmation("");
        setRestorePreview(undefined);
        setCurrencyForm(
          currencySettingsToFormValues(
            result.data?.snapshot.currencySettings ?? currencySettings,
          ),
        );
        setLocalDataMessage("Backup restored. Local data reloaded.");
        return;
      }

      setLocalDataError(result.errorMessage ?? "Local backup could not be restored.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error
          ? error.message
          : "Local backup could not be restored.",
      );
    } finally {
      setRestoreStatus("idle");
    }
  }

  async function resetLocalData(): Promise<void> {
    if (resetConfirmation !== resetConfirmationPhrase) {
      setLocalDataError(`Type ${resetConfirmationPhrase} before reset.`);
      setLocalDataMessage(undefined);
      return;
    }

    setResetStatus("resetting");
    setLocalDataError(undefined);
    setLocalDataMessage(undefined);

    try {
      const result = await onResetLocalData();

      if (result.ok) {
        setResetConfirmation("");
        setCurrencyForm(
          currencySettingsToFormValues(
            result.data?.snapshot.currencySettings ?? currencySettings,
          ),
        );
        setLocalDataMessage("Local data reset to baseline.");
        return;
      }

      setLocalDataError(result.errorMessage ?? "Local data could not be reset.");
    } catch (error) {
      setLocalDataError(
        error instanceof Error ? error.message : "Local data could not be reset.",
      );
    } finally {
      setResetStatus("idle");
    }
  }

  return (
    <div className="page-stack">
      {status === "error" && (
        <div className="status-banner" role="status">
          {errorMessage ?? "Local data could not be loaded."}
        </div>
      )}
      <PageSection title="Currency">
        <div className="form-panel currency-settings-panel">
          {currencyMessage && (
            <div className="success-banner" role="status">
              {currencyMessage}
            </div>
          )}
          {currencyError && (
            <div className="status-banner" role="alert">
              {currencyError}
            </div>
          )}

          <div className="form-grid">
            <label className="field">
              <span>Display currency</span>
              <select
                aria-label="Display currency"
                onChange={(event) =>
                  updateCurrencyForm(
                    "displayCurrency",
                    event.target.value as SupportedCurrencyCode,
                  )
                }
                value={currencyForm.displayCurrency}
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>

            <label className="field">
              <span>USD to RUB</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateCurrencyForm("USD", event.target.value)}
                step="0.0001"
                type="number"
                value={currencyForm.USD}
              />
            </label>

            <label className="field">
              <span>RUB to RUB</span>
              <input disabled readOnly value="1" />
            </label>

            <label className="field">
              <span>EUR to RUB</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateCurrencyForm("EUR", event.target.value)}
                step="0.0001"
                type="number"
                value={currencyForm.EUR}
              />
            </label>

            <label className="field">
              <span>GBP to RUB</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateCurrencyForm("GBP", event.target.value)}
                step="0.0001"
                type="number"
                value={currencyForm.GBP}
              />
            </label>
          </div>

          <p className="settings-note">
            {currencySettings.source} Updated {formatDateTime(currencySettings.updatedAt)}.
          </p>

          <div className="form-actions">
            <button
              className="primary-button"
              disabled={currencySaveStatus === "saving"}
              onClick={() => void saveCurrencySettings()}
              type="button"
            >
              <Save aria-hidden="true" size={18} />
              {currencySaveStatus === "saving" ? "Saving" : "Save currency"}
            </button>
          </div>
        </div>
      </PageSection>

      <PageSection title="Local data">
        <div className="form-panel local-data-panel">
          {localDataMessage && (
            <div className="success-banner" role="status">
              {localDataMessage}
            </div>
          )}
          {localDataError && (
            <div className="status-banner" role="alert">
              {localDataError}
            </div>
          )}

          <div className="settings-action-grid">
            <div className="settings-action-block">
              <strong>JSON backup</strong>
              <p className="settings-note">
                Export a local JSON file with accounts, categories, transactions,
                receipts, receipt drafts, recurring expenses, currency rates, and
                metadata.
              </p>
              <button
                className="secondary-button"
                disabled={backupStatus === "exporting"}
                onClick={() => void exportBackup()}
                type="button"
              >
                <Download aria-hidden="true" size={18} />
                {backupStatus === "exporting" ? "Exporting" : "Export JSON"}
              </button>
            </div>

            <div className="settings-action-block">
              <strong>CSV exports</strong>
              <p className="settings-note">
                Download read-only CSV files for transactions, confirmed receipt
                items, and recurring expenses.
              </p>
              <div className="form-actions">
                <button
                  className="secondary-button"
                  disabled={csvExportStatus !== "idle"}
                  onClick={() => void exportCsv("transactions")}
                  type="button"
                >
                  <Download aria-hidden="true" size={18} />
                  {csvExportStatus === "transactions"
                    ? "Exporting"
                    : "Export transactions CSV"}
                </button>
                <button
                  className="secondary-button"
                  disabled={csvExportStatus !== "idle"}
                  onClick={() => void exportCsv("confirmed_receipt_items")}
                  type="button"
                >
                  <Download aria-hidden="true" size={18} />
                  {csvExportStatus === "confirmed_receipt_items"
                    ? "Exporting"
                    : "Export receipt items CSV"}
                </button>
                <button
                  className="secondary-button"
                  disabled={csvExportStatus !== "idle"}
                  onClick={() => void exportCsv("recurring_expenses")}
                  type="button"
                >
                  <Download aria-hidden="true" size={18} />
                  {csvExportStatus === "recurring_expenses"
                    ? "Exporting"
                    : "Export recurring CSV"}
                </button>
              </div>
            </div>

            <div className="settings-action-block">
              <strong>CSV transaction import</strong>
              <p className="settings-note">
                Preview transaction rows from a local CSV file before writing them
                to IndexedDB.
              </p>
              <label className="field">
                <span>Transactions CSV file</span>
                <input
                  accept=".csv,text/csv"
                  aria-label="Transactions CSV file"
                  disabled={transactionCsvStatus !== "idle"}
                  onChange={(event) => void previewTransactionCsvImport(event)}
                  type="file"
                />
              </label>

              {transactionCsvPreview && (
                <div className="settings-restore-preview" role="status">
                  <strong>Transaction CSV preview</strong>
                  <span>
                    {transactionCsvPreview.rowCount} rows, {transactionCsvPreview.validRowCount}{" "}
                    valid, {transactionCsvPreview.errorCount} errors,{" "}
                    {transactionCsvPreview.warningCount} warnings
                  </span>
                  <div className="settings-preview-grid">
                    <span>Importable {transactionCsvPreview.importableRows.length}</span>
                    <span>Duplicates {transactionCsvPreview.duplicateCount}</span>
                    <span>File errors {transactionCsvPreview.fileErrors.length}</span>
                    <span>Columns {transactionCsvPreview.headers.length}</span>
                  </div>
                  {transactionCsvPreview.fileErrors.length > 0 && (
                    <ul>
                      {transactionCsvPreview.fileErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                  <div className="settings-import-rows">
                    {transactionCsvPreview.rows.map((row) => (
                      <article
                        className={importPreviewRowClassName(row)}
                        key={row.rowNumber}
                      >
                        <strong>Row {row.rowNumber}</strong>
                        <span>{formatCsvImportRowSummary(row)}</span>
                        {row.errors.length > 0 && (
                          <ul aria-label={`Row ${row.rowNumber} errors`}>
                            {row.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {row.warnings.length > 0 && (
                          <ul aria-label={`Row ${row.rowNumber} warnings`}>
                            {row.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <label className="field">
                <span>Transaction CSV confirmation</span>
                <input
                  aria-label="Transaction CSV confirmation"
                  onChange={(event) => {
                    setTransactionCsvConfirmation(event.target.value);
                    setLocalDataError(undefined);
                    setLocalDataMessage(undefined);
                  }}
                  placeholder={transactionCsvImportConfirmationPhrase}
                  value={transactionCsvConfirmation}
                />
              </label>
              <button
                className="primary-button"
                disabled={
                  transactionCsvStatus !== "idle" ||
                  !transactionCsvPreview?.canImport ||
                  transactionCsvConfirmation !== transactionCsvImportConfirmationPhrase ||
                  storageMode !== "indexeddb"
                }
                onClick={() => void importTransactionCsv()}
                type="button"
              >
                <Upload aria-hidden="true" size={18} />
                {transactionCsvStatus === "importing"
                  ? "Importing"
                  : "Import transactions CSV"}
              </button>
            </div>

            <div className="settings-action-block settings-danger-block">
              <div className="settings-warning-title">
                <Upload aria-hidden="true" size={20} />
                <strong>Restore JSON backup</strong>
              </div>
              <p className="settings-note">
                Import a FinAiTr backup JSON file, review its summary, then type the
                confirmation phrase to replace local app data on this device.
              </p>
              <label className="field">
                <span>Backup JSON file</span>
                <input
                  accept="application/json,.json"
                  aria-label="Backup JSON file"
                  disabled={restoreStatus === "previewing" || restoreStatus === "restoring"}
                  onChange={(event) => void previewRestoreBackup(event)}
                  type="file"
                />
              </label>

              {restorePreview && (
                <div className="settings-restore-preview" role="status">
                  <strong>Restore preview</strong>
                  <span>
                    {restorePreview.app.name} {restorePreview.app.version} exported{" "}
                    {formatDateTime(restorePreview.exportedAt)}
                  </span>
                  <span>
                    {restorePreview.recordCounts.total} records, display currency{" "}
                    {restorePreview.displayCurrency}
                  </span>
                  <div className="settings-preview-grid">
                    <span>Accounts {restorePreview.recordCounts.accounts}</span>
                    <span>Categories {restorePreview.recordCounts.categories}</span>
                    <span>Transactions {restorePreview.recordCounts.transactions}</span>
                    <span>Receipts {restorePreview.recordCounts.receipts}</span>
                    <span>Items {restorePreview.recordCounts.receiptItems}</span>
                    <span>Drafts {restorePreview.recordCounts.receiptDrafts}</span>
                    <span>Recurring {restorePreview.recordCounts.recurringExpenses}</span>
                  </div>
                  {restorePreview.warnings.length > 0 && (
                    <ul>
                      {restorePreview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <label className="field">
                <span>Restore confirmation</span>
                <input
                  aria-label="Restore confirmation"
                  onChange={(event) => {
                    setRestoreConfirmation(event.target.value);
                    setLocalDataError(undefined);
                    setLocalDataMessage(undefined);
                  }}
                  placeholder={restoreConfirmationPhrase}
                  value={restoreConfirmation}
                />
              </label>
              <button
                className="danger-button"
                disabled={
                  restoreStatus === "previewing" ||
                  restoreStatus === "restoring" ||
                  !restoreBackup ||
                  restoreConfirmation !== restoreConfirmationPhrase ||
                  storageMode !== "indexeddb"
                }
                onClick={() => void restoreLocalBackup()}
                type="button"
              >
                <Upload aria-hidden="true" size={18} />
                {restoreStatus === "restoring" ? "Restoring" : "Restore backup"}
              </button>
            </div>

            <div className="settings-action-block settings-danger-block">
              <div className="settings-warning-title">
                <AlertTriangle aria-hidden="true" size={20} />
                <strong>Reset local data</strong>
              </div>
              <p className="settings-note">
                This clears app-owned IndexedDB data on this device and restores the
                baseline seed records. It cannot be undone from inside the app.
              </p>
              <label className="field">
                <span>Reset confirmation</span>
                <input
                  aria-label="Reset confirmation"
                  onChange={(event) => {
                    setResetConfirmation(event.target.value);
                    setLocalDataError(undefined);
                    setLocalDataMessage(undefined);
                  }}
                  placeholder={resetConfirmationPhrase}
                  value={resetConfirmation}
                />
              </label>
              <button
                className="danger-button"
                disabled={
                  resetStatus === "resetting" ||
                  resetConfirmation !== resetConfirmationPhrase ||
                  storageMode !== "indexeddb"
                }
                onClick={() => void resetLocalData()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} />
                {resetStatus === "resetting" ? "Resetting" : "Reset local data"}
              </button>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection title="App status">
        <div className="settings-list">
          {settingsItems.map((item) => (
            <article className="settings-row" key={item.label}>
              <item.icon aria-hidden="true" size={21} />
              <div>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}

function formatCsvImportRowSummary(
  row: TransactionCsvImportPreview["rows"][number],
): string {
  if (!row.input) {
    return "Not importable";
  }

  return [
    row.input.date,
    row.input.merchant,
    `${row.input.amount} ${row.input.currency}`,
    row.input.accountId,
    row.input.categoryId,
  ].join(" - ");
}

function importPreviewRowClassName(
  row: TransactionCsvImportPreview["rows"][number],
): string {
  if (row.errors.length > 0) {
    return "settings-import-row settings-import-row-error";
  }

  if (row.warnings.length > 0) {
    return "settings-import-row settings-import-row-warning";
  }

  return "settings-import-row";
}

function currencySettingsToFormValues(
  settings: CurrencySettings,
): CurrencyFormValues {
  return {
    displayCurrency: settings.displayCurrency,
    EUR: String(settings.ratesToRub.EUR),
    GBP: String(settings.ratesToRub.GBP),
    USD: String(settings.ratesToRub.USD),
  };
}

function buildCurrencySettings(
  formValues: CurrencyFormValues,
  currentSettings: CurrencySettings,
): CurrencySettings | undefined {
  const usdRate = Number(formValues.USD);
  const eurRate = Number(formValues.EUR);
  const gbpRate = Number(formValues.GBP);

  if (
    !isValidRate(usdRate) ||
    !isValidRate(eurRate) ||
    !isValidRate(gbpRate)
  ) {
    return undefined;
  }

  return {
    displayCurrency: formValues.displayCurrency,
    ratesToRub: {
      USD: roundRate(usdRate),
      RUB: 1,
      EUR: roundRate(eurRate),
      GBP: roundRate(gbpRate),
    },
    source: currentSettings.source || defaultCurrencySettings.source,
    updatedAt: currentSettings.updatedAt,
  };
}

function isValidRate(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function formatDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function readTextFile(
  file: File,
  errorMessage = "Backup file could not be read.",
): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => {
      reject(new Error(errorMessage));
    });
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.readAsText(file);
  });
}

function downloadJsonBackup(backup: unknown, filename: string): void {
  downloadTextFile(JSON.stringify(backup, null, 2), filename, "application/json");
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
