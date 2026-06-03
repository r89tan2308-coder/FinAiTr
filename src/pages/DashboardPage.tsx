import { Plus } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { PageSection } from "../components/PageSection";
import { ProgressBar } from "../components/ProgressBar";
import { currency, type FinanceOverview } from "../domain/financeViews";

interface DashboardPageProps {
  overview: FinanceOverview;
}

export function DashboardPage({ overview }: DashboardPageProps) {
  const maxCategory = Math.max(
    ...overview.categorySpend.map((item) => item.amount),
    1,
  );

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <MetricTile
          detail={overview.monthKey}
          title="This month"
          value={currency.format(overview.monthlySpend)}
        />
        <MetricTile
          accent="amber"
          detail="Active subscriptions"
          title="Recurring"
          value={currency.format(overview.recurringMonthlyTotal)}
        />
        <MetricTile
          accent="blue"
          detail="Receipt drafts"
          title="Pending review"
          value={String(overview.pendingReceiptCount)}
        />
      </div>

      <PageSection
        action={
          <button className="icon-text-button" type="button">
            <Plus aria-hidden="true" size={18} />
            Add
          </button>
        }
        title="Spend by category"
      >
        <div className="bar-list">
          {overview.categorySpend.map((category) => (
            <ProgressBar
              color={category.color}
              key={category.id}
              label={category.name}
              percent={Math.round((category.amount / maxCategory) * 100)}
              value={currency.format(category.amount)}
            />
          ))}
        </div>
      </PageSection>

      <PageSection title="Top products">
        <div className="item-list">
          {overview.topProducts.slice(0, 4).map((product) => (
            <article className="list-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.tag}</span>
              </div>
              <b>{currency.format(product.amount)}</b>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection title="Recent transactions">
        <div className="item-list">
          {overview.recentTransactions.slice(0, 3).map((transaction) => (
            <article className="list-row" key={transaction.id}>
              <div>
                <strong>{transaction.merchant}</strong>
                <span>
                  {transaction.date} · {transaction.source}
                </span>
              </div>
              <b>{currency.format(transaction.amount)}</b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
