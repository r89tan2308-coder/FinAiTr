import { PageSection } from "../components/PageSection";
import { formatCurrencyAmount } from "../domain/currencySettings";
import { type CategorySpend } from "../domain/financeViews";
import { type Category, type SupportedCurrencyCode } from "../domain/models";

interface CategoriesPageProps {
  categories: Category[];
  categorySpend: CategorySpend[];
  displayCurrency: SupportedCurrencyCode;
}

export function CategoriesPage({
  categories,
  categorySpend,
  displayCurrency,
}: CategoriesPageProps) {
  const spendByCategoryId = new Map(
    categorySpend.map((item) => [item.id, item.amount]),
  );

  return (
    <div className="page-stack">
      <PageSection title="Expense categories">
        <p className="settings-note">
          Category totals use this month's local transactions in the selected
          display currency. Receipt item categories are shown separately in
          Dashboard item analytics.
        </p>
        {categories.length === 0 ? (
          <div className="empty-state">
            No categories configured yet. Imported or manual transactions without a
            category remain uncategorized.
          </div>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <article className="category-card" key={category.id}>
                <span style={{ backgroundColor: category.color ?? "#64748b" }} />
                <strong>{category.name}</strong>
                <b>
                  {formatCurrencyAmount(
                    spendByCategoryId.get(category.id) ?? 0,
                    displayCurrency,
                  )}
                </b>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
