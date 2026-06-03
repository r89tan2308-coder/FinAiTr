import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildFinanceOverview } from "../../domain/financeViews";
import { financeDb } from "../db";
import {
  addManualTransaction,
  deleteTransaction,
  getFinanceSnapshot,
  updateTransaction,
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
      beforeOverview.monthlySpend + 10.25,
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
      beforeOverview.monthlySpend + 25.5,
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
});
