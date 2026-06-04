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
