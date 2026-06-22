import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import {
  buildLocalCsvExport,
  serializeCsv,
  type LocalCsvExportKind,
} from "./csvExport";
import type { FinanceSnapshot } from "./models";

const exportedAt = "2026-06-22T10:11:12.000Z";
const transactionHeader =
  "transaction_id,date,merchant,description,account_id,account_name,category_id,category_name,source,receipt_id,amount,currency,display_amount,display_currency,tags,created_at,updated_at";
const confirmedReceiptItemHeader =
  "receipt_item_id,receipt_id,receipt_date,merchant,receipt_source,source_kind,source_id,source_title,source_sender,source_url,source_received_at,source_provider,source_model,item_raw_name,item_normalized_name,category_id,category_name,quantity,unit_price,total_price,currency,display_total,display_currency,tags,flags,confidence";
const recurringExpenseHeader =
  "recurring_id,name,merchant,account_id,account_name,category_id,category_name,status,frequency,next_due_date,amount,currency,monthly_amount,display_monthly_amount,display_currency,tags,note,created_at,updated_at";

describe("local CSV exports", () => {
  it("serializes CSV values with comma, quote, and newline escaping", () => {
    expect(
      serializeCsv([["plain", "has,comma", 'has "quote"', "has\nnewline"]]),
    ).toBe('plain,"has,comma","has ""quote""","has\nnewline"\r\n');
  });

  it("exports transactions with stable headers, original values, display values, and readable names", () => {
    const snapshot = createTestSnapshot();
    snapshot.currencySettings = {
      ...snapshot.currencySettings,
      displayCurrency: "EUR",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 100,
      },
    };
    snapshot.transactions = [
      ...snapshot.transactions,
      {
        accountId: "account-card",
        amount: 10,
        categoryId: "software",
        createdAt: "2026-06-04T09:00:00.000Z",
        currency: "USD",
        date: "2026-06-04",
        description: "First line\nSecond line",
        id: "tx-csv-escaping",
        merchant: 'Comma, "Quote"\nStore',
        source: "manual",
        tags: ["alpha,beta", 'quote"tag', "line\nbreak"],
        updatedAt: "2026-06-04T09:30:00.000Z",
      },
    ];

    const result = buildLocalCsvExport(snapshot, "transactions", { exportedAt });

    expect(result).toMatchObject({
      exportedAt,
      filename: "finaitr-transactions-2026-06-22T10-11-12-000Z.csv",
      kind: "transactions",
      rowCount: snapshot.transactions.length,
    });
    expect(result.content.startsWith(`${transactionHeader}\r\n`)).toBe(true);
    expect(result.content).toContain(
      'tx-csv-escaping,2026-06-04,"Comma, ""Quote""\nStore","First line\nSecond line",account-card,Everyday card,software,Software,manual,,10,USD,8.75,EUR,"alpha,beta; quote""tag; line\nbreak",2026-06-04T09:00:00.000Z,2026-06-04T09:30:00.000Z',
    );
  });

  it("exports confirmed receipt items only with receipt source metadata", () => {
    const snapshot = createTestSnapshot();
    snapshot.currencySettings = {
      ...snapshot.currencySettings,
      displayCurrency: "USD",
    };
    snapshot.receipts = snapshot.receipts.map((receipt) =>
      receipt.id === "receipt-city-pharmacy"
        ? {
            ...receipt,
            source: "ai_extraction_mock",
            sourceMetadata: {
              kind: "gmail",
              modelName: "heuristic-v1",
              providerName: "local-mock-ai-extractor",
              receivedAt: "2026-06-02T11:00:00.000Z",
              sender: "receipts@city.example",
              sourceId: "msg-city-pharmacy",
              title: 'City, Pharmacy "Receipt"',
              url: "https://mail.example.test/city",
            },
          }
        : receipt,
    );

    const result = buildLocalCsvExport(snapshot, "confirmed_receipt_items", {
      exportedAt,
    });

    expect(result.rowCount).toBe(2);
    expect(result.content.startsWith(`${confirmedReceiptItemHeader}\r\n`)).toBe(
      true,
    );
    expect(result.content).toContain("item-bandages");
    expect(result.content).toContain("item-ibuprofen");
    expect(result.content).not.toContain("item-milk");
    expect(result.content).toContain(
      'ai_extraction_mock,gmail,msg-city-pharmacy,"City, Pharmacy ""Receipt""",receipts@city.example,https://mail.example.test/city,2026-06-02T11:00:00.000Z,local-mock-ai-extractor,heuristic-v1',
    );
  });

  it("exports recurring expenses with monthly and display monthly amounts", () => {
    const snapshot = createTestSnapshot();
    snapshot.currencySettings = {
      ...snapshot.currencySettings,
      displayCurrency: "EUR",
      ratesToRub: {
        USD: 70,
        RUB: 1,
        EUR: 80,
        GBP: 100,
      },
    };
    snapshot.recurringExpenses = [
      {
        accountId: "account-card",
        amount: 12,
        categoryId: "software",
        createdAt: "2026-06-05T08:00:00.000Z",
        currency: "USD",
        frequency: "weekly",
        id: "rec-weekly-test",
        merchant: "Weekly, Service",
        name: "Weekly Service",
        nextDueDate: "2026-06-09",
        note: "Recurring note",
        status: "active",
        tags: ["software", "weekly"],
        updatedAt: "2026-06-05T08:30:00.000Z",
      },
    ];

    const result = buildLocalCsvExport(snapshot, "recurring_expenses", {
      exportedAt,
    });

    expect(result.rowCount).toBe(1);
    expect(result.content.startsWith(`${recurringExpenseHeader}\r\n`)).toBe(true);
    expect(result.content).toContain(
      'rec-weekly-test,Weekly Service,"Weekly, Service",account-card,Everyday card,software,Software,active,weekly,2026-06-09,12,USD,52,45.5,EUR,software; weekly,Recurring note,2026-06-05T08:00:00.000Z,2026-06-05T08:30:00.000Z',
    );
  });

  it("emits headers for empty datasets", () => {
    const snapshot = createTestSnapshot();
    snapshot.transactions = [];
    snapshot.receipts = [];
    snapshot.receiptItems = [];
    snapshot.recurringExpenses = [];

    expect(
      buildLocalCsvExport(snapshot, "transactions", { exportedAt }),
    ).toMatchObject({
      content: `${transactionHeader}\r\n`,
      rowCount: 0,
    });
    expect(
      buildLocalCsvExport(snapshot, "confirmed_receipt_items", { exportedAt }),
    ).toMatchObject({
      content: `${confirmedReceiptItemHeader}\r\n`,
      rowCount: 0,
    });
    expect(
      buildLocalCsvExport(snapshot, "recurring_expenses", { exportedAt }),
    ).toMatchObject({
      content: `${recurringExpenseHeader}\r\n`,
      rowCount: 0,
    });
  });

  it("does not mutate source snapshot data", () => {
    const snapshot = createTestSnapshot();
    const before = cloneJsonValue(snapshot);
    const kinds: LocalCsvExportKind[] = [
      "transactions",
      "confirmed_receipt_items",
      "recurring_expenses",
    ];

    kinds.forEach((kind) => {
      buildLocalCsvExport(snapshot, kind, { exportedAt });
    });

    expect(snapshot).toEqual(before);
  });
});

function createTestSnapshot(): FinanceSnapshot {
  return cloneJsonValue(createSeedFinanceSnapshot());
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
