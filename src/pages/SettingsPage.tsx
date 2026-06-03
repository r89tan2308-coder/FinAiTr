import { Database, ShieldCheck, Smartphone } from "lucide-react";
import { PageSection } from "../components/PageSection";
import { type FinanceSnapshot } from "../domain/models";
import {
  type FinanceLoadStatus,
  type FinanceStorageMode,
} from "../services/financeDataService";

interface SettingsPageProps {
  errorMessage?: string;
  snapshot: FinanceSnapshot;
  status: FinanceLoadStatus;
  storageMode: FinanceStorageMode;
}

export function SettingsPage({
  errorMessage,
  snapshot,
  status,
  storageMode,
}: SettingsPageProps) {
  const settingsItems = [
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
          snapshot.categories.length +
          snapshot.recurringExpenses.length,
      ),
    },
  ];

  return (
    <div className="page-stack">
      {status === "error" && (
        <div className="status-banner" role="status">
          {errorMessage ?? "Local data could not be loaded."}
        </div>
      )}
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
