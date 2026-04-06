"use client";

import { useParams } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetSettings } from "@/components/budget/budget-settings";

export default function BudgetSettingsPage() {
  const params = useParams<{ id: string }>();
  const { summary } = useBudgetStore();

  if (!summary) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-12">
      <BudgetSettings budget={summary.budget} />
    </div>
  );
}
