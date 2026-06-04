import { Plus } from "lucide-react";
import { useState } from "react";
import { MetricTile } from "../components/MetricTile";
import { PageSection } from "../components/PageSection";
import { ProgressBar } from "../components/ProgressBar";
import {
  formatCurrencyAmount,
  formatDisplayMoney,
} from "../domain/currencySettings";
import {
  type FinanceOverview,
  type ItemAnalyticsPeriod,
} from "../domain/financeViews";
import { type CurrencySettings } from "../domain/models";

interface DashboardPageProps {
  currencySettings: CurrencySettings;
  overview: FinanceOverview;
}

export function DashboardPage({
  currencySettings,
  overview,
}: DashboardPageProps) {
  const [itemAnalyticsPeriod, setItemAnalyticsPeriod] =
    useState<ItemAnalyticsPeriod>("current_month");
  const displayCurrency = overview.displayCurrency;
  const maxCategory = Math.max(
    ...overview.categorySpend.map((item) => item.amount),
    1,
  );
  const itemAnalytics = overview.itemAnalytics[itemAnalyticsPeriod];

  return (
    <div className="page-stack">
      <div className="metric-grid">
        <MetricTile
          detail={overview.monthKey}
          title="This month"
          value={formatCurrencyAmount(overview.monthlySpend, displayCurrency)}
        />
        <MetricTile
          accent="amber"
          detail="Active subscriptions"
          title="Recurring"
          value={formatCurrencyAmount(
            overview.recurringMonthlyTotal,
            displayCurrency,
          )}
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
              value={formatCurrencyAmount(category.amount, displayCurrency)}
            />
          ))}
        </div>
      </PageSection>

      <PageSection
        action={
          <div aria-label="Item analytics period" className="segmented-control">
            <button
              aria-pressed={itemAnalyticsPeriod === "current_month"}
              onClick={() => setItemAnalyticsPeriod("current_month")}
              type="button"
            >
              This month
            </button>
            <button
              aria-pressed={itemAnalyticsPeriod === "all_time"}
              onClick={() => setItemAnalyticsPeriod("all_time")}
              type="button"
            >
              All time
            </button>
          </div>
        }
        title="Item analytics"
      >
        <div className="item-analytics-panel">
          <p>
            Confirmed receipt item breakdown. This is detail for receipt-linked
            purchases, not extra spending.
          </p>
          <div className="analytics-summary-grid">
            <div className="analytics-summary-item">
              <span>Total</span>
              <strong>
                {formatCurrencyAmount(itemAnalytics.totalAmount, displayCurrency)}
              </strong>
            </div>
            <div className="analytics-summary-item">
              <span>Items</span>
              <strong>{String(itemAnalytics.itemCount)}</strong>
            </div>
            <div className="analytics-summary-item">
              <span>Average</span>
              <strong>
                {formatCurrencyAmount(
                  itemAnalytics.averageItemPrice,
                  displayCurrency,
                )}
              </strong>
            </div>
          </div>

          {itemAnalytics.itemCount === 0 ? (
            <div className="empty-state">
              No confirmed receipt items for this period.
            </div>
          ) : (
            <div className="analytics-grid">
              <div className="analytics-column">
                <h3>Top items</h3>
                <div className="item-list">
                  {itemAnalytics.topItems.slice(0, 5).map((item) => (
                    <article className="list-row analytics-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.categoryName} · {item.itemCount} item
                          {item.itemCount === 1 ? "" : "s"} · avg{" "}
                          {formatCurrencyAmount(
                            item.averageItemPrice,
                            displayCurrency,
                          )}
                        </span>
                      </div>
                      <b>
                        {formatCurrencyAmount(item.totalAmount, displayCurrency)}
                      </b>
                    </article>
                  ))}
                </div>
              </div>

              <div className="analytics-column">
                <h3>Top item categories</h3>
                <div className="bar-list">
                  {itemAnalytics.topCategories.slice(0, 5).map((category) => (
                    <ProgressBar
                      color={category.color}
                      key={category.id}
                      label={`${category.name} · ${category.itemCount} item${
                        category.itemCount === 1 ? "" : "s"
                      }`}
                      percent={Math.round(
                        (category.totalAmount /
                          Math.max(itemAnalytics.totalAmount, 1)) *
                          100,
                      )}
                      value={`${formatCurrencyAmount(
                        category.totalAmount,
                        displayCurrency,
                      )} · avg ${formatCurrencyAmount(
                        category.averageItemPrice,
                        displayCurrency,
                      )}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
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
              <b>
                {formatDisplayMoney(
                  transaction.amount,
                  transaction.currency,
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
