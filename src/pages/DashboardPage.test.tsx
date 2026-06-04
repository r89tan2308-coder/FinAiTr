import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createSeedFinanceSnapshot } from "../data/seedData";
import { convertMoney, formatCurrencyAmount } from "../domain/currencySettings";
import { buildFinanceOverview } from "../domain/financeViews";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
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

    const overview = buildFinanceOverview(snapshot, {
      monthKey: "2026-06",
    });

    render(
      <DashboardPage
        currencySettings={snapshot.currencySettings}
        overview={overview}
      />,
    );

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

    expect(screen.getByText("Protein Bar")).toBeInTheDocument();
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
});
