import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../../data/seedData";
import {
  convertMoney,
  defaultCurrencySettings,
  roundMoney,
} from "../../domain/currencySettings";
import { buildFinanceOverview } from "../../domain/financeViews";
import { groceryReceiptText } from "../../receipt-parser/fixtures";
import {
  mockDocumentReceiptText,
  mockEmailReceiptText,
} from "../../receipt-ingestion/fixtures";
import { type ReceiptExtractionProvider } from "../../receipt-ingestion/types";
import {
  confirmReceiptDraftAndReload,
  confirmRecurringCsvImportAndReload,
  confirmTransactionCsvImportAndReload,
  createRecurringExpenseAndReload,
  deleteReceiptDraftAndReload,
  getMockGoogleReceiptSourceSummaries,
  getReceiptDraftById,
  ingestMockGoogleReceiptSourceAndReload,
  importLocalDriveDocsSelectedFileAndReload,
  listReceiptDrafts,
  previewLocalJsonBackupRestoreFromText,
  previewRecurringCsvImportFromText,
  previewTransactionCsvImportFromText,
  saveParsedReceiptDraftAndReload,
  simulateAiReceiptExtractionAndSaveDraftAndReload,
  updateReceiptDraftAndReload,
} from "../../services/financeDataService";
import { parsePastedReceiptText } from "../../services/receiptParserService";
import { financeDb } from "../db";
import {
  addManualTransaction,
  addRecurringExpense,
  confirmReceiptDraft,
  deleteReceiptDraft,
  deleteRecurringExpense,
  deleteTransaction,
  exportLocalCsv,
  exportLocalJsonBackup,
  getFinanceSnapshot,
  getReceiptDraftRecordById,
  importRecurringCsvRows,
  importTransactionCsvRows,
  listReceiptDraftRecords,
  resetLocalDataToSeed,
  saveReceiptDraft,
  updateCurrencySettings,
  updateRecurringExpense,
  updateTransaction,
  buildLocalJsonRestorePreview,
  restoreLocalJsonBackup,
} from "./financeRepository";

describe("finance repository transaction CRUD", () => {
  beforeEach(async () => {
    await financeDb.delete();
    await financeDb.open();
  });

  afterAll(async () => {
    await financeDb.delete();
  });

  it("creates, updates, deletes, and recalculates dashboard totals", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });

    const created = await addManualTransaction({
      accountId: "account-card",
      amount: 10.25,
      categoryId: "software",
      currency: "USD",
      date: "2026-06-11",
      description: "Manual test transaction",
      merchant: "Test Merchant",
      tags: ["manual", "test"],
    });

    expect(created.source).toBe("manual");

    const afterCreateSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterCreateOverview = buildFinanceOverview(afterCreateSnapshot, {
      monthKey: "2026-06",
    });

    expect(afterCreateSnapshot.transactions).toContainEqual(created);
    expect(afterCreateOverview.monthlySpend).toBe(
      beforeOverview.monthlySpend + usdToRub(10.25),
    );

    const updated = await updateTransaction(created.id, {
      accountId: "account-cash",
      amount: 25.5,
      categoryId: "games",
      currency: "USD",
      date: "2026-06-12",
      description: "Updated manual test transaction",
      merchant: "Updated Merchant",
      tags: ["updated"],
    });

    expect(updated.amount).toBe(25.5);
    expect(updated.merchant).toBe("Updated Merchant");
    expect(updated.source).toBe("manual");

    const afterUpdateSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterUpdateOverview = buildFinanceOverview(afterUpdateSnapshot, {
      monthKey: "2026-06",
    });

    expect(afterUpdateOverview.monthlySpend).toBe(
      beforeOverview.monthlySpend + usdToRub(25.5),
    );

    await deleteTransaction(created.id);

    const afterDeleteSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterDeleteOverview = buildFinanceOverview(afterDeleteSnapshot, {
      monthKey: "2026-06",
    });

    expect(
      afterDeleteSnapshot.transactions.some(
        (transaction) => transaction.id === created.id,
      ),
    ).toBe(false);
    expect(afterDeleteOverview.monthlySpend).toBe(beforeOverview.monthlySpend);
  });

  it("persists display currency after reloading app metadata", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(beforeSnapshot.currencySettings.displayCurrency).toBe("RUB");

    const updatedSettings = await updateCurrencySettings({
      ...beforeSnapshot.currencySettings,
      displayCurrency: "EUR",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 95,
      },
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterOverview = buildFinanceOverview(afterSnapshot, {
      monthKey: "2026-06",
    });

    expect(updatedSettings.displayCurrency).toBe("EUR");
    expect(afterSnapshot.currencySettings.ratesToRub.USD).toBe(70);
    expect(afterOverview.displayCurrency).toBe("EUR");
    expect(afterOverview.monthlySpend).toBe(127.31);
  });

  it("exports a versioned JSON backup with all app-owned data", async () => {
    await updateCurrencySettings({
      ...defaultCurrencySettings,
      displayCurrency: "GBP",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 95,
      },
    });
    const draft = await saveReceiptDraft({
      confidence: 0.84,
      currency: "USD",
      date: "2026-06-04",
      items: [
        {
          categoryId: "dairy",
          confidence: 0.78,
          flags: [],
          kind: "item",
          normalizedName: "milk",
          quantity: 2,
          rawLine: "Milk 2 x 3.00",
          rawName: "Milk",
          tags: ["dairy", "groceries"],
          totalPrice: 3,
          unitPrice: 1.5,
        },
      ],
      merchant: "Fresh Market",
      rawText: mockEmailReceiptText,
      source: "ai_extraction_mock",
      sourceMetadata: {
        kind: "gmail",
        modelName: "local-heuristic-simulator",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: "receipts@fresh.example",
        title: "Fresh Market receipt",
      },
      total: 5,
      warnings: ["Simulated AI extraction from Gmail."],
    });
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    const backup = await exportLocalJsonBackup();

    expect(backup).toMatchObject({
      app: {
        name: "finaitr",
        version: "0.1.0",
      },
      schemaVersion: 1,
      seedVersion: 1,
      storageMode: "indexeddb",
    });
    expect(Date.parse(backup.exportedAt)).not.toBeNaN();
    expect(backup.tables.accounts).toEqual(beforeSnapshot.accounts);
    expect(backup.tables.categories).toEqual(beforeSnapshot.categories);
    expect(backup.tables.transactions).toEqual(beforeSnapshot.transactions);
    expect(backup.tables.receipts).toEqual(beforeSnapshot.receipts);
    expect(backup.tables.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(backup.tables.receiptDraftItems).toEqual(
      beforeSnapshot.receiptDraftItems,
    );
    expect(backup.tables.recurringExpenses).toEqual(
      beforeSnapshot.recurringExpenses,
    );
    expect(backup.tables.settings.currencySettings).toEqual(
      beforeSnapshot.currencySettings,
    );
    expect(
      backup.tables.appMeta.some((record) => record.key === "currencySettings"),
    ).toBe(true);
    expect(
      backup.tables.receiptDrafts.find((item) => item.id === draft.draft.id),
    ).toMatchObject({
      source: "ai_extraction_mock",
      sourceMetadata: {
        kind: "gmail",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: "receipts@fresh.example",
        title: "Fresh Market receipt",
      },
    });
  });

  it("exports every local CSV kind without mutating persisted data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const confirmedReceiptIds = new Set(
      beforeSnapshot.receipts
        .filter((receipt) => receipt.status === "confirmed")
        .map((receipt) => receipt.id),
    );
    const expectations = [
      {
        header: "transaction_id,date,merchant",
        kind: "transactions" as const,
        rowCount: beforeSnapshot.transactions.length,
      },
      {
        header: "receipt_item_id,receipt_id,receipt_date",
        kind: "confirmed_receipt_items" as const,
        rowCount: beforeSnapshot.receiptItems.filter((item) =>
          confirmedReceiptIds.has(item.receiptId),
        ).length,
      },
      {
        header: "recurring_id,name,merchant",
        kind: "recurring_expenses" as const,
        rowCount: beforeSnapshot.recurringExpenses.length,
      },
    ];

    for (const expectation of expectations) {
      const result = await exportLocalCsv(expectation.kind);
      const afterSnapshot = (await getFinanceSnapshot()).snapshot;

      expect(result.kind).toBe(expectation.kind);
      expect(result.rowCount).toBe(expectation.rowCount);
      expect(result.content).toContain(expectation.header);
      expect(afterSnapshot).toEqual(beforeSnapshot);
    }
  });

  it("previews and confirms transaction CSV import through the service boundary", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const rawCsv =
      "date,merchant,description,account_name,category_name,amount,currency,tags\r\n" +
      "2026-06-15,CSV Import Merchant,Imported from CSV,Everyday card,Software,50,EUR,import; csv";

    const previewResult = await previewTransactionCsvImportFromText(rawCsv);
    const afterPreviewSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(previewResult.ok).toBe(true);
    expect(previewResult.preview).toMatchObject({
      canImport: true,
      errorCount: 0,
      validRowCount: 1,
    });
    expect(afterPreviewSnapshot).toEqual(beforeSnapshot);

    const preview = previewResult.preview;

    if (!preview) {
      throw new Error("Expected transaction CSV preview.");
    }

    const importResult = await confirmTransactionCsvImportAndReload(preview);

    expect(importResult.ok).toBe(true);
    expect(importResult.importedCount).toBe(1);

    const afterSnapshot = importResult.data?.snapshot;
    const afterOverview = importResult.data?.overview;
    const imported = afterSnapshot?.transactions.find(
      (transaction) => transaction.merchant === "CSV Import Merchant",
    );

    expect(imported).toMatchObject({
      accountId: "account-card",
      amount: 50,
      categoryId: "software",
      currency: "EUR",
      date: "2026-06-15",
      description: "Imported from CSV",
      source: "csv_import",
      tags: ["import", "csv"],
    });
    expect(imported?.id.startsWith("tx-csv-")).toBe(true);
    expect(afterSnapshot?.transactions).toHaveLength(
      beforeSnapshot.transactions.length + 1,
    );
    expect(afterOverview?.monthlySpend).toBe(
      roundMoney(
        beforeOverview.monthlySpend +
          convertMoney(50, "EUR", "RUB", defaultCurrencySettings),
      ),
    );
  });

  it("rejects invalid transaction CSV confirmation without mutating data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const rawCsv =
      "date,merchant,account_name,category_name,amount,currency\r\n" +
      "not-a-date,,Everyday card,Unknown,0,";

    const previewResult = await previewTransactionCsvImportFromText(rawCsv);

    expect(previewResult.ok).toBe(true);
    expect(previewResult.preview).toMatchObject({
      canImport: false,
      validRowCount: 0,
    });

    const preview = previewResult.preview;

    if (!preview) {
      throw new Error("Expected invalid transaction CSV preview.");
    }

    const importResult = await confirmTransactionCsvImportAndReload(preview);
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(importResult.ok).toBe(false);
    expect(importResult.errorMessage).toBe(
      "Transaction CSV import requires a valid preview with no row errors.",
    );
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("rejects repository transaction CSV batches without partial writes", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    await expect(
      importTransactionCsvRows([
        {
          accountId: "account-card",
          amount: 10,
          categoryId: "software",
          currency: "USD",
          date: "2026-06-16",
          description: "Valid row before invalid account",
          merchant: "Valid CSV Row",
          tags: ["csv"],
        },
        {
          accountId: "missing-account",
          amount: 11,
          categoryId: "software",
          currency: "USD",
          date: "2026-06-17",
          description: "Invalid account row",
          merchant: "Invalid CSV Row",
          tags: ["csv"],
        },
      ]),
    ).rejects.toThrow("CSV import account is not available: missing-account.");

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.recurringExpenses).toEqual(
      beforeSnapshot.recurringExpenses,
    );
  });

  it("rejects repository recurring CSV batches without partial writes", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    await expect(
      importRecurringCsvRows([
        {
          accountId: "account-card",
          amount: 15,
          categoryId: "software",
          currency: "USD",
          frequency: "monthly",
          merchant: "Valid Recurring Row",
          name: "Valid Recurring Row",
          nextDueDate: "2026-06-29",
          status: "active",
          tags: ["csv"],
        },
        {
          accountId: "account-card",
          amount: 16,
          categoryId: "missing-category",
          currency: "USD",
          frequency: "monthly",
          merchant: "Invalid Recurring Row",
          name: "Invalid Recurring Row",
          nextDueDate: "2026-06-30",
          status: "active",
          tags: ["csv"],
        },
      ]),
    ).rejects.toThrow("CSV import category is not available: missing-category.");

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot.recurringExpenses).toEqual(
      beforeSnapshot.recurringExpenses,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
  });

  it("previews and confirms recurring CSV import through the service boundary", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const rawCsv =
      "name,merchant,note,account_name,category_name,status,frequency,next_due_date,amount,currency,tags\r\n" +
      "CSV Recurring Merchant,CSV Recurring Merchant,Imported recurring,Everyday card,Software,active,monthly,2026-06-28,100,EUR,import; recurring";

    const previewResult = await previewRecurringCsvImportFromText(rawCsv);
    const afterPreviewSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(previewResult.ok).toBe(true);
    expect(previewResult.preview).toMatchObject({
      canImport: true,
      errorCount: 0,
      validRowCount: 1,
    });
    expect(afterPreviewSnapshot).toEqual(beforeSnapshot);

    const preview = previewResult.preview;

    if (!preview) {
      throw new Error("Expected recurring CSV preview.");
    }

    const importResult = await confirmRecurringCsvImportAndReload(preview);

    expect(importResult.ok).toBe(true);
    expect(importResult.importedCount).toBe(1);

    const afterSnapshot = importResult.data?.snapshot;
    const afterOverview = importResult.data?.overview;
    const imported = afterSnapshot?.recurringExpenses.find(
      (expense) => expense.name === "CSV Recurring Merchant",
    );

    expect(imported).toMatchObject({
      accountId: "account-card",
      amount: 100,
      categoryId: "software",
      currency: "EUR",
      frequency: "monthly",
      merchant: "CSV Recurring Merchant",
      name: "CSV Recurring Merchant",
      nextDueDate: "2026-06-28",
      note: "Imported recurring",
      status: "active",
      tags: ["import", "recurring"],
    });
    expect(imported?.id.startsWith("rec-csv-")).toBe(true);
    expect(afterSnapshot?.recurringExpenses).toHaveLength(
      beforeSnapshot.recurringExpenses.length + 1,
    );
    expect(afterSnapshot?.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterOverview?.monthlySpend).toBe(beforeOverview.monthlySpend);
    expect(afterOverview?.recurringMonthlyTotal).toBe(
      roundMoney(
        beforeOverview.recurringMonthlyTotal +
          convertMoney(100, "EUR", "RUB", defaultCurrencySettings),
      ),
    );
  });

  it("rejects invalid recurring CSV confirmation without mutating data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const rawCsv =
      "name,account_name,frequency,next_due_date,amount,currency\r\n" +
      ",Unknown,daily,not-a-date,0,";

    const previewResult = await previewRecurringCsvImportFromText(rawCsv);

    expect(previewResult.ok).toBe(true);
    expect(previewResult.preview).toMatchObject({
      canImport: false,
      validRowCount: 0,
    });

    const preview = previewResult.preview;

    if (!preview) {
      throw new Error("Expected invalid recurring CSV preview.");
    }

    const importResult = await confirmRecurringCsvImportAndReload(preview);
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(importResult.ok).toBe(false);
    expect(importResult.errorMessage).toBe(
      "Recurring CSV import requires a valid preview with no row errors.",
    );
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("does not mutate persisted data when backup objects are changed", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const backup = await exportLocalJsonBackup();

    backup.tables.accounts[0].name = "Mutated backup account";
    backup.tables.settings.currencySettings.ratesToRub.USD = 1;
    backup.tables.transactions.pop();

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("resets local IndexedDB data to the seed baseline", async () => {
    const baselineSnapshot = (await getFinanceSnapshot()).snapshot;

    await addManualTransaction({
      accountId: "account-card",
      amount: 99,
      categoryId: "software",
      currency: "EUR",
      date: "2026-06-20",
      description: "Reset test transaction",
      merchant: "Reset Merchant",
      tags: ["reset"],
    });
    await saveReceiptDraft({
      confidence: 0.61,
      currency: "USD",
      items: [],
      merchant: "Reset Draft Merchant",
      rawText: "Reset Draft Merchant\nTOTAL 1.00",
      total: 1,
      warnings: [],
    });
    await updateCurrencySettings({
      ...defaultCurrencySettings,
      displayCurrency: "EUR",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 95,
      },
    });

    const dirtySnapshot = (await getFinanceSnapshot()).snapshot;

    expect(dirtySnapshot.transactions).toHaveLength(
      createSeedFinanceSnapshot().transactions.length + 1,
    );
    expect(dirtySnapshot.receiptDrafts).toHaveLength(1);
    expect(dirtySnapshot.currencySettings.displayCurrency).toBe("EUR");

    await resetLocalDataToSeed();

    const resetSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(resetSnapshot).toEqual(baselineSnapshot);
  });

  it("restores a valid JSON backup and recalculates analytics", async () => {
    const created = await addManualTransaction({
      accountId: "account-card",
      amount: 100,
      categoryId: "software",
      currency: "EUR",
      date: "2026-06-20",
      description: "Restore test transaction",
      merchant: "Restore Merchant",
      tags: ["restore"],
    });
    const draft = await saveReceiptDraft({
      confidence: 0.84,
      currency: "GBP",
      date: "2026-06-21",
      items: [
        {
          categoryId: "groceries",
          confidence: 0.9,
          flags: [],
          kind: "item",
          normalizedName: "restore tea",
          quantity: 1,
          rawLine: "Restore Tea 4.50",
          rawName: "Restore Tea",
          tags: ["groceries"],
          totalPrice: 4.5,
        },
      ],
      merchant: "Restore Grocer",
      rawText: "Restore Grocer\nRestore Tea 4.50\nTOTAL 4.50",
      source: "ai_extraction_mock",
      sourceMetadata: {
        kind: "gmail",
        providerName: "local-mock-ai-extractor",
        sender: "restore@example.test",
        title: "Restore backup receipt",
      },
      total: 4.5,
      warnings: ["Restore source metadata."],
    });

    await updateCurrencySettings({
      ...defaultCurrencySettings,
      displayCurrency: "EUR",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 95,
      },
    });

    const backup = await exportLocalJsonBackup();
    const preview = buildLocalJsonRestorePreview(backup);

    expect(preview.recordCounts.transactions).toBe(
      createSeedFinanceSnapshot().transactions.length + 1,
    );
    expect(preview.displayCurrency).toBe("EUR");

    await resetLocalDataToSeed();

    const resetSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(
      resetSnapshot.transactions.some(
        (transaction) => transaction.id === created.id,
      ),
    ).toBe(false);

    await restoreLocalJsonBackup(backup);

    const restoredSnapshot = (await getFinanceSnapshot()).snapshot;
    const restoredTransaction = restoredSnapshot.transactions.find(
      (transaction) => transaction.id === created.id,
    );
    const restoredDraft = restoredSnapshot.receiptDrafts.find(
      (item) => item.id === draft.draft.id,
    );
    const expectedOverview = buildFinanceOverview(snapshotFromBackup(backup), {
      monthKey: "2026-06",
    });
    const restoredOverview = buildFinanceOverview(restoredSnapshot, {
      monthKey: "2026-06",
    });

    expect(restoredSnapshot.accounts).toEqual(backup.tables.accounts);
    expect(restoredSnapshot.categories).toEqual(backup.tables.categories);
    expect(restoredSnapshot.receiptItems).toEqual(backup.tables.receiptItems);
    expect(restoredSnapshot.receipts).toEqual(backup.tables.receipts);
    expect(restoredSnapshot.receiptDraftItems).toEqual(
      backup.tables.receiptDraftItems,
    );
    expect(restoredSnapshot.recurringExpenses).toEqual(
      backup.tables.recurringExpenses,
    );
    expect(restoredTransaction).toMatchObject({
      amount: 100,
      currency: "EUR",
      merchant: "Restore Merchant",
    });
    expect(restoredDraft).toMatchObject({
      currency: "GBP",
      sourceMetadata: {
        kind: "gmail",
        providerName: "local-mock-ai-extractor",
        sender: "restore@example.test",
        title: "Restore backup receipt",
      },
      total: 4.5,
    });
    expect(restoredSnapshot.currencySettings.displayCurrency).toBe("EUR");
    expect(restoredSnapshot.currencySettings.ratesToRub.EUR).toBe(80);
    expect(restoredOverview.monthlySpend).toBe(expectedOverview.monthlySpend);
    expect(restoredOverview.displayCurrency).toBe("EUR");
  });

  it("returns invalid JSON errors before restore validation", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    const result = await previewLocalJsonBackupRestoreFromText("{invalid json");
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Backup file is not valid JSON.");
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("rejects unsupported schema versions without mutating data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const invalidBackup = cloneJsonValue(await exportLocalJsonBackup()) as {
      schemaVersion: number;
    };

    invalidBackup.schemaVersion = 999;

    expect(() => buildLocalJsonRestorePreview(invalidBackup)).toThrow(
      "Unsupported backup schema version",
    );
    await expect(restoreLocalJsonBackup(invalidBackup)).rejects.toThrow(
      "Unsupported backup schema version",
    );

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("rejects backups with missing tables without mutating data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const invalidBackup = cloneJsonValue(await exportLocalJsonBackup()) as {
      tables: Record<string, unknown>;
    };

    delete invalidBackup.tables.transactions;

    expect(() => buildLocalJsonRestorePreview(invalidBackup)).toThrow(
      "transactions",
    );
    await expect(restoreLocalJsonBackup(invalidBackup)).rejects.toThrow(
      "transactions",
    );

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("preserves original transaction currency while dashboard totals are converted", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });

    const created = await addManualTransaction({
      accountId: "account-card",
      amount: 100,
      categoryId: "software",
      currency: "EUR",
      date: "2026-06-13",
      description: "Euro transaction preservation test",
      merchant: "Euro Merchant",
      tags: ["manual", "currency"],
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;
    const persisted = afterSnapshot.transactions.find(
      (transaction) => transaction.id === created.id,
    );
    const afterOverview = buildFinanceOverview(afterSnapshot, {
      monthKey: "2026-06",
    });

    expect(created).toMatchObject({
      amount: 100,
      currency: "EUR",
    });
    expect(persisted).toMatchObject({
      amount: 100,
      currency: "EUR",
    });
    expect(afterOverview.monthlySpend).toBe(
      beforeOverview.monthlySpend +
        convertMoney(100, "EUR", "RUB", defaultCurrencySettings),
    );
  });

  it("persists receipt drafts separately from dashboard analytics", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });

    const saved = await saveReceiptDraft({
      confidence: 0.61,
      currency: "GBP",
      date: "2026-06-03",
      items: [
        {
          categoryId: "uncategorized",
          confidence: 0.45,
          flags: ["uncategorized", "low_confidence"],
          kind: "item",
          normalizedName: "blue widget",
          rawLine: "Blue Widget 9.99",
          rawName: "Blue Widget",
          tags: [],
          totalPrice: 9.99,
        },
      ],
      merchant: "Odd Shop",
      rawText: "Odd Shop\n2026-06-03\nBlue Widget 9.99\nTOTAL 9.99",
      total: 9.99,
      warnings: ["Saved draft test warning."],
    });

    expect(saved.draft.status).toBe("draft");
    expect(saved.draft.currency).toBe("GBP");
    expect(saved.draft.total).toBe(9.99);
    expect(saved.items).toHaveLength(1);

    const listed = await listReceiptDraftRecords();
    const found = await getReceiptDraftRecordById(saved.draft.id);

    expect(listed[0]?.draft.id).toBe(saved.draft.id);
    expect(found?.items[0]?.flags).toContain("low_confidence");

    const afterSaveSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterSaveOverview = buildFinanceOverview(afterSaveSnapshot, {
      monthKey: "2026-06",
    });

    expect(afterSaveSnapshot.receiptDrafts).toContainEqual(saved.draft);
    expect(afterSaveSnapshot.receiptDraftItems).toContainEqual(saved.items[0]);
    expect(afterSaveSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSaveSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSaveSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(afterSaveOverview).toEqual(beforeOverview);

    await deleteReceiptDraft(saved.draft.id);

    expect(await getReceiptDraftRecordById(saved.draft.id)).toBeUndefined();
    expect(await listReceiptDraftRecords()).toHaveLength(0);
  });

  it("updates receipt draft review fields without promoting data to dashboard", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const saved = await saveReceiptDraft({
      confidence: 0.66,
      currency: "USD",
      date: "2026-06-03",
      items: [
        {
          categoryId: "uncategorized",
          confidence: 0.45,
          flags: ["uncategorized"],
          kind: "item",
          normalizedName: "blue widget",
          rawLine: "Blue Widget 1 x 9.99",
          rawName: "Blue Widget",
          tags: ["review"],
          totalPrice: 9.99,
          unitPrice: 9.99,
        },
      ],
      merchant: "Odd Shop",
      rawText: "Odd Shop\n2026-06-03\nBlue Widget 1 x 9.99\nTOTAL 9.99",
      total: 9.99,
      warnings: ["Saved draft test warning."],
    });
    const updateResult = await updateReceiptDraftAndReload(saved.draft.id, {
      currency: "EUR",
      date: "2026-06-04",
      items: [
        {
          categoryId: "groceries",
          confidence: saved.items[0].confidence,
          flags: [],
          id: saved.items[0].id,
          kind: saved.items[0].kind,
          normalizedName: "reviewed blue widget",
          quantity: 2,
          tags: saved.items[0].tags,
          totalPrice: 12.5,
          unitPrice: 6.25,
        },
      ],
      merchant: "Reviewed Odd Shop",
      status: "reviewed",
      total: 12.5,
    });
    const found = await getReceiptDraftRecordById(saved.draft.id);
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterOverview = buildFinanceOverview(afterSnapshot, {
      monthKey: "2026-06",
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.draft?.draft).toMatchObject({
      currency: "EUR",
      date: "2026-06-04",
      merchant: "Reviewed Odd Shop",
      status: "reviewed",
      total: 12.5,
    });
    expect(found?.draft.rawText).toBe(saved.draft.rawText);
    expect(found?.items[0]).toMatchObject({
      categoryId: "groceries",
      flags: [],
      normalizedName: "reviewed blue widget",
      quantity: 2,
      rawLine: saved.items[0].rawLine,
      rawName: saved.items[0].rawName,
      totalPrice: 12.5,
      unitPrice: 6.25,
    });
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(afterOverview).toEqual(beforeOverview);
  });

  it("does not confirm unreviewed receipt drafts", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const saved = await saveConfirmationDraft("draft");

    await expect(
      confirmReceiptDraft(saved.draft.id, {
        accountId: "account-card",
        categoryId: "groceries",
      }),
    ).rejects.toThrow("reviewed");

    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    const unconfirmedDraft = afterSnapshot.receiptDrafts.find(
      (draft) => draft.id === saved.draft.id,
    );

    expect(unconfirmedDraft?.status).toBe("draft");
    expect(unconfirmedDraft?.confirmedReceiptId).toBeUndefined();
    expect(unconfirmedDraft?.linkedTransactionId).toBeUndefined();
  });

  it("confirms a reviewed draft through the service boundary", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const saved = await saveConfirmationDraft("reviewed");

    const result = await confirmReceiptDraftAndReload(saved.draft.id, {
      accountId: "account-card",
      categoryId: "groceries",
    });

    expect(result.ok).toBe(true);
    expect(result.confirmation).toBeDefined();

    const confirmation = result.confirmation;

    if (!confirmation) {
      throw new Error("Expected receipt confirmation result.");
    }

    expect(confirmation.draft).toMatchObject({
      confirmedReceiptId: confirmation.receipt.id,
      linkedTransactionId: confirmation.transaction.id,
      status: "confirmed",
    });
    expect(confirmation.receipt).toMatchObject({
      currency: "GBP",
      date: "2026-06-14",
      merchant: "London Grocer",
      status: "confirmed",
      total: 30,
      transactionId: confirmation.transaction.id,
      warnings: ["Review preserved before confirmation."],
    });
    expect(confirmation.transaction).toMatchObject({
      accountId: "account-card",
      amount: 30,
      categoryId: "groceries",
      currency: "GBP",
      date: "2026-06-14",
      merchant: "London Grocer",
      receiptId: confirmation.receipt.id,
      source: "receipt",
    });
    expect(confirmation.transaction.description).toContain(saved.draft.id);
    expect(confirmation.items).toHaveLength(2);
    expect(
      confirmation.items.find((item) => item.normalizedName === "tea"),
    ).toMatchObject({
      categoryId: "groceries",
      flags: ["low_confidence"],
      normalizedName: "tea",
      quantity: 2,
      rawName: "Tea",
      receiptId: confirmation.receipt.id,
      totalPrice: 10,
      unitPrice: 5,
    });

    const afterSnapshot = result.data?.snapshot;
    const afterOverview = result.data?.overview;

    expect(afterSnapshot?.transactions).toHaveLength(
      beforeSnapshot.transactions.length + 1,
    );
    expect(
      afterSnapshot?.transactions.filter(
        (transaction) => transaction.id === confirmation.transaction.id,
      ),
    ).toHaveLength(1);
    expect(
      afterSnapshot?.receipts.filter(
        (receipt) => receipt.id === confirmation.receipt.id,
      ),
    ).toHaveLength(1);
    expect(
      afterSnapshot?.receiptItems.filter(
        (item) => item.receiptId === confirmation.receipt.id,
      ),
    ).toHaveLength(2);
    expect(afterOverview?.monthlySpend).toBe(
      roundMoney(
        beforeOverview.monthlySpend +
          convertMoney(30, "GBP", "RUB", defaultCurrencySettings),
      ),
    );
    expect(confirmation.transaction).toMatchObject({
      amount: 30,
      currency: "GBP",
    });
  });

  it("preserves AI source metadata when a reviewed draft is confirmed", async () => {
    const saved = await saveReceiptDraft({
      confidence: 0.84,
      currency: "USD",
      date: "2026-06-04",
      items: [
        {
          categoryId: "dairy",
          confidence: 0.78,
          flags: [],
          kind: "item",
          normalizedName: "milk",
          quantity: 2,
          rawLine: "Milk 2 x 3.00",
          rawName: "Milk",
          tags: ["dairy", "groceries"],
          totalPrice: 3,
          unitPrice: 1.5,
        },
      ],
      merchant: "Fresh Market",
      rawText: mockEmailReceiptText,
      source: "ai_extraction_mock",
      sourceMetadata: {
        extractedAt: "2026-06-04T10:16:00.000Z",
        fetchedAt: "2026-06-04T10:15:30.000Z",
        kind: "gmail",
        modelName: "local-heuristic-simulator",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: " receipts@fresh.example ",
        title: " Fresh Market receipt ",
      },
      status: "reviewed",
      total: 5,
      warnings: ["Simulated AI extraction from Gmail."],
    });

    const confirmation = await confirmReceiptDraft(saved.draft.id, {
      accountId: "account-card",
      categoryId: "groceries",
    });

    expect(confirmation.receipt).toMatchObject({
      source: "ai_extraction_mock",
      sourceMetadata: {
        extractedAt: "2026-06-04T10:16:00.000Z",
        fetchedAt: "2026-06-04T10:15:30.000Z",
        kind: "gmail",
        modelName: "local-heuristic-simulator",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: "receipts@fresh.example",
        title: "Fresh Market receipt",
      },
    });
    expect(confirmation.transaction).toMatchObject({
      amount: 5,
      currency: "USD",
      source: "receipt",
    });
  });

  it("uses a safe default transaction category when none is provided", async () => {
    const saved = await saveConfirmationDraft("reviewed");

    const result = await confirmReceiptDraft(saved.draft.id, {
      accountId: "account-card",
    });

    expect(result.transaction.categoryId).toBe("groceries");
  });

  it("does not create duplicate receipt confirmation records", async () => {
    const saved = await saveConfirmationDraft("reviewed");
    const first = await confirmReceiptDraft(saved.draft.id, {
      accountId: "account-card",
      categoryId: "groceries",
    });
    const second = await confirmReceiptDraft(saved.draft.id, {
      accountId: "account-cash",
      categoryId: "games",
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(second.receipt.id).toBe(first.receipt.id);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(second.items.map((item) => item.id).sort()).toEqual(
      first.items.map((item) => item.id).sort(),
    );
    expect(
      afterSnapshot.transactions.filter(
        (transaction) => transaction.receiptId === first.receipt.id,
      ),
    ).toHaveLength(1);
    expect(
      afterSnapshot.receipts.filter((receipt) => receipt.id === first.receipt.id),
    ).toHaveLength(1);
    expect(
      afterSnapshot.receiptItems.filter(
        (item) => item.receiptId === first.receipt.id,
      ),
    ).toHaveLength(first.items.length);
  });

  it("creates, updates, lists, and deletes recurring expenses without changing transaction spend", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });

    const created = await addRecurringExpense({
      accountId: "account-card",
      amount: 100,
      categoryId: "software",
      currency: "EUR",
      frequency: "monthly",
      merchant: "Euro SaaS",
      name: "Euro SaaS",
      nextDueDate: "2026-07-04",
      note: "Team workspace",
      status: "active",
      tags: ["software", "recurring"],
    });
    const afterCreateSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterCreateOverview = buildFinanceOverview(afterCreateSnapshot, {
      monthKey: "2026-06",
    });

    expect(created).toMatchObject({
      amount: 100,
      currency: "EUR",
      note: "Team workspace",
      tags: ["software", "recurring"],
    });
    expect(afterCreateSnapshot.recurringExpenses).toContainEqual(created);
    expect(afterCreateSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterCreateOverview.monthlySpend).toBe(beforeOverview.monthlySpend);
    expect(afterCreateOverview.recurringMonthlyTotal).toBe(
      roundMoney(
        beforeOverview.recurringMonthlyTotal +
          convertMoney(100, "EUR", "RUB", defaultCurrencySettings),
      ),
    );

    const updated = await updateRecurringExpense(created.id, {
      accountId: "account-cash",
      amount: 24,
      categoryId: "gym",
      currency: "GBP",
      frequency: "weekly",
      merchant: "Updated Club",
      name: "Updated Weekly Club",
      nextDueDate: "2026-07-11",
      note: "Paused for summer",
      status: "paused",
      tags: ["health"],
    });
    const afterUpdateSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterUpdateOverview = buildFinanceOverview(afterUpdateSnapshot, {
      monthKey: "2026-06",
    });

    expect(updated).toMatchObject({
      accountId: "account-cash",
      amount: 24,
      categoryId: "gym",
      currency: "GBP",
      frequency: "weekly",
      name: "Updated Weekly Club",
      note: "Paused for summer",
      status: "paused",
      tags: ["health"],
    });
    expect(
      afterUpdateSnapshot.recurringExpenses.find(
        (expense) => expense.id === created.id,
      ),
    ).toMatchObject(updated);
    expect(afterUpdateSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterUpdateOverview.monthlySpend).toBe(beforeOverview.monthlySpend);
    expect(afterUpdateOverview.recurringMonthlyTotal).toBe(
      beforeOverview.recurringMonthlyTotal,
    );

    await deleteRecurringExpense(created.id);

    const afterDeleteSnapshot = (await getFinanceSnapshot()).snapshot;
    const afterDeleteOverview = buildFinanceOverview(afterDeleteSnapshot, {
      monthKey: "2026-06",
    });

    expect(
      afterDeleteSnapshot.recurringExpenses.some(
        (expense) => expense.id === created.id,
      ),
    ).toBe(false);
    expect(afterDeleteSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterDeleteOverview.monthlySpend).toBe(beforeOverview.monthlySpend);
    expect(afterDeleteOverview.recurringMonthlyTotal).toBe(
      beforeOverview.recurringMonthlyTotal,
    );
  });

  it("returns recurring validation errors through the service boundary", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const result = await createRecurringExpenseAndReload({
      accountId: "",
      amount: 0,
      currency: "",
      frequency: "daily" as never,
      name: "",
      nextDueDate: "not-a-date",
      status: "active",
      tags: [],
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errors).toMatchObject({
      accountId: "Account is required.",
      amount: "Amount must be greater than zero.",
      frequency: "Frequency is invalid.",
      name: "Name is required.",
      nextDueDate: "Next due date must be a valid date.",
    });
    expect(afterSnapshot.recurringExpenses).toEqual(
      beforeSnapshot.recurringExpenses,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
  });

  it("saves, lists, gets, and deletes parsed drafts through the service boundary", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const parsedDraft = parsePastedReceiptText(groceryReceiptText);

    const saveResult = await saveParsedReceiptDraftAndReload(parsedDraft);

    expect(saveResult.ok).toBe(true);
    expect(saveResult.draft?.draft.merchant).toBe("GREEN MARKET");
    expect(saveResult.draft?.items).toHaveLength(3);
    expect(saveResult.data?.snapshot.receiptDrafts).toHaveLength(1);
    expect(saveResult.data?.overview).toEqual(beforeOverview);

    const listed = await listReceiptDrafts();
    const found = await getReceiptDraftById(saveResult.draft?.draft.id ?? "");

    expect(listed).toHaveLength(1);
    expect(found?.draft.id).toBe(saveResult.draft?.draft.id);

    const deleteResult = await deleteReceiptDraftAndReload(
      saveResult.draft?.draft.id ?? "",
    );

    expect(deleteResult.ok).toBe(true);
    expect(deleteResult.data?.snapshot.receiptDrafts).toHaveLength(0);
    expect(deleteResult.data?.snapshot.receiptDraftItems).toHaveLength(0);
    expect(deleteResult.data?.overview).toEqual(beforeOverview);
  });

  it("saves mock AI extraction as draft metadata without dashboard impact", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });

    const result = await simulateAiReceiptExtractionAndSaveDraftAndReload({
      rawText: mockEmailReceiptText,
      sourceKind: "gmail",
      sourceReceivedAt: "2026-06-04T10:15:00.000Z",
      sourceSender: "receipts@fresh.example",
      sourceTitle: "Fresh Market receipt",
    });

    expect(result.ok).toBe(true);
    expect(result.extraction).toMatchObject({
      providerName: "local-mock-ai-extractor",
      modelName: "local-heuristic-simulator",
    });
    expect(result.draft?.draft).toMatchObject({
      merchant: "Fresh Market",
      source: "ai_extraction_mock",
      sourceMetadata: {
        kind: "gmail",
        providerName: "local-mock-ai-extractor",
        receivedAt: "2026-06-04T10:15:00.000Z",
        sender: "receipts@fresh.example",
        title: "Fresh Market receipt",
      },
      status: "draft",
      total: 5,
    });
    expect(result.draft?.items.length).toBeGreaterThan(0);
    expect(result.data?.snapshot.receiptDrafts).toHaveLength(
      beforeSnapshot.receiptDrafts.length + 1,
    );
    expect(result.data?.snapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(result.data?.snapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(result.data?.snapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(result.data?.overview).toEqual(beforeOverview);
  });
  it("saves selected mock Google source as a validated draft without dashboard impact", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const source = getMockGoogleReceiptSourceSummaries().find(
      (summary) => summary.kind === "google_drive",
    );

    if (!source) {
      throw new Error("Expected mock Google Drive source.");
    }

    const result = await ingestMockGoogleReceiptSourceAndReload(source.id);

    expect(result.ok).toBe(true);
    expect(result.candidate?.source).toMatchObject({
      contentHash: source.contentHash,
      kind: "google_drive",
      modifiedAt: "2026-06-06T15:45:00.000Z",
      sourceId: "drive-file-city-pharmacy-20260606",
      sourceProviderName: "mock-google-source-provider",
      title: "City Pharmacy receipt",
    });
    expect(result.extraction).toMatchObject({
      providerName: "local-mock-ai-extractor",
      modelName: "local-heuristic-simulator",
    });
    expect(result.draft?.draft).toMatchObject({
      merchant: "City Pharmacy",
      source: "ai_extraction_mock",
      sourceMetadata: {
        contentHash: source.contentHash,
        kind: "google_drive",
        modifiedAt: "2026-06-06T15:45:00.000Z",
        providerName: "local-mock-ai-extractor",
        sourceId: "drive-file-city-pharmacy-20260606",
        sourceProviderName: "mock-google-source-provider",
        title: "City Pharmacy receipt",
      },
      status: "draft",
      total: 20.5,
    });
    expect(result.draft?.items.length).toBeGreaterThan(0);
    expect(result.data?.snapshot.receiptDrafts).toHaveLength(
      beforeSnapshot.receiptDrafts.length + 1,
    );
    expect(result.data?.snapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(result.data?.snapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(result.data?.snapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(result.data?.overview).toEqual(beforeOverview);
  });

  it("rejects duplicate mock Google sources without mutating local data", async () => {
    const source = getMockGoogleReceiptSourceSummaries().find(
      (summary) => summary.kind === "gmail",
    );

    if (!source) {
      throw new Error("Expected mock Gmail source.");
    }

    const firstResult = await ingestMockGoogleReceiptSourceAndReload(source.id);
    const beforeDuplicateSnapshot = (await getFinanceSnapshot()).snapshot;
    const duplicateResult = await ingestMockGoogleReceiptSourceAndReload(source.id);
    const afterDuplicateSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(firstResult.ok).toBe(true);
    expect(duplicateResult.ok).toBe(false);
    expect(duplicateResult.errorMessage).toContain(
      "already been saved as receipt draft",
    );
    expect(afterDuplicateSnapshot).toEqual(beforeDuplicateSnapshot);
  });

  it("rejects invalid mock Google extraction output without creating partial drafts", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const source = getMockGoogleReceiptSourceSummaries().find(
      (summary) => summary.kind === "google_docs",
    );
    const invalidProvider: ReceiptExtractionProvider = {
      providerName: "invalid-mock-google-provider",
      async extractReceiptDraft() {
        return {
          draft: {
            confidence: 0.8,
            currency: "usd",
            items: [
              {
                categoryId: "software",
                confidence: 0.8,
                flags: [],
                kind: "item",
                normalizedName: "pro plan",
                rawName: "Pro plan",
                tags: ["software"],
                totalPrice: 12,
              },
            ],
            totalAmount: 12,
            warnings: [],
          },
          extractedAt: "2026-06-05T09:31:00.000Z",
          providerName: "invalid-mock-google-provider",
        };
      },
    };

    if (!source) {
      throw new Error("Expected mock Docs source.");
    }

    const result = await ingestMockGoogleReceiptSourceAndReload(source.id, {
      extractionProvider: invalidProvider,
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe(
      "AI extraction currency must be a three-letter uppercase currency code.",
    );
    expect(afterSnapshot.receiptDrafts).toEqual(beforeSnapshot.receiptDrafts);
    expect(afterSnapshot.receiptDraftItems).toEqual(
      beforeSnapshot.receiptDraftItems,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
  });

  it("imports a selected local Drive/Docs file as a validated draft without dashboard impact", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const beforeOverview = buildFinanceOverview(beforeSnapshot, {
      monthKey: "2026-06",
    });
    const lastModified = Date.parse("2026-06-05T09:30:00.000Z");

    const result = await importLocalDriveDocsSelectedFileAndReload({
      fileName: "software-receipt.md",
      lastModified,
      rawText: mockDocumentReceiptText,
      sourceKind: "google_docs",
    });

    expect(result.ok).toBe(true);
    expect(result.candidate?.source).toMatchObject({
      contentHash: expect.stringMatching(/^fnv1a-[0-9a-f]{8}$/),
      kind: "google_docs",
      modifiedAt: "2026-06-05T09:30:00.000Z",
      sourceId: expect.stringMatching(/^local-selected-file-fnv1a-[0-9a-f]{8}$/),
      sourceProviderName: "local-drive-docs-selected-file-provider",
      title: "software-receipt.md",
    });
    expect(result.candidate?.warnings).toEqual(
      expect.arrayContaining([
        "Local Google Docs selected-file prototype. No Google API was called.",
      ]),
    );
    expect(result.extraction).toMatchObject({
      modelName: "local-heuristic-simulator",
      providerName: "local-mock-ai-extractor",
    });
    expect(result.draft?.draft).toMatchObject({
      merchant: "Cloud Tools",
      rawText: mockDocumentReceiptText,
      source: "ai_extraction_mock",
      sourceMetadata: {
        contentHash: result.candidate?.source.contentHash,
        fetchedAt: expect.any(String),
        kind: "google_docs",
        modifiedAt: "2026-06-05T09:30:00.000Z",
        modelName: "local-heuristic-simulator",
        providerName: "local-mock-ai-extractor",
        sourceId: result.candidate?.source.sourceId,
        sourceProviderName: "local-drive-docs-selected-file-provider",
        title: "software-receipt.md",
      },
      status: "draft",
      total: 12,
    });
    expect(result.draft?.items.length).toBeGreaterThan(0);
    expect(result.data?.snapshot.receiptDrafts).toHaveLength(
      beforeSnapshot.receiptDrafts.length + 1,
    );
    expect(result.data?.snapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(result.data?.snapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(result.data?.snapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
    expect(result.data?.overview).toEqual(beforeOverview);
  });

  it("rejects duplicate selected local Drive/Docs files by content hash", async () => {
    const first = await importLocalDriveDocsSelectedFileAndReload({
      fileName: "software-receipt.md",
      rawText: mockDocumentReceiptText,
      sourceKind: "google_drive",
    });
    const beforeDuplicateSnapshot = (await getFinanceSnapshot()).snapshot;
    const duplicate = await importLocalDriveDocsSelectedFileAndReload({
      fileName: "renamed-software-receipt.txt",
      rawText: mockDocumentReceiptText,
      sourceKind: "google_drive",
    });
    const afterDuplicateSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.errorMessage).toContain(
      "Local Google Drive selected file has already been saved as receipt draft",
    );
    expect(afterDuplicateSnapshot).toEqual(beforeDuplicateSnapshot);
  });

  it("rejects unsupported selected file types before draft creation", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    const result = await importLocalDriveDocsSelectedFileAndReload({
      fileName: "receipt.pdf",
      rawText: mockDocumentReceiptText,
      sourceKind: "google_drive",
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe(
      "Selected file type is not supported. Use .txt, .md, .html, or .json.",
    );
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("rejects invalid selected-file extraction output without creating partial drafts", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const invalidProvider: ReceiptExtractionProvider = {
      providerName: "invalid-selected-file-provider",
      async extractReceiptDraft() {
        return {
          draft: {
            confidence: 0.8,
            currency: "usd",
            items: [
              {
                categoryId: "software",
                confidence: 0.8,
                flags: [],
                kind: "item",
                normalizedName: "pro plan",
                rawName: "Pro plan",
                tags: ["software"],
                totalPrice: 12,
              },
            ],
            totalAmount: 12,
            warnings: [],
          },
          extractedAt: "2026-06-05T09:31:00.000Z",
          providerName: "invalid-selected-file-provider",
        };
      },
    };

    const result = await importLocalDriveDocsSelectedFileAndReload(
      {
        fileName: "software-receipt.txt",
        rawText: mockDocumentReceiptText,
        sourceKind: "google_docs",
      },
      { extractionProvider: invalidProvider },
    );
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe(
      "AI extraction currency must be a three-letter uppercase currency code.",
    );
    expect(afterSnapshot.receiptDrafts).toEqual(beforeSnapshot.receiptDrafts);
    expect(afterSnapshot.receiptDraftItems).toEqual(
      beforeSnapshot.receiptDraftItems,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
  });
  it("returns validation errors for mock AI extraction without changing data", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;

    const result = await simulateAiReceiptExtractionAndSaveDraftAndReload({
      rawText: "",
      sourceKind: "gmail",
    });
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe(
      "Receipt source text is required for AI extraction.",
    );
    expect(afterSnapshot.receiptDrafts).toEqual(beforeSnapshot.receiptDrafts);
    expect(afterSnapshot.receiptDraftItems).toEqual(
      beforeSnapshot.receiptDraftItems,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
  });

  it("rejects invalid AI extraction JSON without creating partial drafts", async () => {
    const beforeSnapshot = (await getFinanceSnapshot()).snapshot;
    const invalidProvider: ReceiptExtractionProvider = {
      providerName: "invalid-test-provider",
      async extractReceiptDraft() {
        return {
          draft: {
            confidence: 0.9,
            currency: "usd",
            items: [
              {
                categoryId: "dairy",
                confidence: 0.8,
                flags: [],
                kind: "item",
                normalizedName: "milk",
                rawName: "Milk",
                tags: ["dairy"],
                totalPrice: 3,
              },
            ],
            totalAmount: 3,
            warnings: [],
          },
          extractedAt: "2026-06-04T10:16:00.000Z",
          providerName: "invalid-test-provider",
        };
      },
    };

    const result = await simulateAiReceiptExtractionAndSaveDraftAndReload(
      {
        rawText: mockEmailReceiptText,
        sourceKind: "gmail",
      },
      invalidProvider,
    );
    const afterSnapshot = (await getFinanceSnapshot()).snapshot;

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe(
      "AI extraction currency must be a three-letter uppercase currency code.",
    );
    expect(afterSnapshot.receiptDrafts).toEqual(beforeSnapshot.receiptDrafts);
    expect(afterSnapshot.receiptDraftItems).toEqual(
      beforeSnapshot.receiptDraftItems,
    );
    expect(afterSnapshot.transactions).toEqual(beforeSnapshot.transactions);
    expect(afterSnapshot.receipts).toEqual(beforeSnapshot.receipts);
    expect(afterSnapshot.receiptItems).toEqual(beforeSnapshot.receiptItems);
  });
});

function usdToRub(amount: number): number {
  return convertMoney(amount, "USD", "RUB", defaultCurrencySettings);
}

function snapshotFromBackup(backup: Awaited<ReturnType<typeof exportLocalJsonBackup>>) {
  return {
    accounts: backup.tables.accounts,
    categories: backup.tables.categories,
    currencySettings: backup.tables.settings.currencySettings,
    receiptDraftItems: backup.tables.receiptDraftItems,
    receiptDrafts: backup.tables.receiptDrafts,
    receiptItems: backup.tables.receiptItems,
    receipts: backup.tables.receipts,
    recurringExpenses: backup.tables.recurringExpenses,
    transactions: backup.tables.transactions,
  };
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function saveConfirmationDraft(status: "draft" | "reviewed") {
  return saveReceiptDraft({
    confidence: 0.88,
    currency: "GBP",
    date: "2026-06-14",
    items: [
      {
        categoryId: "groceries",
        confidence: 0.7,
        flags: ["low_confidence"],
        kind: "item",
        normalizedName: "tea",
        quantity: 2,
        rawLine: "Tea 2 x 5.00",
        rawName: "Tea",
        tags: ["groceries"],
        totalPrice: 10,
        unitPrice: 5,
      },
      {
        categoryId: "groceries",
        confidence: 0.92,
        flags: [],
        kind: "item",
        normalizedName: "bread",
        quantity: 1,
        rawLine: "Bread 20.00",
        rawName: "Bread",
        tags: ["groceries"],
        totalPrice: 20,
      },
    ],
    merchant: "London Grocer",
    rawText: "London Grocer\n2026-06-14\nTea 2 x 5.00\nBread 20.00\nTOTAL 30.00",
    status,
    total: 30,
    warnings: ["Review preserved before confirmation."],
  });
}
