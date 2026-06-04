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
      </PageSection>
    </div>
  );
}
