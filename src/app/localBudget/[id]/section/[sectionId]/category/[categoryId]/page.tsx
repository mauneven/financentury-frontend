"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { CategoryDetail } from "@/components/expenses/category-detail";

export default function CategoryPage() {
  const params = useParams<{ id: string; sectionId: string; categoryId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);

  const result = (() => {
    if (!summary) return null;
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
          return { catSummary, allSections };
        }
      }
    }
    return undefined; // not found (distinct from null = no summary yet)
  })();

  useEffect(() => {
    if (result === undefined) {
      router.back();
    }
  }, [result, router]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <CategoryDetail
      subcategorySummary={result.catSummary}
      expenses={expenses}
      currency={summary!.budget.currency}
      budgetId={params.id}
      categories={result.allSections}
    />
  );
}
