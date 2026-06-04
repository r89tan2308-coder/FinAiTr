import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { convertMoney, formatCurrencyAmount } from "../domain/currencySettings";
import { buildFinanceOverview } from "../domain/financeViews";
import { type FinanceSnapshot } from "../domain/models";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows confirmed receipt item analytics and switches period filters", async () => {
    const user = userEvent.setup();
    const snapshot = createSeedFinanceSnapshot();

    snapshot.receipts = [
      ...snapshot.receipts,
      {
        ...snapshot.receipts[1],
        currency: "USD",
        date: "2026-05-20",
        id: "receipt-may-confirmed",
        status: "confirmed",
      },
    ];
    snapshot.receiptItems = [
      ...snapshot.receiptItems,
      {
        ...snapshot.receiptItems[1],
        categoryId: "groceries",
        id: "item-may-protein-bar",
        normalizedName: "protein bar",
        rawName: "Protein Bar",
        receiptId: "receipt-may-confirmed",
        tags: ["groceries"],
        totalPrice: 30,
      },
    ];

    renderDashboard(snapshot);

    expect(
      screen.getByText(
        "Confirmed receipt item breakdown. This is detail for receipt-linked purchases, not extra spending.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protein Bar")).not.toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) =>
        element?.textContent ===
          formatCurrencyAmount(
            convertMoney(18.7, "USD", "RUB", snapshot.currencySettings),
            "RUB",
          ),
      ).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "All time" }));

    expect(screen.getAllByText("Protein Bar").length).toBeGreaterThan(0);
    expect(
      screen.getByText((_, element) =>
        element?.textContent ===
          formatCurrencyAmount(
            convertMoney(48.7, "USD", "RUB", snapshot.currencySettings),
            "RUB",
          ),
      ),
    ).toBeInTheDocument();
  });

  it("searches item analytics without changing Dashboard monthly spend", async () => {
    const user = userEvent.setup();
    const snapshot = createSeedFinanceSnapshot();
    const monthlySpend = formatCurrencyAmount(
      buildFinanceOverview(snapshot, { monthKey: "2026-06" }).monthlySpend,
      "RUB",
    );

    renderDashboard(snapshot);

    expect(getAllByExactTextContent(monthlySpend).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Search items"), "band");

    expect(screen.getAllByText("Bandages").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ibuprofen")).not.toBeInTheDocument();
    expect(getAllByExactTextContent(monthlySpend).length).toBeGreaterThan(0);
  });

  it("filters item analytics by category and shows a category empty state", async () => {
    const user = userEvent.setup();

    renderDashboard();

    await user.selectOptions(screen.getByLabelText("Item category"), "groceries");

    expect(
      screen.getByText(
        "No confirmed receipt items match this category for this period.",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Item category"), "medicine");

    expect(screen.getAllByText("Ibuprofen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bandages").length).toBeGreaterThan(0);
  });

  it("shows item detail rows with original and display amounts", async () => {
    const user = userEvent.setup();
    const snapshot = createSeedFinanceSnapshot();
    const originalAmount = formatCurrencyAmount(6.2, "USD");
    const displayAmount = formatCurrencyAmount(
      convertMoney(6.2, "USD", "RUB", snapshot.currencySettings),
      "RUB",
    );

    renderDashboard(snapshot);

    await user.click(screen.getByRole("button", { name: /Bandages/ }));

    expect(screen.getAllByText(/City Pharmacy/).length).toBeGreaterThan(0);
    expect(screen.getByText("Normalized: bandages")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
          `${originalAmount} original · ${displayAmount} display`,
      ),
    ).toBeInTheDocument();
  });

  it("shows a search empty state", async () => {
    const user = userEvent.setup();

    renderDashboard();

    await user.type(screen.getByLabelText("Search items"), "no such item");

    expect(
      screen.getByText("No item analytics match this search."),
    ).toBeInTheDocument();
  });

  it("shows a no confirmed receipts empty state", () => {
    const snapshot = createSeedFinanceSnapshot();
    snapshot.receipts = snapshot.receipts.map((receipt) => ({
      ...receipt,
      status: "needs_review",
    }));

    renderDashboard(snapshot);

    expect(
      screen.getByText("No confirmed receipts with items for this period."),
    ).toBeInTheDocument();
  });
});

function renderDashboard(snapshot: FinanceSnapshot = createSeedFinanceSnapshot()) {
  render(
    <DashboardPage
      categories={snapshot.categories}
      currencySettings={snapshot.currencySettings}
      overview={buildFinanceOverview(snapshot, {
        monthKey: "2026-06",
      })}
    />,
  );
}

function getAllByExactTextContent(textContent: string): HTMLElement[] {
  return screen.getAllByText((_, element) => element?.textContent === textContent);
}
