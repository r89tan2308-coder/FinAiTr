import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  seedAccounts,
  seedCategories,
  seedRecurringExpenses,
} from "../data/seedData";
import {
  convertMoney,
  defaultCurrencySettings,
  formatCurrencyAmount,
} from "../domain/currencySettings";
import { type RecurringExpense } from "../domain/models";
import {
  type RecurringExpenseInput,
  type RecurringExpenseValidationErrors,
} from "../domain/recurringValidation";
import { type RecurringExpenseActionResult } from "../services/financeDataService";
import { RecurringPage } from "./RecurringPage";

afterEach(() => {
  cleanup();
});

interface RenderRecurringPageOptions {
  monthlyEstimate?: number;
  onCreate?: (input: RecurringExpenseInput) => Promise<RecurringExpenseActionResult>;
  onDelete?: (expenseId: string) => Promise<RecurringExpenseActionResult>;
  onUpdate?: (
    expenseId: string,
    input: RecurringExpenseInput,
  ) => Promise<RecurringExpenseActionResult>;
  recurringExpenses?: RecurringExpense[];
}

function renderRecurringPage(options: RenderRecurringPageOptions = {}) {
  render(
    <RecurringPage
      accounts={seedAccounts}
      categories={seedCategories}
      currencySettings={defaultCurrencySettings}
      monthlyEstimate={options.monthlyEstimate ?? 0}
      onCreate={options.onCreate ?? (async () => ({ ok: true }))}
      onDelete={options.onDelete ?? (async () => ({ ok: true }))}
      onUpdate={options.onUpdate ?? (async () => ({ ok: true }))}
      recurringExpenses={options.recurringExpenses ?? []}
    />,
  );
}

describe("RecurringPage", () => {
  it("creates a recurring expense through the action callback", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(async () => ({ ok: true }));
    renderRecurringPage({ onCreate });

    await user.type(screen.getByLabelText("Name"), "Annual Cloud");
    await user.type(
      screen.getByLabelText("Merchant / description"),
      "Cloud Vendor",
    );
    await user.type(screen.getByLabelText("Amount"), "120");
    await user.selectOptions(screen.getByLabelText("Recurring currency"), "EUR");
    await user.selectOptions(screen.getByLabelText("Recurring account"), "account-card");
    await user.selectOptions(screen.getByLabelText("Recurring category"), "software");
    await user.selectOptions(screen.getByLabelText("Recurring frequency"), "yearly");
    await user.type(screen.getByLabelText("Next due date"), "2026-07-01");
    await user.type(screen.getByLabelText("Note"), "Annual team plan");
    await user.type(screen.getByLabelText("Tags"), "software, cloud");
    await user.click(screen.getByRole("button", { name: "Add recurring" }));

    expect(onCreate).toHaveBeenCalledWith({
      accountId: "account-card",
      amount: 120,
      categoryId: "software",
      currency: "EUR",
      frequency: "yearly",
      merchant: "Cloud Vendor",
      name: "Annual Cloud",
      nextDueDate: "2026-07-01",
      note: "Annual team plan",
      status: "active",
      tags: ["software", "cloud"],
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Recurring expense added.",
    );
  });

  it("edits and deletes a recurring expense through action callbacks", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ ok: true }));
    const onUpdate = vi.fn(async () => ({ ok: true }));
    renderRecurringPage({
      onDelete,
      onUpdate,
      recurringExpenses: [seedRecurringExpenses[0]],
    });

    await user.click(screen.getByRole("button", { name: "Edit OpenAI" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "OpenAI Team");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "25");
    await user.selectOptions(screen.getByLabelText("Recurring status"), "paused");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onUpdate).toHaveBeenCalledWith(
      seedRecurringExpenses[0].id,
      expect.objectContaining({
        amount: 25,
        name: "OpenAI Team",
        status: "paused",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Delete OpenAI" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(onDelete).toHaveBeenCalledWith(seedRecurringExpenses[0].id);
  });

  it("shows validation errors returned from the action callback", async () => {
    const user = userEvent.setup();
    const errors: RecurringExpenseValidationErrors = {
      amount: "Amount must be greater than zero.",
      name: "Name is required.",
      nextDueDate: "Next due date must be a valid date.",
    };
    const onCreate = vi.fn(async () => ({ errors, ok: false }));
    renderRecurringPage({ onCreate });

    await user.click(screen.getByRole("button", { name: "Add recurring" }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
    expect(
      screen.getByText("Next due date must be a valid date."),
    ).toBeInTheDocument();
  });

  it("shows converted monthly estimate while preserving source amount display", () => {
    const monthlyEstimate = convertMoney(
      100,
      "EUR",
      "RUB",
      defaultCurrencySettings,
    );
    const expense: RecurringExpense = {
      ...seedRecurringExpenses[0],
      amount: 100,
      currency: "EUR",
      frequency: "monthly",
      id: "rec-eur",
      name: "Euro Plan",
      status: "active",
    };

    renderRecurringPage({
      monthlyEstimate,
      recurringExpenses: [expense],
    });

    expect(screen.getByText("Estimated monthly total")).toBeInTheDocument();
    const estimateText = formatCurrencyAmount(monthlyEstimate, "RUB");
    expect(
      screen.getByText((_, element) => element?.textContent === estimateText),
    ).toBeInTheDocument();
    expect(screen.getByText("Euro Plan")).toBeInTheDocument();
    const sourceText = `${formatCurrencyAmount(100, "EUR")} source`;
    expect(
      screen.getByText((_, element) => element?.textContent === sourceText),
    ).toBeInTheDocument();
  });
});
