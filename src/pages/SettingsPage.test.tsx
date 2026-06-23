import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { buildFinanceOverview } from "../domain/financeViews";
import { SettingsPage } from "./SettingsPage";
import {
  type LocalBackupExportActionResult,
  type LocalBackupRestoreActionResult,
  type LocalBackupRestorePreviewActionResult,
  type LocalCsvExportActionResult,
  type LocalCsvExportKind,
  type LocalDataResetActionResult,
  type LocalJsonBackup,
  type RecurringCsvImportActionResult,
  type RecurringCsvImportPreview,
  type RecurringCsvImportPreviewActionResult,
  type TransactionCsvImportActionResult,
  type TransactionCsvImportPreview,
  type TransactionCsvImportPreviewActionResult,
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

  it("downloads a transactions CSV from the export action", async () => {
    const user = userEvent.setup();
    const csv = {
      content: "transaction_id,date\r\ntx-1,2026-06-01\r\n",
      exportedAt: "2026-06-22T10:11:12.000Z",
      filename: "finaitr-transactions-test.csv",
      kind: "transactions" as const,
      rowCount: 1,
    };
    const createObjectUrl = vi.fn<(blob: Blob) => string>(
      () => "blob:finaitr-csv",
    );
    const revokeObjectUrl = vi.fn<(url: string) => void>();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const onExportLocalCsv = vi.fn(
      async (kind: LocalCsvExportKind): Promise<LocalCsvExportActionResult> => {
        expect(kind).toBe("transactions");

        return {
          csv,
          ok: true,
        };
      },
    );

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    renderSettingsPage({ onExportLocalCsv });

    await user.click(
      screen.getByRole("button", { name: "Export transactions CSV" }),
    );

    expect(onExportLocalCsv).toHaveBeenCalledWith("transactions");
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    await expect(readBlobText(createObjectUrl.mock.calls[0][0])).resolves.toBe(
      csv.content,
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:finaitr-csv");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Transactions CSV exported.",
    );
  });

  it("previews a transactions CSV and requires strong confirmation before import", async () => {
    const user = userEvent.setup();
    const preview = buildTestTransactionCsvPreview();
    const onPreviewTransactionCsvImport = vi.fn(
      async (rawCsv: string): Promise<TransactionCsvImportPreviewActionResult> => {
        expect(rawCsv).toContain("Preview Merchant");

        return {
          ok: true,
          preview,
        };
      },
    );
    const onConfirmTransactionCsvImport = vi.fn(
      async (): Promise<TransactionCsvImportActionResult> => ({
        data: {
          overview: buildFinanceOverview(seedSnapshot),
          snapshot: seedSnapshot,
          status: "ready",
          storageMode: "indexeddb",
        },
        importedCount: 1,
        ok: true,
      }),
    );

    renderSettingsPage({
      onConfirmTransactionCsvImport,
      onPreviewTransactionCsvImport,
    });

    const importButton = screen.getByRole("button", {
      name: "Import transactions CSV",
    });
    const confirmationInput = screen.getByLabelText("Transaction CSV confirmation");
    const csvFile = new File(
      [
        "date,merchant,account_name,category_name,amount,currency\r\n" +
          "2026-06-10,Preview Merchant,Everyday card,Software,12,USD\r\n",
      ],
      "transactions.csv",
      { type: "text/csv" },
    );

    expect(importButton).toBeDisabled();

    await user.upload(screen.getByLabelText("Transactions CSV file"), csvFile);

    await waitFor(() =>
      expect(onPreviewTransactionCsvImport).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText("Transaction CSV preview")).toBeInTheDocument();
    expect(
      screen.getByText(/1 rows, 1 valid, 0 errors, 1 warnings/),
    ).toBeInTheDocument();
    expect(screen.getByText("Likely duplicate of an existing transaction.")).toBeInTheDocument();
    expect(importButton).toBeDisabled();

    await user.type(confirmationInput, "IMPORT");

    expect(importButton).toBeDisabled();
    expect(onConfirmTransactionCsvImport).not.toHaveBeenCalled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, "IMPORT TRANSACTIONS CSV");

    expect(importButton).toBeEnabled();

    await user.click(importButton);

    expect(onConfirmTransactionCsvImport).toHaveBeenCalledWith(preview);
    await waitFor(() =>
      expect(screen.getByText("Imported 1 transactions from CSV.")).toBeInTheDocument(),
    );
  });

  it("previews a recurring CSV and requires strong confirmation before import", async () => {
    const user = userEvent.setup();
    const preview = buildTestRecurringCsvPreview();
    const onPreviewRecurringCsvImport = vi.fn(
      async (rawCsv: string): Promise<RecurringCsvImportPreviewActionResult> => {
        expect(rawCsv).toContain("Preview SaaS");

        return {
          ok: true,
          preview,
        };
      },
    );
    const onConfirmRecurringCsvImport = vi.fn(
      async (): Promise<RecurringCsvImportActionResult> => ({
        data: {
          overview: buildFinanceOverview(seedSnapshot),
          snapshot: seedSnapshot,
          status: "ready",
          storageMode: "indexeddb",
        },
        importedCount: 1,
        ok: true,
      }),
    );

    renderSettingsPage({
      onConfirmRecurringCsvImport,
      onPreviewRecurringCsvImport,
    });

    const importButton = screen.getByRole("button", {
      name: "Import recurring CSV",
    });
    const confirmationInput = screen.getByLabelText("Recurring CSV confirmation");
    const csvFile = new File(
      [
        "name,merchant,account_name,category_name,frequency,next_due_date,amount,currency\r\n" +
          "Preview SaaS,Preview SaaS,Everyday card,Software,monthly,2026-06-28,12,USD\r\n",
      ],
      "recurring.csv",
      { type: "text/csv" },
    );

    expect(importButton).toBeDisabled();

    await user.upload(screen.getByLabelText("Recurring CSV file"), csvFile);

    await waitFor(() =>
      expect(onPreviewRecurringCsvImport).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText("Recurring CSV preview")).toBeInTheDocument();
    expect(
      screen.getByText(/1 rows, 1 valid, 0 errors, 1 warnings/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Likely duplicate of an existing recurring expense."),
    ).toBeInTheDocument();
    expect(importButton).toBeDisabled();

    await user.type(confirmationInput, "IMPORT");

    expect(importButton).toBeDisabled();
    expect(onConfirmRecurringCsvImport).not.toHaveBeenCalled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, "IMPORT RECURRING CSV");

    expect(importButton).toBeEnabled();

    await user.click(importButton);

    expect(onConfirmRecurringCsvImport).toHaveBeenCalledWith(preview);
    await waitFor(() =>
      expect(
        screen.getByText("Imported 1 recurring expenses from CSV."),
      ).toBeInTheDocument(),
    );
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

  it("previews a backup file and requires strong confirmation before restore", async () => {
    const user = userEvent.setup();
    const backup = buildTestBackup();
    const onPreviewLocalBackupRestore = vi.fn(
      async (rawJson: string): Promise<LocalBackupRestorePreviewActionResult> => {
        expect(JSON.parse(rawJson)).toMatchObject({
          app: {
            name: "finaitr",
          },
          schemaVersion: 1,
        });

        return {
          backup,
          ok: true,
          preview: buildTestRestorePreview(),
        };
      },
    );
    const onRestoreLocalBackup = vi.fn(
      async (): Promise<LocalBackupRestoreActionResult> => ({
        data: {
          overview: buildFinanceOverview(seedSnapshot),
          snapshot: seedSnapshot,
          status: "ready",
          storageMode: "indexeddb",
        },
        ok: true,
      }),
    );

    renderSettingsPage({
      onPreviewLocalBackupRestore,
      onRestoreLocalBackup,
    });

    const restoreButton = screen.getByRole("button", { name: "Restore backup" });
    const restoreConfirmationInput = screen.getByLabelText("Restore confirmation");
    const backupFile = new File([JSON.stringify(backup)], "backup.json", {
      type: "application/json",
    });

    expect(restoreButton).toBeDisabled();

    await user.upload(screen.getByLabelText("Backup JSON file"), backupFile);

    await waitFor(() =>
      expect(onPreviewLocalBackupRestore).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText("Restore preview")).toBeInTheDocument();
    expect(
      screen.getByText(`${seedRecordCount} records, display currency RUB`),
    ).toBeInTheDocument();
    expect(restoreButton).toBeDisabled();

    await user.type(restoreConfirmationInput, "RESTORE");

    expect(restoreButton).toBeDisabled();
    expect(onRestoreLocalBackup).not.toHaveBeenCalled();

    await user.clear(restoreConfirmationInput);
    await user.type(restoreConfirmationInput, "RESTORE LOCAL DATA");

    expect(restoreButton).toBeEnabled();

    await user.click(restoreButton);

    expect(onRestoreLocalBackup).toHaveBeenCalledWith(backup);
    await waitFor(() =>
      expect(screen.getByText("Backup restored. Local data reloaded.")).toBeInTheDocument(),
    );
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
  onExportLocalCsv?: (
    kind: LocalCsvExportKind,
  ) => Promise<LocalCsvExportActionResult>;
  onPreviewLocalBackupRestore?: (
    rawJson: string,
  ) => Promise<LocalBackupRestorePreviewActionResult>;
  onPreviewRecurringCsvImport?: (
    rawCsv: string,
  ) => Promise<RecurringCsvImportPreviewActionResult>;
  onPreviewTransactionCsvImport?: (
    rawCsv: string,
  ) => Promise<TransactionCsvImportPreviewActionResult>;
  onConfirmRecurringCsvImport?: (
    preview: RecurringCsvImportPreview,
  ) => Promise<RecurringCsvImportActionResult>;
  onConfirmTransactionCsvImport?: (
    preview: TransactionCsvImportPreview,
  ) => Promise<TransactionCsvImportActionResult>;
  onResetLocalData?: () => Promise<LocalDataResetActionResult>;
  onRestoreLocalBackup?: (
    backup: LocalJsonBackup,
  ) => Promise<LocalBackupRestoreActionResult>;
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
      onExportLocalCsv={
        options.onExportLocalCsv ??
        (async (kind) => ({
          csv: buildTestCsvExport(kind),
          ok: true,
        }))
      }
      onPreviewLocalBackupRestore={
        options.onPreviewLocalBackupRestore ??
        (async () => ({
          backup: buildTestBackup(),
          ok: true,
          preview: buildTestRestorePreview(),
        }))
      }
      onPreviewRecurringCsvImport={
        options.onPreviewRecurringCsvImport ??
        (async () => ({
          ok: true,
          preview: buildTestRecurringCsvPreview(),
        }))
      }
      onPreviewTransactionCsvImport={
        options.onPreviewTransactionCsvImport ??
        (async () => ({
          ok: true,
          preview: buildTestTransactionCsvPreview(),
        }))
      }
      onConfirmRecurringCsvImport={
        options.onConfirmRecurringCsvImport ??
        (async () => ({
          data: {
            overview: buildFinanceOverview(seedSnapshot),
            snapshot: seedSnapshot,
            status: "ready",
            storageMode: "indexeddb",
          },
          importedCount: 1,
          ok: true,
        }))
      }
      onConfirmTransactionCsvImport={
        options.onConfirmTransactionCsvImport ??
        (async () => ({
          data: {
            overview: buildFinanceOverview(seedSnapshot),
            snapshot: seedSnapshot,
            status: "ready",
            storageMode: "indexeddb",
          },
          importedCount: 1,
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
      onRestoreLocalBackup={
        options.onRestoreLocalBackup ??
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

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => {
      reject(new Error("Blob could not be read."));
    });
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.readAsText(blob);
  });
}

function buildTestTransactionCsvPreview(): TransactionCsvImportPreview {
  return {
    canImport: true,
    duplicateCount: 1,
    errorCount: 0,
    fileErrors: [],
    headers: ["date", "merchant", "account_name", "category_name", "amount", "currency"],
    importableRows: [
      {
        accountId: "account-card",
        amount: 12,
        categoryId: "software",
        currency: "USD",
        date: "2026-06-10",
        merchant: "Preview Merchant",
        tags: [],
      },
    ],
    rowCount: 1,
    rows: [
      {
        errors: [],
        input: {
          accountId: "account-card",
          amount: 12,
          categoryId: "software",
          currency: "USD",
          date: "2026-06-10",
          merchant: "Preview Merchant",
          tags: [],
        },
        isDuplicate: true,
        rowNumber: 2,
        values: {
          account_name: "Everyday card",
          amount: "12",
          category_name: "Software",
          currency: "USD",
          date: "2026-06-10",
          merchant: "Preview Merchant",
        },
        warnings: ["Likely duplicate of an existing transaction."],
      },
    ],
    validRowCount: 1,
    warningCount: 1,
  };
}
function buildTestRecurringCsvPreview(): RecurringCsvImportPreview {
  return {
    canImport: true,
    duplicateCount: 1,
    errorCount: 0,
    fileErrors: [],
    headers: [
      "name",
      "merchant",
      "account_name",
      "category_name",
      "frequency",
      "next_due_date",
      "amount",
      "currency",
    ],
    importableRows: [
      {
        accountId: "account-card",
        amount: 12,
        categoryId: "software",
        currency: "USD",
        frequency: "monthly",
        merchant: "Preview SaaS",
        name: "Preview SaaS",
        nextDueDate: "2026-06-28",
        status: "active",
        tags: [],
      },
    ],
    rowCount: 1,
    rows: [
      {
        errors: [],
        input: {
          accountId: "account-card",
          amount: 12,
          categoryId: "software",
          currency: "USD",
          frequency: "monthly",
          merchant: "Preview SaaS",
          name: "Preview SaaS",
          nextDueDate: "2026-06-28",
          status: "active",
          tags: [],
        },
        isDuplicate: true,
        rowNumber: 2,
        values: {
          account_name: "Everyday card",
          amount: "12",
          category_name: "Software",
          currency: "USD",
          frequency: "monthly",
          merchant: "Preview SaaS",
          name: "Preview SaaS",
          next_due_date: "2026-06-28",
        },
        warnings: ["Likely duplicate of an existing recurring expense."],
      },
    ],
    validRowCount: 1,
    warningCount: 1,
  };
}
function buildTestCsvExport(kind: LocalCsvExportKind) {
  return {
    content: "id\r\n",
    exportedAt: "2026-06-22T10:11:12.000Z",
    filename: `finaitr-${kind}.csv`,
    kind,
    rowCount: 0,
  };
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

function buildTestRestorePreview() {
  return {
    app: {
      name: "finaitr",
      version: "0.1.0",
    },
    displayCurrency: seedSnapshot.currencySettings.displayCurrency,
    exportedAt: "2026-06-05T10:00:00.000Z",
    recordCounts: {
      accounts: seedSnapshot.accounts.length,
      appMeta: 0,
      categories: seedSnapshot.categories.length,
      receiptDraftItems: seedSnapshot.receiptDraftItems.length,
      receiptDrafts: seedSnapshot.receiptDrafts.length,
      receiptItems: seedSnapshot.receiptItems.length,
      receipts: seedSnapshot.receipts.length,
      recurringExpenses: seedSnapshot.recurringExpenses.length,
      total: Number(seedRecordCount),
      transactions: seedSnapshot.transactions.length,
    },
    schemaVersion: 1 as const,
    seedVersion: 1,
    storageMode: "indexeddb" as const,
    warnings: [],
  };
}
