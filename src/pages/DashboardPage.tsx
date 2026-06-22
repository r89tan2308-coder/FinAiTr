import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  filterReceiptItemAnalytics,
} from "../domain/financeViews";
import { type Category, type CurrencySettings } from "../domain/models";

interface DashboardPageProps {
  categories: Category[];
  currencySettings: CurrencySettings;
  overview: FinanceOverview;
}

export function DashboardPage({
  categories,
  currencySettings,
  overview,
}: DashboardPageProps) {
  const [itemAnalyticsPeriod, setItemAnalyticsPeriod] =
    useState<ItemAnalyticsPeriod>("current_month");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const displayCurrency = overview.displayCurrency;
  const maxCategory = Math.max(
    ...overview.categorySpend.map((item) => item.amount),
    1,
  );
  const baseItemAnalytics = overview.itemAnalytics[itemAnalyticsPeriod];
  const categoryOptions = categories.filter(
    (category) => category.type === "expense",
  );
  const itemAnalytics = useMemo(
    () =>
      filterReceiptItemAnalytics(baseItemAnalytics, {
        categoryId: itemCategoryId || undefined,
        searchQuery: itemSearchQuery,
      }),
    [baseItemAnalytics, itemCategoryId, itemSearchQuery],
  );
  const selectedItem =
    itemAnalytics.topItems.find((item) => item.id === selectedItemId) ??
    itemAnalytics.topItems[0];
  const selectedItemDetails = selectedItem
    ? itemAnalytics.details.filter((detail) => detail.itemId === selectedItem.id)
    : [];
  const hasItemFilters = itemSearchQuery.trim().length > 0 || itemCategoryId;
  const itemEmptyMessage = getItemAnalyticsEmptyMessage({
    baseItemCount: baseItemAnalytics.itemCount,
    categoryId: itemCategoryId,
    itemCount: itemAnalytics.itemCount,
    searchQuery: itemSearchQuery,
  });
  const monthlyTrend = overview.monthlyTrend;
  const trendMonthCount = monthlyTrend.months.length;

  function handlePeriodChange(period: ItemAnalyticsPeriod) {
    setItemAnalyticsPeriod(period);
    setSelectedItemId(undefined);
  }

  function clearItemFilters() {
    setItemSearchQuery("");
    setItemCategoryId("");
    setSelectedItemId(undefined);
  }

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
        action={<span className="section-kicker">Transactions only</span>}
        title="Monthly trend"
      >
        {monthlyTrend.hasTransactions ? (
          <div className="monthly-trend-panel">
            <div className="analytics-summary-grid trend-summary-grid">
              <div className="analytics-summary-item">
                <span>{trendMonthCount}-month spend</span>
                <strong>
                  {formatCurrencyAmount(monthlyTrend.totalSpend, displayCurrency)}
                </strong>
              </div>
              <div className="analytics-summary-item">
                <span>Average spend</span>
                <strong>
                  {formatCurrencyAmount(
                    monthlyTrend.averageSpend,
                    displayCurrency,
                  )}
                </strong>
              </div>
              {monthlyTrend.hasIncome && (
                <div className="analytics-summary-item" data-tone="income">
                  <span>{trendMonthCount}-month income</span>
                  <strong>
                    {formatCurrencyAmount(
                      monthlyTrend.totalIncome,
                      displayCurrency,
                    )}
                  </strong>
                </div>
              )}
            </div>
            <div className="trend-list">
              {monthlyTrend.months.map((month) => (
                <article className="trend-row" key={month.monthKey}>
                  <div className="trend-row-heading">
                    <div>
                      <strong>{month.label}</strong>
                      <span>
                        {month.transactionCount} transaction
                        {month.transactionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <b>
                      {formatCurrencyAmount(month.spendAmount, displayCurrency)}
                    </b>
                  </div>
                  <div className="trend-bars" aria-label={`${month.label} trend`}>
                    <div className="trend-bar-line">
                      <span>Spend</span>
                      <div className="trend-track">
                        <div
                          className="trend-fill trend-fill-spend"
                          style={{
                            width: `${getTrendPercent(
                              month.spendAmount,
                              monthlyTrend.maxSpendAmount,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    {monthlyTrend.hasIncome && (
                      <div className="trend-bar-line">
                        <span>Income</span>
                        <div className="trend-track">
                          <div
                            className="trend-fill trend-fill-income"
                            style={{
                              width: `${getTrendPercent(
                                month.incomeAmount,
                                monthlyTrend.maxIncomeAmount,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="trend-row-meta">
                    {month.topCategory ? (
                      <span>
                        Top category: {month.topCategory.name} ·{" "}
                        {formatCurrencyAmount(
                          month.topCategory.amount,
                          displayCurrency,
                        )}
                      </span>
                    ) : (
                      <span>No spending category this month.</span>
                    )}
                    {monthlyTrend.hasIncome && (
                      <span>
                        Net {formatCurrencyAmount(month.netAmount, displayCurrency)}
                      </span>
                    )}
                  </div>
                  {month.categoryBreakdown.length > 0 && (
                    <div
                      aria-label={`${month.label} category breakdown`}
                      className="trend-category-breakdown"
                    >
                      {month.categoryBreakdown.slice(0, 3).map((category) => (
                        <span key={category.id}>
                          <i
                            aria-hidden="true"
                            style={{ backgroundColor: category.color }}
                          />
                          <b>{category.name}</b>
                          {formatCurrencyAmount(category.amount, displayCurrency)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">No transaction trend data yet.</div>
        )}
      </PageSection>

      <PageSection
        action={
          <button className="icon-text-button" type="button">
            <Plus aria-hidden="true" size={18} />
            Add
          </button>
        }
        title="Spend by category"
      >
        {overview.categorySpend.length > 0 ? (
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
        ) : (
          <div className="empty-state">No category spending this month.</div>
        )}
      </PageSection>

      <PageSection
        action={
          <div aria-label="Item analytics period" className="segmented-control">
            <button
              aria-pressed={itemAnalyticsPeriod === "current_month"}
              onClick={() => handlePeriodChange("current_month")}
              type="button"
            >
              This month
            </button>
            <button
              aria-pressed={itemAnalyticsPeriod === "all_time"}
              onClick={() => handlePeriodChange("all_time")}
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
          <div className="analytics-filter-grid">
            <label className="search-field analytics-search-field">
              <Search aria-hidden="true" size={18} />
              <span className="sr-only">Search items</span>
              <input
                aria-label="Search items"
                onChange={(event) => {
                  setItemSearchQuery(event.target.value);
                  setSelectedItemId(undefined);
                }}
                placeholder="Search item names"
                type="search"
                value={itemSearchQuery}
              />
            </label>
            <select
              aria-label="Item category"
              className="filter-control"
              onChange={(event) => {
                setItemCategoryId(event.target.value);
                setSelectedItemId(undefined);
              }}
              value={itemCategoryId}
            >
              <option value="">All item categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              className="secondary-button analytics-clear-button"
              disabled={!hasItemFilters}
              onClick={clearItemFilters}
              type="button"
            >
              <X aria-hidden="true" size={16} />
              Clear
            </button>
          </div>
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

          {itemEmptyMessage ? (
            <div className="empty-state">{itemEmptyMessage}</div>
          ) : (
            <div className="analytics-workspace">
              <div className="analytics-grid">
                <div className="analytics-column">
                  <h3>Top items</h3>
                  <div className="item-list">
                    {itemAnalytics.topItems.slice(0, 5).map((item) => (
                      <button
                        aria-pressed={selectedItem?.id === item.id}
                        className="list-row analytics-row analytics-item-button"
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        type="button"
                      >
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.categoryName} · {item.itemCount} item
                            {item.itemCount === 1 ? "" : "s"} · avg{" "}
                            {formatCurrencyAmount(
                              item.averageItemPrice,
                              displayCurrency,
                            )}
                          </small>
                        </span>
                        <b>
                          {formatCurrencyAmount(item.totalAmount, displayCurrency)}
                        </b>
                      </button>
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

              <div className="analytics-detail-panel">
                <div>
                  <h3>{selectedItem?.name ?? "Item detail"}</h3>
                  {selectedItem && (
                    <p>
                      {selectedItem.itemCount} confirmed receipt item
                      {selectedItem.itemCount === 1 ? "" : "s"} contributing{" "}
                      {formatCurrencyAmount(
                        selectedItem.totalAmount,
                        displayCurrency,
                      )}
                      .
                    </p>
                  )}
                </div>
                <div className="item-list">
                  {selectedItemDetails.map((detail) => (
                    <article className="list-row analytics-row" key={detail.id}>
                      <div>
                        <strong>{detail.rawName}</strong>
                        <span>
                          {detail.receiptDate ?? "No date"} ·{" "}
                          {detail.merchant ?? "Unknown merchant"} ·{" "}
                          {detail.categoryName}
                        </span>
                        {detail.normalizedName !== detail.rawName && (
                          <span>Normalized: {detail.normalizedName}</span>
                        )}
                      </div>
                      <b>
                        {formatCurrencyAmount(
                          detail.originalAmount,
                          detail.originalCurrency,
                        )}{" "}
                        original ·{" "}
                        {formatCurrencyAmount(
                          detail.displayAmount,
                          displayCurrency,
                        )}{" "}
                        display
                      </b>
                    </article>
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

function getTrendPercent(amount: number, maxAmount: number): number {
  if (maxAmount <= 0 || amount <= 0) {
    return 0;
  }

  return Math.max(4, Math.round((amount / maxAmount) * 100));
}

function getItemAnalyticsEmptyMessage({
  baseItemCount,
  categoryId,
  itemCount,
  searchQuery,
}: {
  baseItemCount: number;
  categoryId: string;
  itemCount: number;
  searchQuery: string;
}): string | undefined {
  if (baseItemCount === 0) {
    return "No confirmed receipts with items for this period.";
  }

  if (itemCount > 0) {
    return undefined;
  }

  if (searchQuery.trim()) {
    return "No item analytics match this search.";
  }

  if (categoryId) {
    return "No confirmed receipt items match this category for this period.";
  }

  return "No confirmed receipt items match these filters.";
}
