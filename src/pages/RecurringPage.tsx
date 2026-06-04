import { Plus } from "lucide-react";
import { PageSection } from "../components/PageSection";
import { formatDisplayMoney } from "../domain/currencySettings";
import { type CurrencySettings, type RecurringExpense } from "../domain/models";

interface RecurringPageProps {
  currencySettings: CurrencySettings;
  recurringExpenses: RecurringExpense[];
}

export function RecurringPage({
  currencySettings,
  recurringExpenses,
}: RecurringPageProps) {
  return (
    <div className="page-stack">
      <div className="toolbar">
        <button className="primary-button" type="button">
          <Plus aria-hidden="true" size={18} />
          Add
        </button>
      </div>

      <PageSection title="Subscriptions">
        <div className="item-list">
          {recurringExpenses.map((expense) => (
            <article className="list-row" key={expense.id}>
              <div>
                <strong>{expense.name}</strong>
                <span>
                  {expense.nextDueDate} · {expense.frequency} · {expense.status}
                </span>
              </div>
              <b>
                {formatDisplayMoney(
                  expense.amount,
                  expense.currency,
                  currencySettings,
                )}
              </b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
