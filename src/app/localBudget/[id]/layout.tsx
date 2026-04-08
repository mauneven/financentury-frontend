"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { AppShell } from "@/components/layout/app-shell";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function LocalBudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const budgets = useBudgetStore((s) => s.budgets);
  const summary = useBudgetStore((s) => s.summary);
  const authLoading = useAuthStore((s) => s.loading);

  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    if (!authLoading && budgets.length === 0) {
      fetchBudgets();
    }
  }, [budgets.length, fetchBudgets, authLoading]);

  useEffect(() => {
    if (!authLoading && params.id) {
      setActiveBudget(params.id);
    }
  }, [params.id, setActiveBudget, authLoading]);

  const categories = useMemo(
    () => summary?.sections.map((c) => ({
      ...c.section,
      categories: c.categories.map((s) => s.category),
    })) ?? [],
    [summary]
  );

  return (
    <AuthGuard>
      <AppShell
        onAddExpense={() => setShowAddExpense(true)}
        onAddBudget={() => setShowCreateBudget(true)}
        onSelectSubcategory={(budgetId, subcategoryId) => {
          router.push(`/localBudget/${budgetId}?sub=${subcategoryId}`);
        }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
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
