import { Plus } from "lucide-react";
import { PageSection } from "../components/PageSection";
import { currency } from "../domain/financeViews";
import { type RecurringExpense } from "../domain/models";

interface RecurringPageProps {
  recurringExpenses: RecurringExpense[];
}

export function RecurringPage({ recurringExpenses }: RecurringPageProps) {
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
              <b>{currency.format(expense.amount)}</b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
