"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { CategoryDetail } from "@/components/expenses/category-detail";

/**
 * Category detail page — replaces the old
 * /budget/[id]/section/[sectionId]/category/[categoryId]/page.tsx
 * and absorbs the per-section reports page. Categories are now flat,
 * so the URL drops the section segment.
 */
export default function CategoryPage() {
  const params = useParams<{ id: string; categoryId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);
  const linkedExpenses = useBudgetStore((s) => s.linkedExpenses);
  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  /**
   * Look up the category summary — search own list first, then linked.
   * When found in linked list, we return a flag so we can route expenses
   * back to the source budget via the linkedCategoryBudgetMap.
   */
  const result = (() => {
    if (!summary) return null;
    const own = summary.categories.find(
      (c) => c.category.id === params.categoryId
    );
    if (own) return { catSummary: own, linkedSourceBudgetId: null as string | null };
    const linked = summary.linked_categories?.find(
      (l) => l.category.category.id === params.categoryId
    );
    if (linked) {
      return {
        catSummary: linked.category,
        linkedSourceBudgetId: linked.link.source_budget_id,
      };
    }
    return undefined;
  })();

  // Flat list of all categories (own + linked) for the expense picker.
  const allCategories = useMemo(() => {
    if (!summary) return [];
    return [
      ...summary.categories.map((c) => c.category),
      ...(summary.linked_categories?.map((l) => l.category.category) ?? []),
    ];
  }, [summary]);

  const linkedCategoryBudgetMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of summary?.linked_categories ?? []) {
      m.set(l.category.category.id, l.link.source_budget_id);
    }
    return m;
  }, [summary]);

  useEffect(() => {
    // Only redirect if summary is loaded but category missing.
    if (result === undefined && !summaryLoading) {
      router.back();
    }
  }, [result, summaryLoading, router]);

  if (!result) {
    if (summaryLoading) {
      return null;
    }
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If this is a linked category, draw from linkedExpenses (which comes
  // from the source budget). Otherwise draw from own expenses.
  const relevantExpenses = result.linkedSourceBudgetId
    ? linkedExpenses
    : expenses;

  return (
    <CategoryDetail
      categorySummary={result.catSummary}
      expenses={relevantExpenses}
      currency={summary!.budget.currency}
      budgetId={params.id}
      categories={allCategories}
      linkedCategoryBudgetMap={linkedCategoryBudgetMap}
    />
  );
}
