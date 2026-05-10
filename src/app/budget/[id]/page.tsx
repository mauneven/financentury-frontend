"use client";

import { useParams } from "next/navigation";

import { BudgetDashboard } from "@/components/dashboard/budget-dashboard";
import { useBudgetSummary } from "@/hooks/use-budget-queries";

/**
 * Budget root page — always renders the dashboard.
 *
 * Category detail lives at /budget/[id]/category/[categoryId] now,
 * so we no longer sniff `?sub=<id>` here.
 */
export default function BudgetDashboardPage() {
  const params = useParams<{ id: string }>();
  const { data: summary, isPending } = useBudgetSummary(params.id);

  if (!summary && isPending) {
    return null; // Layout is showing the skeleton.
  }

  return <BudgetDashboard budgetId={params.id} />;
}
