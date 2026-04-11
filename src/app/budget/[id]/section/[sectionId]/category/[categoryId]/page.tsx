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
  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  const result = (() => {
    if (!summary) return null;
    for (const sec of summary.sections) {
      if (sec.section.id === params.sectionId) {
        const catSummary = sec.categories.find(
          (c) => c.category.id === params.categoryId
        );
        if (catSummary) {
          const allSections = summary.sections.map((s) => ({
            ...s.section,
            categories: s.categories.map((c) => c.category),
          }));
          return { catSummary, allSections };
        }
      }
    }
    return undefined; // not found (distinct from null = no summary yet)
  })();

  useEffect(() => {
    // Only redirect if summary loaded but category not found (not during loading)
    if (result === undefined && !summaryLoading) {
      router.back();
    }
  }, [result, summaryLoading, router]);

  if (!result) {
    // Let parent layout show skeleton during loading
    if (summaryLoading) {
      return null;
    }
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <CategoryDetail
      categorySummary={result.catSummary}
      expenses={expenses}
      currency={summary!.budget.currency}
      budgetId={params.id}
      categories={result.allSections}
      sectionId={params.sectionId}
    />
  );
}
