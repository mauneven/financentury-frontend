"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetDashboard } from "@/components/dashboard/budget-dashboard";
import { SubcategoryDetail } from "@/components/expenses/subcategory-detail";

export default function BudgetDashboardPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const subcategoryId = searchParams.get("sub");
  const { summary, expenses } = useBudgetStore();

  if (subcategoryId && summary) {
    // Find the subcategory in summary
    for (const cat of summary.categories) {
      const subSummary = cat.subcategories.find(
        (s) => s.subcategory.id === subcategoryId
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

  return <BudgetDashboard budgetId={params.id} />;
}
