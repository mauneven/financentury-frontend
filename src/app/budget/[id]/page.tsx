"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetDashboard } from "@/components/dashboard/budget-dashboard";
import { CategoryDetail } from "@/components/expenses/category-detail";

export default function BudgetDashboardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("sub");
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);

  if (categoryId && summary) {
    // Find the category in summary
    for (const sec of summary.sections) {
      const catSummary = sec.categories.find(
        (s) => s.category.id === categoryId
      );
      if (catSummary) {
        const allSections = summary.sections.map((c) => ({
          ...c.section,
          categories: c.categories.map((s) => s.category),
        }));

        return (
          <CategoryDetail
            categorySummary={catSummary}
            expenses={expenses}
            currency={summary.budget.currency}
            budgetId={params.id}
            categories={allSections}
            sectionId={sec.section.id}
          />
        );
      }
    }
  }

  return <BudgetDashboard budgetId={params.id} />;
}
