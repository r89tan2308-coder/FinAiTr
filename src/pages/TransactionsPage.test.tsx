import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  seedAccounts,
  seedCategories,
  seedTransactions,
} from "../data/seedData";
import { defaultCurrencySettings } from "../domain/currencySettings";
import {
  type TransactionInput,
  type TransactionValidationErrors,
} from "../domain/transactionValidation";
import { type TransactionActionResult } from "../services/financeDataService";
import { TransactionsPage } from "./TransactionsPage";

afterEach(() => {
  cleanup();
});

interface RenderTransactionsPageOptions {
  onCreate?: (input: TransactionInput) => Promise<TransactionActionResult>;
  onDelete?: (transactionId: string) => Promise<TransactionActionResult>;
  onUpdate?: (
    transactionId: string,
    input: TransactionInput,
  ) => Promise<TransactionActionResult>;
  transactions?: typeof seedTransactions;
}

function renderTransactionsPage(options: RenderTransactionsPageOptions = {}) {
  render(
    <TransactionsPage
      accounts={seedAccounts}
      categories={seedCategories}
      currencySettings={defaultCurrencySettings}
      loadStatus="ready"
      onCreate={options.onCreate ?? (async () => ({ ok: true }))}
      onDelete={options.onDelete ?? (async () => ({ ok: true }))}
      onUpdate={options.onUpdate ?? (async () => ({ ok: true }))}
      transactions={options.transactions ?? seedTransactions}
    />,
  );
}

describe("TransactionsPage", () => {
  it("shows local first-use guidance and an empty state", () => {
    renderTransactionsPage({ transactions: [] });

    expect(
      screen.getByText(/Manual entries are saved in this browser profile/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Local transaction records include manual entries/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No transactions yet\. Add one above/),
    ).toBeInTheDocument();
  });

  it("creates a manual transaction through the action callback", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => ({ ok: true }));
    renderTransactionsPage({ onCreate });

    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-06-20");
    await user.type(screen.getByLabelText("Amount"), "12.34");
    await user.selectOptions(screen.getByLabelText("Transaction currency"), "USD");
    await user.type(screen.getByLabelText("Merchant"), "QA Manual Merchant");
    await user.selectOptions(screen.getByLabelText("Account"), "account-card");
    await user.selectOptions(screen.getByLabelText("Category"), "software");
    await user.type(
      screen.getByLabelText("Note"),
      "Phase 8F manual transaction QA",
    );
    await user.type(screen.getByLabelText("Tags"), "qa, manual");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(onCreate).toHaveBeenCalledWith({
      accountId: "account-card",
      amount: 12.34,
      categoryId: "software",
      currency: "USD",
      date: "2026-06-20",
      description: "Phase 8F manual transaction QA",
      merchant: "QA Manual Merchant",
      tags: ["qa", "manual"],
    });
  });

  it("surfaces create validation errors without clearing the form", async () => {
    const user = userEvent.setup();
    const errors: TransactionValidationErrors = {
      amount: "Amount must be greater than zero.",
      merchant: "Merchant or note is required.",
    };
    const onCreate = vi.fn(async () => ({ errors, ok: false }));
    renderTransactionsPage({ onCreate });

    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByText("Merchant or note is required.")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /^Amount/ })).toHaveValue(
      null,
    );
  });

  it("edits and deletes a transaction through action callbacks", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ ok: true }));
    const onUpdate = vi.fn(async () => ({ ok: true }));
    renderTransactionsPage({
      onDelete,
      onUpdate,
      transactions: [seedTransactions[1]],
    });

    await user.click(screen.getByRole("button", { name: "Edit transaction" }));
    await user.clear(screen.getByLabelText("Merchant"));
    await user.type(screen.getByLabelText("Merchant"), "City Pharmacy QA");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "20.5");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdate).toHaveBeenCalledWith(
      seedTransactions[1].id,
      expect.objectContaining({
        amount: 20.5,
        merchant: "City Pharmacy QA",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Delete transaction" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith(seedTransactions[1].id);
  });
});
