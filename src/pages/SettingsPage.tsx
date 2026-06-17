import {
  AlertTriangle,
  Database,
  Download,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  type LocalDataResetActionResult,
} from "../services/financeDataService";

interface SettingsPageProps {
  currencySettings: CurrencySettings;
  errorMessage?: string;
  onExportLocalBackup: () => Promise<LocalBackupExportActionResult>;
  onResetLocalData: () => Promise<LocalDataResetActionResult>;
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

export function SettingsPage({
  currencySettings,
  errorMessage,
  onExportLocalBackup,
  onResetLocalData,
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
  const [localDataMessage, setLocalDataMessage] = useState<string>();
  const [localDataError, setLocalDataError] = useState<string>();
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

function downloadJsonBackup(backup: unknown, filename: string): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
