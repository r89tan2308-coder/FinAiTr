import { PageSection } from "../components/PageSection";
import { currency, type CategorySpend } from "../domain/financeViews";
import { type Category } from "../domain/models";

interface CategoriesPageProps {
  categories: Category[];
  categorySpend: CategorySpend[];
}

export function CategoriesPage({
  categories,
  categorySpend,
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
              <b>{currency.format(spendByCategoryId.get(category.id) ?? 0)}</b>
            </article>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
