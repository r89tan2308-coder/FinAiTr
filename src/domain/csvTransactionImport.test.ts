import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { buildTransactionCsvImportPreview } from "./csvTransactionImport";
import type { FinanceSnapshot } from "./models";

describe("transaction CSV import preview", () => {
  it("parses valid transaction CSV rows without mutating the source snapshot", () => {
    const snapshot = createTestSnapshot();
    const before = cloneJsonValue(snapshot);
    const csv = [
      "date,merchant,description,account_name,category_name,amount,currency,tags",
      '2026-06-10,"Comma, ""Quote"" Store","First line\nSecond line",Everyday card,Software,12.345,EUR,"software; import"',
    ].join("\r\n");

    const preview = buildTransactionCsvImportPreview(csv, snapshot);

    expect(preview).toMatchObject({
      canImport: true,
      duplicateCount: 0,
      errorCount: 0,
      rowCount: 1,
      validRowCount: 1,
      warningCount: 0,
    });
    expect(preview.importableRows[0]).toEqual({
      accountId: "account-card",
      amount: 12.35,
      categoryId: "software",
      currency: "EUR",
      date: "2026-06-10",
      description: "First line\nSecond line",
      merchant: 'Comma, "Quote" Store',
      tags: ["software", "import"],
    });
    expect(snapshot).toEqual(before);
  });

  it("accepts Phase 8D-A transaction export headers", () => {
    const preview = buildTransactionCsvImportPreview(
      [
        "transaction_id,date,merchant,description,account_id,account_name,category_id,category_name,source,receipt_id,amount,currency,display_amount,display_currency,tags,created_at,updated_at",
        "tx-exported,2026-06-11,Export Merchant,Export note,account-card,Everyday card,groceries,Groceries,manual,,5.5,USD,399.08,RUB,groceries,2026-06-11T10:00:00.000Z,2026-06-11T10:00:00.000Z",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(true);
    expect(preview.importableRows).toHaveLength(1);
    expect(preview.importableRows[0]).toMatchObject({
      accountId: "account-card",
      amount: 5.5,
      categoryId: "groceries",
      currency: "USD",
      date: "2026-06-11",
      merchant: "Export Merchant",
    });
  });

  it("returns row-level errors for malformed transaction values", () => {
    const preview = buildTransactionCsvImportPreview(
      [
        "date,merchant,description,account_name,category_name,amount,currency",
        "2026-99-01,,,Missing account,Unknown category,0,",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(false);
    expect(preview.validRowCount).toBe(0);
    expect(preview.errorCount).toBeGreaterThan(0);
    expect(preview.rows[0].errors).toEqual([
      "Date must be a valid YYYY-MM-DD value.",
      "Amount must be greater than zero.",
      "Currency is required.",
      "Merchant or description is required.",
      "Unknown account: Missing account.",
      "Unknown category: Unknown category.",
    ]);
  });

  it("detects likely duplicates against existing transactions and within the file", () => {
    const preview = buildTransactionCsvImportPreview(
      [
        "date,merchant,account_id,category_id,amount,currency",
        "2026-06-01,Green Market,account-card,groceries,42.80,USD",
        "2026-06-01,Green Market,account-card,groceries,42.8,USD",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(true);
    expect(preview.duplicateCount).toBe(2);
    expect(preview.rows[0].warnings).toContain(
      "Likely duplicate of an existing transaction.",
    );
    expect(preview.rows[1].warnings).toEqual([
      "Likely duplicate of an existing transaction.",
      "Likely duplicate of another row in this CSV file.",
    ]);
  });

  it("returns file errors for malformed quoted CSV before row import", () => {
    const preview = buildTransactionCsvImportPreview(
      'date,merchant,account_name,category_name,amount,currency\r\n2026-06-10,"Unclosed,Everyday card,Software,10,USD',
      createTestSnapshot(),
    );

    expect(preview).toMatchObject({
      canImport: false,
      fileErrors: ["CSV contains an unclosed quoted value."],
      rows: [],
    });
  });

  it("rejects files with missing required headers before row import", () => {
    const preview = buildTransactionCsvImportPreview(
      "merchant,amount\r\nNo account,10\r\n",
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(false);
    expect(preview.fileErrors).toEqual([
      "CSV header row must include date, amount, currency, merchant or description, account, and category fields.",
    ]);
    expect(preview.rows).toEqual([]);
  });
});

function createTestSnapshot(): FinanceSnapshot {
  return cloneJsonValue(createSeedFinanceSnapshot());
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
