import { Edit3, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PageSection } from "../components/PageSection";
import {
  formatCurrencyAmount,
  formatDisplayMoney,
  supportedCurrencyCodes,
} from "../domain/currencySettings";
import { toMonthlyRecurringAmount } from "../domain/financeViews";
import {
  type Account,
  type Category,
  type CurrencySettings,
  type RecurringExpense,
} from "../domain/models";
import {
  emptyRecurringExpenseFormValues,
  formValuesToRecurringExpenseInput,
  recurringExpenseToFormValues,
  type RecurringExpenseFormValues,
  type RecurringExpenseInput,
  type RecurringExpenseValidationErrors,
} from "../domain/recurringValidation";
import { type RecurringExpenseActionResult } from "../services/financeDataService";

interface RecurringPageProps {
  accounts: Account[];
  categories: Category[];
  currencySettings: CurrencySettings;
  monthlyEstimate: number;
  onCreate: (input: RecurringExpenseInput) => Promise<RecurringExpenseActionResult>;
  onDelete: (
    recurringExpenseId: string,
  ) => Promise<RecurringExpenseActionResult>;
  onUpdate: (
    recurringExpenseId: string,
    input: RecurringExpenseInput,
  ) => Promise<RecurringExpenseActionResult>;
  recurringExpenses: RecurringExpense[];
}

export function RecurringPage({
  accounts,
  categories,
  currencySettings,
  monthlyEstimate,
  onCreate,
  onDelete,
  onUpdate,
  recurringExpenses,
}: RecurringPageProps) {
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived),
    [accounts],
  );
  const sortedCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === "expense")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories],
  );
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const sortedExpenses = useMemo(
    () =>
      [...recurringExpenses].sort((left, right) =>
        left.nextDueDate.localeCompare(right.nextDueDate),
      ),
    [recurringExpenses],
  );
  const [actionError, setActionError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [deleteCandidateId, setDeleteCandidateId] = useState<string>();
  const [editingExpenseId, setEditingExpenseId] = useState<string>();
  const [formErrors, setFormErrors] =
    useState<RecurringExpenseValidationErrors>({});
  const [formValues, setFormValues] = useState(() =>
    emptyRecurringExpenseFormValues({
      accountId: activeAccounts[0]?.id ?? "",
      categoryId: sortedCategories[0]?.id ?? "",
      currency: currencySettings.displayCurrency,
    }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editingExpense = recurringExpenses.find(
    (expense) => expense.id === editingExpenseId,
  );

  function resetForm(): void {
    setActionError(undefined);
    setDeleteCandidateId(undefined);
    setEditingExpenseId(undefined);
    setFormErrors({});
    setFormValues(
      emptyRecurringExpenseFormValues({
        accountId: activeAccounts[0]?.id ?? "",
        categoryId: sortedCategories[0]?.id ?? "",
        currency: currencySettings.displayCurrency,
      }),
    );
  }

  function updateFormValue(
    field: keyof RecurringExpenseFormValues,
    value: string,
  ): void {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
    setActionError(undefined);
    setActionMessage(undefined);
  }

  function beginEdit(expense: RecurringExpense): void {
    setActionError(undefined);
    setActionMessage(undefined);
    setDeleteCandidateId(undefined);
    setEditingExpenseId(expense.id);
    setFormErrors({});
    setFormValues(recurringExpenseToFormValues(expense));
  }

  async function submitRecurringExpense(): Promise<void> {
    setActionError(undefined);
    setActionMessage(undefined);
    setIsSubmitting(true);

    const input = formValuesToRecurringExpenseInput(formValues);
    const result = editingExpenseId
      ? await onUpdate(editingExpenseId, input)
      : await onCreate(input);

    setIsSubmitting(false);

    if (result.ok) {
      setActionMessage(
        editingExpenseId
          ? "Recurring expense updated."
          : "Recurring expense added.",
      );
      resetForm();
      return;
    }

    setFormErrors(result.errors ?? {});
    setActionError(result.errorMessage);
  }

  async function confirmDelete(expenseId: string): Promise<void> {
    setActionError(undefined);
    setActionMessage(undefined);
    setIsSubmitting(true);

    const result = await onDelete(expenseId);

    setIsSubmitting(false);

    if (result.ok) {
      if (editingExpenseId === expenseId) {
        resetForm();
      }

      setDeleteCandidateId(undefined);
      setActionMessage("Recurring expense deleted.");
      return;
    }

    setActionError(result.errorMessage ?? "Recurring expense could not be deleted.");
  }

  return (
    <div className="page-stack">
      {actionMessage && (
        <div className="success-banner" role="status">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="status-banner" role="alert">
          {actionError}
        </div>
      )}

      <div className="recurring-summary-panel">
        <span>Estimated monthly total</span>
        <strong>
          {formatCurrencyAmount(monthlyEstimate, currencySettings.displayCurrency)}
        </strong>
        <small>Planning estimate only; recurring expenses do not create transactions.</small>
      </div>

      <section className="form-panel" aria-label="Recurring expense form">
        <div className="section-heading">
          <h2>{editingExpense ? "Edit recurring expense" : "Add recurring expense"}</h2>
          {editingExpense && (
            <button
              aria-label="Cancel recurring edit"
              className="icon-button"
              onClick={resetForm}
              title="Cancel edit"
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          )}
        </div>
        <p className="settings-note">
          Use recurring expenses for subscriptions and repeating bills. They affect
          only the separate recurring estimate until you create transactions
          yourself.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input
              onChange={(event) => updateFormValue("name", event.target.value)}
              value={formValues.name}
            />
            {formErrors.name && <em>{formErrors.name}</em>}
          </label>

          <label className="field">
            <span>Merchant / description</span>
            <input
              onChange={(event) => updateFormValue("merchant", event.target.value)}
              placeholder="Service, merchant, or description"
              value={formValues.merchant}
            />
          </label>

          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => updateFormValue("amount", event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={formValues.amount}
            />
            {formErrors.amount && <em>{formErrors.amount}</em>}
          </label>

          <label className="field">
            <span>Currency</span>
            <select
              aria-label="Recurring currency"
              onChange={(event) => updateFormValue("currency", event.target.value)}
              value={formValues.currency}
            >
              {supportedCurrencyCodes.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
            </select>
            {formErrors.currency && <em>{formErrors.currency}</em>}
          </label>

          <label className="field">
            <span>Account</span>
            <select
              aria-label="Recurring account"
              onChange={(event) => updateFormValue("accountId", event.target.value)}
              value={formValues.accountId}
            >
              <option value="">Choose account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {formErrors.accountId && <em>{formErrors.accountId}</em>}
          </label>

          <label className="field">
            <span>Category</span>
            <select
              aria-label="Recurring category"
              onChange={(event) => updateFormValue("categoryId", event.target.value)}
              value={formValues.categoryId}
            >
              <option value="">Uncategorized</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Frequency</span>
            <select
              aria-label="Recurring frequency"
              onChange={(event) => updateFormValue("frequency", event.target.value)}
              value={formValues.frequency}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {formErrors.frequency && <em>{formErrors.frequency}</em>}
          </label>

          <label className="field">
            <span>Next due date</span>
            <input
              onChange={(event) =>
                updateFormValue("nextDueDate", event.target.value)
              }
              type="date"
              value={formValues.nextDueDate}
            />
            {formErrors.nextDueDate && <em>{formErrors.nextDueDate}</em>}
          </label>

          <label className="field">
            <span>Status</span>
            <select
              aria-label="Recurring status"
              onChange={(event) => updateFormValue("status", event.target.value)}
              value={formValues.status}
            >
              <option value="active">Active</option>
              <option value="paused">Inactive</option>
            </select>
          </label>

          <label className="field field-wide">
            <span>Note</span>
            <input
              onChange={(event) => updateFormValue("note", event.target.value)}
              placeholder="Optional note"
              value={formValues.note}
            />
          </label>

          <label className="field field-wide">
            <span>Tags</span>
            <input
              onChange={(event) => updateFormValue("tagsText", event.target.value)}
              placeholder="software, subscription"
              value={formValues.tagsText}
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            className="primary-button"
            disabled={isSubmitting}
            onClick={() => void submitRecurringExpense()}
            type="button"
          >
            {editingExpense ? "Save changes" : "Add recurring"}
          </button>
          {editingExpense && (
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <PageSection title="Recurring expenses">
        {sortedExpenses.length === 0 ? (
          <div className="empty-state">
            No recurring expenses yet. Add subscriptions or repeating bills above;
            they stay planning records and do not create transactions.
          </div>
        ) : (
          <div className="item-list">
            {sortedExpenses.map((expense) => (
              <article className="list-row recurring-row" key={expense.id}>
                <div>
                  <strong>{expense.name}</strong>
                  <span>
                    {expense.nextDueDate} · {formatFrequency(expense.frequency)} ·{" "}
                    {formatRecurringStatus(expense.status)}
                  </span>
                  <small>
                    {[
                      expense.merchant,
                      accountNames.get(expense.accountId ?? ""),
                      categoryNames.get(expense.categoryId ?? ""),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No account or category"}
                  </small>
                  {expense.note && <small>{expense.note}</small>}
                  {(expense.tags ?? []).length > 0 && (
                    <small>{(expense.tags ?? []).join(", ")}</small>
                  )}
                </div>
                <b>
                  {formatDisplayMoney(
                    toMonthlyRecurringAmount(expense),
                    expense.currency,
                    currencySettings,
                  )}
                  <small>
                    {formatCurrencyAmount(expense.amount, expense.currency)} source
                  </small>
                </b>
                <div className="row-actions">
                  <button
                    aria-label={`Edit ${expense.name}`}
                    className="icon-button"
                    onClick={() => beginEdit(expense)}
                    title="Edit recurring expense"
                    type="button"
                  >
                    <Edit3 aria-hidden="true" size={17} />
                  </button>
                  {deleteCandidateId === expense.id ? (
                    <>
                      <button
                        className="danger-button"
                        disabled={isSubmitting}
                        onClick={() => void confirmDelete(expense.id)}
                        type="button"
                      >
                        Confirm delete
                      </button>
                      <button
                        className="secondary-button"
                        disabled={isSubmitting}
                        onClick={() => setDeleteCandidateId(undefined)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      aria-label={`Delete ${expense.name}`}
                      className="icon-button"
                      onClick={() => setDeleteCandidateId(expense.id)}
                      title="Delete recurring expense"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

function formatFrequency(frequency: RecurringExpense["frequency"]): string {
  return frequency[0].toUpperCase() + frequency.slice(1);
}

function formatRecurringStatus(status: RecurringExpense["status"]): string {
  if (status === "active") {
    return "Active";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Inactive";
}
