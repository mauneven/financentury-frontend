"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { AppShell } from "@/components/layout/app-shell";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { setActiveBudget, fetchBudgets, budgets, summary } = useBudgetStore();

  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    if (budgets.length === 0) {
      fetchBudgets();
    }
  }, [budgets.length, fetchBudgets]);

  useEffect(() => {
    if (params.id) {
      setActiveBudget(params.id);
    }
  }, [params.id, setActiveBudget]);

  const categories = summary?.categories.map((c) => ({
    ...c.category,
    subcategories: c.subcategories.map((s) => s.subcategory),
  })) ?? [];

  return (
    <AuthGuard>
      <AppShell
        onAddExpense={() => setShowAddExpense(true)}
        onAddBudget={() => setShowCreateBudget(true)}
        onSelectSubcategory={(budgetId, subcategoryId) => {
          router.push(`/budget/${budgetId}?sub=${subcategoryId}`);
        }}
      >
        {children}
      </AppShell>

      <CreateBudgetDialog
        open={showCreateBudget}
        onOpenChange={setShowCreateBudget}
      />

      {summary && (
        <AddExpenseDialog
          open={showAddExpense}
          onOpenChange={setShowAddExpense}
          budgetId={params.id}
          categories={categories}
          currency={summary.budget.currency}
        />
      )}
    </AuthGuard>
  );
}
