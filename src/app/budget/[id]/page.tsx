"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetDashboard } from "@/components/dashboard/budget-dashboard";
import { CategoryDetail } from "@/components/expenses/category-detail";

export default function BudgetDashboardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const subcategoryId = searchParams.get("sub");
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);

  if (subcategoryId && summary) {
    // Find the subcategory in summary
    for (const cat of summary.sections) {
      const subSummary = cat.categories.find(
        (s) => s.category.id === subcategoryId
      );
      if (subSummary) {
        const allCategories = summary.sections.map((c) => ({
          ...c.section,
          categories: c.categories.map((s) => s.category),
        }));

        return (
          <CategoryDetail
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

  return <BudgetDashboard budgetId={params.id} />;
}
