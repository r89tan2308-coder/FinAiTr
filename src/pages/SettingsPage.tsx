import { Database, Save, ShieldCheck, Smartphone } from "lucide-react";
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
} from "../services/financeDataService";

interface SettingsPageProps {
  currencySettings: CurrencySettings;
  errorMessage?: string;
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

export function SettingsPage({
  currencySettings,
  errorMessage,
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
