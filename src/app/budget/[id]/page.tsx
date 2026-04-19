"use client";

import { useParams } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetDashboard } from "@/components/dashboard/budget-dashboard";

/**
 * Budget root page — always renders the dashboard.
 *
 * Category detail lives at /budget/[id]/category/[categoryId] now,
 * so we no longer sniff `?sub=<id>` here.
 */
export default function BudgetDashboardPage() {
  const params = useParams<{ id: string }>();
  const summary = useBudgetStore((s) => s.summary);
  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  if (!summary && summaryLoading) {
    return null; // Layout is showing the skeleton.
  }

  return <BudgetDashboard budgetId={params.id} />;
}
