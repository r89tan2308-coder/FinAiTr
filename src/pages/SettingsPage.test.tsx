import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { buildFinanceOverview } from "../domain/financeViews";
import { SettingsPage } from "./SettingsPage";
import {
  type LocalBackupExportActionResult,
  type LocalDataResetActionResult,
  type LocalJsonBackup,
} from "../services/financeDataService";

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;
const seedSnapshot = createSeedFinanceSnapshot();
const seedRecordCount = String(
  seedSnapshot.accounts.length +
    seedSnapshot.transactions.length +
    seedSnapshot.receipts.length +
    seedSnapshot.receiptItems.length +
    seedSnapshot.receiptDrafts.length +
    seedSnapshot.receiptDraftItems.length +
    seedSnapshot.categories.length +
    seedSnapshot.recurringExpenses.length,
);

describe("SettingsPage local data tools", () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    vi.restoreAllMocks();
  });

  it("downloads a versioned JSON backup from the export action", async () => {
    const user = userEvent.setup();
    const backup = buildTestBackup();
    const createObjectUrl = vi.fn<(blob: Blob) => string>(
      () => "blob:finaitr-backup",
    );
    const revokeObjectUrl = vi.fn<(url: string) => void>();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const onExportLocalBackup = vi.fn(
      async (): Promise<LocalBackupExportActionResult> => ({
        backup,
        filename: "finaitr-backup-test.json",
        ok: true,
      }),
    );

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    renderSettingsPage({ onExportLocalBackup });

    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(onExportLocalBackup).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(createObjectUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:finaitr-backup");
    expect(screen.getByRole("status")).toHaveTextContent("Backup JSON exported.");
  });

  it("requires strong confirmation before reset and reports success", async () => {
    const user = userEvent.setup();
    const onResetLocalData = vi.fn(
      async (): Promise<LocalDataResetActionResult> => ({
        data: {
          overview: buildFinanceOverview(seedSnapshot),
          snapshot: seedSnapshot,
          status: "ready",
          storageMode: "indexeddb",
        },
        ok: true,
      }),
    );

    renderSettingsPage({ onResetLocalData });

    const resetButton = screen.getByRole("button", { name: "Reset local data" });
    const confirmationInput = screen.getByLabelText("Reset confirmation");

    expect(screen.getByText(seedRecordCount)).toBeInTheDocument();
    expect(resetButton).toBeDisabled();

    await user.type(confirmationInput, "RESET");

    expect(resetButton).toBeDisabled();
    expect(onResetLocalData).not.toHaveBeenCalled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, "RESET LOCAL DATA");

    expect(resetButton).toBeEnabled();

    await user.click(resetButton);

    expect(onResetLocalData).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Local data reset to baseline.",
      ),
    );
    expect(confirmationInput).toHaveValue("");
  });

  it("does not allow reset in seed fallback mode", async () => {
    renderSettingsPage({ storageMode: "seed_fallback" });

    const confirmationInput = screen.getByLabelText("Reset confirmation");

    await userEvent.type(confirmationInput, "RESET LOCAL DATA");

    expect(screen.getByRole("button", { name: "Reset local data" })).toBeDisabled();
  });
});

interface RenderSettingsOptions {
  onExportLocalBackup?: () => Promise<LocalBackupExportActionResult>;
  onResetLocalData?: () => Promise<LocalDataResetActionResult>;
  storageMode?: "indexeddb" | "seed_fallback";
}

function renderSettingsPage(options: RenderSettingsOptions = {}) {
  return render(
    <SettingsPage
      currencySettings={seedSnapshot.currencySettings}
      onExportLocalBackup={
        options.onExportLocalBackup ??
        (async () => ({
          backup: buildTestBackup(),
          filename: "finaitr-backup-test.json",
          ok: true,
        }))
      }
      onResetLocalData={
        options.onResetLocalData ??
        (async () => ({
          data: {
            overview: buildFinanceOverview(seedSnapshot),
            snapshot: seedSnapshot,
            status: "ready",
            storageMode: "indexeddb",
          },
          ok: true,
        }))
      }
      onUpdateCurrencySettings={async () => ({ ok: true })}
      snapshot={seedSnapshot}
      status="ready"
      storageMode={options.storageMode ?? "indexeddb"}
    />,
  );
}

function buildTestBackup(): LocalJsonBackup {
  return {
    app: {
      name: "finaitr",
      version: "0.1.0",
    },
    exportedAt: "2026-06-05T10:00:00.000Z",
    schemaVersion: 1,
    seedVersion: 1,
    storageMode: "indexeddb",
    tables: {
      accounts: seedSnapshot.accounts,
      appMeta: [],
      categories: seedSnapshot.categories,
      receiptDraftItems: seedSnapshot.receiptDraftItems,
      receiptDrafts: seedSnapshot.receiptDrafts,
      receiptItems: seedSnapshot.receiptItems,
      receipts: seedSnapshot.receipts,
      recurringExpenses: seedSnapshot.recurringExpenses,
      settings: {
        currencySettings: seedSnapshot.currencySettings,
      },
      transactions: seedSnapshot.transactions,
    },
  };
}
