import { Edit3, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PageSection } from "../components/PageSection";
import { currency } from "../domain/financeViews";
import { type Account, type Category, type Transaction } from "../domain/models";
import {
  emptyTransactionFormValues,
  formValuesToTransactionInput,
  transactionToFormValues,
  type TransactionFormValues,
  type TransactionInput,
  type TransactionValidationErrors,
} from "../domain/transactionValidation";
import {
  type FinanceLoadStatus,
  type TransactionActionResult,
} from "../services/financeDataService";

interface TransactionsPageProps {
  accounts: Account[];
  categories: Category[];
  loadStatus: FinanceLoadStatus;
  onCreate: (input: TransactionInput) => Promise<TransactionActionResult>;
  onDelete: (transactionId: string) => Promise<TransactionActionResult>;
  onUpdate: (
    transactionId: string,
    input: TransactionInput,
  ) => Promise<TransactionActionResult>;
  transactions: Transaction[];
}

export function TransactionsPage({
  accounts,
  categories,
  loadStatus,
  onCreate,
  onDelete,
  onUpdate,
  transactions,
}: TransactionsPageProps) {
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const [actionError, setActionError] = useState<string>();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState<string>();
  const [editingTransactionId, setEditingTransactionId] = useState<string>();
  const [formErrors, setFormErrors] = useState<TransactionValidationErrors>({});
  const [formValues, setFormValues] = useState(() =>
    emptyTransactionFormValues({ accountId: accounts[0]?.id ?? "" }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.name.localeCompare(right.name)),
    [categories],
  );

  const visibleTransactions = useMemo(
    () =>
      filterAndSortTransactions({
        categoryFilter,
        categoryNames,
        dateFilter,
        searchText,
        sortMode,
        transactions,
      }),
    [categoryFilter, categoryNames, dateFilter, searchText, sortMode, transactions],
  );

  const editingTransaction = transactions.find(
    (transaction) => transaction.id === editingTransactionId,
  );

  function updateFormValue(
    field: keyof TransactionFormValues,
    value: string,
  ): void {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  function beginCreate(): void {
    setActionError(undefined);
    setDeleteCandidateId(undefined);
    setEditingTransactionId(undefined);
    setFormErrors({});
    setFormValues(emptyTransactionFormValues({ accountId: accounts[0]?.id ?? "" }));
  }

  function beginEdit(transaction: Transaction): void {
    setActionError(undefined);
    setDeleteCandidateId(undefined);
    setEditingTransactionId(transaction.id);
    setFormErrors({});
    setFormValues(transactionToFormValues(transaction));
  }

  async function submitTransaction(): Promise<void> {
    setActionError(undefined);
    setIsSubmitting(true);

    const input = formValuesToTransactionInput(formValues);
    const result = editingTransactionId
      ? await onUpdate(editingTransactionId, input)
      : await onCreate(input);

    setIsSubmitting(false);

    if (result.ok) {
      beginCreate();
      return;
    }

    setFormErrors(result.errors ?? {});
    setActionError(result.errorMessage);
  }

  async function confirmDelete(transactionId: string): Promise<void> {
    setActionError(undefined);
    setIsSubmitting(true);

    const result = await onDelete(transactionId);

    setIsSubmitting(false);

    if (result.ok) {
      if (editingTransactionId === transactionId) {
        beginCreate();
      }
      setDeleteCandidateId(undefined);
      return;
    }

    setActionError(result.errorMessage ?? "Transaction could not be deleted.");
  }

  return (
    <div className="page-stack">
      {loadStatus === "loading" && (
        <div className="status-banner" role="status">
          Loading local transactions...
        </div>
      )}
      {actionError && (
        <div className="status-banner" role="status">
          {actionError}
        </div>
      )}

      <section className="form-panel" aria-label="Transaction form">
        <div className="section-heading">
          <h2>{editingTransaction ? "Edit transaction" : "Add transaction"}</h2>
          {editingTransaction && (
            <button className="icon-button" onClick={beginCreate} title="Cancel edit" type="button">
              <X aria-hidden="true" size={18} />
            </button>
          )}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Date</span>
            <input
              value={formValues.date}
              onChange={(event) => updateFormValue("date", event.target.value)}
              type="date"
            />
            {formErrors.date && <em>{formErrors.date}</em>}
          </label>

          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => updateFormValue("amount", event.target.value)}
              placeholder="0.00"
              type="number"
              value={formValues.amount}
            />
            {formErrors.amount && <em>{formErrors.amount}</em>}
          </label>

          <label className="field">
            <span>Currency</span>
            <input
              maxLength={3}
              onChange={(event) =>
                updateFormValue("currency", event.target.value.toUpperCase())
              }
              value={formValues.currency}
            />
            {formErrors.currency && <em>{formErrors.currency}</em>}
          </label>

          <label className="field">
            <span>Merchant</span>
            <input
              onChange={(event) => updateFormValue("merchant", event.target.value)}
              placeholder="Store, service, person"
              value={formValues.merchant}
            />
            {formErrors.merchant && <em>{formErrors.merchant}</em>}
          </label>

          <label className="field">
            <span>Account</span>
            <select
              aria-label="Account"
              onChange={(event) => updateFormValue("accountId", event.target.value)}
              value={formValues.accountId}
            >
              <option value="">Choose account</option>
              {accounts.map((account) => (
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
              aria-label="Category"
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

          <label className="field field-wide">
            <span>Note</span>
            <input
              onChange={(event) =>
                updateFormValue("description", event.target.value)
              }
              placeholder="Optional note"
              value={formValues.description}
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
            onClick={() => void submitTransaction()}
            type="button"
          >
            {editingTransaction ? "Save changes" : "Add transaction"}
          </button>
          {editingTransaction && (
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={beginCreate}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <div className="toolbar transaction-filters">
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          <input
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Merchant, note, tag"
            type="search"
            value={searchText}
          />
        </label>
        <input
          aria-label="Filter by date"
          className="filter-control"
          onChange={(event) => setDateFilter(event.target.value)}
          type="date"
          value={dateFilter}
        />
        <select
          aria-label="Filter by category"
          className="filter-control"
          onChange={(event) => setCategoryFilter(event.target.value)}
          value={categoryFilter}
        >
          <option value="">All categories</option>
          {sortedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort transactions"
          className="filter-control"
          onChange={(event) => setSortMode(event.target.value)}
          value={sortMode}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="amount-desc">Amount high</option>
          <option value="amount-asc">Amount low</option>
        </select>
      </div>

      <PageSection title="Manual transactions">
        {visibleTransactions.length === 0 ? (
          <div className="empty-state">No transactions match the current filters.</div>
        ) : (
          <div className="item-list">
            {visibleTransactions.map((transaction) => (
              <article className="list-row transaction-row" key={transaction.id}>
                <div>
                  <strong>{transaction.merchant}</strong>
                  <span>
                    {transaction.date} ·{" "}
                    {categoryNames.get(transaction.categoryId ?? "") ??
                      "Uncategorized"}{" "}
                    · {transaction.source}
                  </span>
                  {transaction.description && (
                    <small>{transaction.description}</small>
                  )}
                </div>
                <b>{currency.format(transaction.amount)}</b>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    onClick={() => beginEdit(transaction)}
                    title="Edit transaction"
                    type="button"
                  >
                    <Edit3 aria-hidden="true" size={17} />
                  </button>
                  {deleteCandidateId === transaction.id ? (
                    <>
                      <button
                        className="danger-button"
                        disabled={isSubmitting}
                        onClick={() => void confirmDelete(transaction.id)}
                        type="button"
                      >
                        Confirm
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
                      className="icon-button"
                      onClick={() => setDeleteCandidateId(transaction.id)}
                      title="Delete transaction"
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

interface FilterAndSortInput {
  categoryFilter: string;
  categoryNames: Map<string, string>;
  dateFilter: string;
  searchText: string;
  sortMode: string;
  transactions: Transaction[];
}

function filterAndSortTransactions({
  categoryFilter,
  categoryNames,
  dateFilter,
  searchText,
  sortMode,
  transactions,
}: FilterAndSortInput): Transaction[] {
  const normalizedSearch = searchText.trim().toLowerCase();

  return transactions
    .filter((transaction) => {
      if (dateFilter && transaction.date !== dateFilter) {
        return false;
      }

      if (categoryFilter && transaction.categoryId !== categoryFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        transaction.merchant,
        transaction.description ?? "",
        transaction.source,
        categoryNames.get(transaction.categoryId ?? "") ?? "",
        transaction.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      if (sortMode === "oldest") {
        return left.date.localeCompare(right.date);
      }

      if (sortMode === "amount-desc") {
        return right.amount - left.amount;
      }

      if (sortMode === "amount-asc") {
        return left.amount - right.amount;
      }

      return right.date.localeCompare(left.date);
    });
}
