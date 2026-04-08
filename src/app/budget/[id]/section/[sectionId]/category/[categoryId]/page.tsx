"use client";

import { useParams } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { SubcategoryDetail } from "@/components/expenses/subcategory-detail";
import { useRouter } from "next/navigation";

export default function SubcategoryPage() {
  const params = useParams<{ id: string; categoryId: string; subcategoryId: string }>();
  const router = useRouter();
  const { summary, expenses } = useBudgetStore();

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  // Find the subcategory summary
  for (const cat of summary.categories) {
    if (cat.category.id === params.categoryId) {
      const subSummary = cat.subcategories.find(
        (s) => s.subcategory.id === params.subcategoryId
      );
      if (subSummary) {
        const allCategories = summary.categories.map((c) => ({
          ...c.category,
          subcategories: c.subcategories.map((s) => s.subcategory),
        }));

        return (
          <SubcategoryDetail
            subcategorySummary={subSummary}
            expenses={expenses}
            currency={summary.budget.currency}
            budgetId={params.id}
            categories={allCategories}
          />
        );
      }
    }
  }

  // Subcategory not found — go back
  router.back();
  return null;
}
