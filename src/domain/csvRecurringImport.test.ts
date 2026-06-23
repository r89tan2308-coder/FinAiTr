import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { buildRecurringCsvImportPreview } from "./csvRecurringImport";
import type { FinanceSnapshot } from "./models";

describe("recurring CSV import preview", () => {
  it("parses valid recurring CSV rows without mutating the source snapshot", () => {
    const snapshot = createTestSnapshot();
    const before = cloneJsonValue(snapshot);
    const csv = [
      "name,merchant,note,account_name,category_name,status,frequency,next_due_date,amount,currency,tags",
      '"Comma, ""Quote"" Service","Vendor, LLC","First line\nSecond line",Everyday card,Software,paused,monthly,2026-07-10,12.345,EUR,"software; import"',
    ].join("\r\n");

    const preview = buildRecurringCsvImportPreview(csv, snapshot);

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
      frequency: "monthly",
      merchant: "Vendor, LLC",
      name: 'Comma, "Quote" Service',
      nextDueDate: "2026-07-10",
      note: "First line\nSecond line",
      status: "paused",
      tags: ["software", "import"],
    });
    expect(snapshot).toEqual(before);
  });

  it("accepts Phase 8D-A recurring export headers", () => {
    const preview = buildRecurringCsvImportPreview(
      [
        "recurring_id,name,merchant,account_id,account_name,category_id,category_name,status,frequency,next_due_date,amount,currency,monthly_amount,display_monthly_amount,display_currency,tags,note,created_at,updated_at",
        "rec-exported,Export Recurring,Export Merchant,account-card,Everyday card,software,Software,active,yearly,2026-07-11,120,USD,10,725.6,RUB,software; yearly,Export note,2026-06-11T10:00:00.000Z,2026-06-11T10:00:00.000Z",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(true);
    expect(preview.importableRows).toHaveLength(1);
    expect(preview.importableRows[0]).toMatchObject({
      accountId: "account-card",
      amount: 120,
      categoryId: "software",
      currency: "USD",
      frequency: "yearly",
      merchant: "Export Merchant",
      name: "Export Recurring",
      nextDueDate: "2026-07-11",
      note: "Export note",
      status: "active",
    });
  });

  it("returns row-level errors for malformed recurring values", () => {
    const preview = buildRecurringCsvImportPreview(
      [
        "name,account_name,category_name,status,frequency,next_due_date,amount,currency",
        ",Missing account,Unknown category,invalid,daily,2026-99-01,0,",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(false);
    expect(preview.validRowCount).toBe(0);
    expect(preview.errorCount).toBeGreaterThan(0);
    expect(preview.rows[0].errors).toEqual([
      "Name is required.",
      "Amount must be greater than zero.",
      "Currency is required.",
      "Frequency must be weekly, monthly, or yearly.",
      "Next due date must be a valid YYYY-MM-DD value.",
      "Status must be active, paused, or cancelled.",
      "Unknown account: Missing account.",
      "Unknown category: Unknown category.",
    ]);
  });

  it("detects likely duplicates against existing recurring expenses and within the file", () => {
    const preview = buildRecurringCsvImportPreview(
      [
        "name,merchant,account_id,frequency,next_due_date,amount,currency",
        "OpenAI,OpenAI,account-card,monthly,2026-06-30,20.00,USD",
        "OpenAI,OpenAI,account-card,monthly,2026-06-30,20,USD",
      ].join("\r\n"),
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(true);
    expect(preview.duplicateCount).toBe(2);
    expect(preview.rows[0].warnings).toContain(
      "Likely duplicate of an existing recurring expense.",
    );
    expect(preview.rows[1].warnings).toEqual([
      "Likely duplicate of an existing recurring expense.",
      "Likely duplicate of another row in this CSV file.",
    ]);
  });

  it("rejects files with missing required headers before row import", () => {
    const preview = buildRecurringCsvImportPreview(
      "name,amount\r\nNo account,10\r\n",
      createTestSnapshot(),
    );

    expect(preview.canImport).toBe(false);
    expect(preview.fileErrors).toEqual([
      "CSV header row must include name, amount, currency, frequency, next due date, and account fields.",
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
