"use client";

import { useParams } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { CategoryDetail } from "@/components/expenses/category-detail";
import { useRouter } from "next/navigation";

export default function CategoryPage() {
  const params = useParams<{ id: string; sectionId: string; categoryId: string }>();
  const router = useRouter();
  const { summary, expenses } = useBudgetStore();

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  // Find the category summary
  for (const sec of summary.categories) {
    if (sec.category.id === params.sectionId) {
      const catSummary = sec.categories.find(
        (c) => c.category.id === params.categoryId
      );
      if (catSummary) {
        const allSections = summary.categories.map((s) => ({
          ...s.category,
          categories: s.categories.map((c) => c.category),
        }));

        return (
          <CategoryDetail
            subcategorySummary={catSummary}
            expenses={expenses}
            currency={summary.budget.currency}
            budgetId={params.id}
            categories={allSections}
          />
        );
      }
    }
  }

  // Category not found -- go back
  router.back();
  return null;
}
