"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { AppShell } from "@/components/layout/app-shell";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RefreshCw } from "lucide-react";

/**
 * Skeleton shown while budget data is loading.
 * Prevents blank/empty page flash on direct URL navigation.
 */
function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse bg-muted" />
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>
      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground bg-card p-6">
            <div className="h-4 w-20 animate-pulse bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-7 w-28 animate-pulse bg-muted" />
              <div className="h-3 w-20 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-2 border-foreground bg-card p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
        <div className="border-2 border-foreground bg-card p-6">
          <div className="h-4 w-28 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function BudgetLayout({
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
  const summaryLoading = useBudgetStore((s) => s.summaryLoading);
  const budgetError = useBudgetStore((s) => s.error);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const authInitialized = useAuthStore((s) => s.initialized);

  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Track which budget ID we last triggered a load for so we don't re-fetch
  // on every render, but DO re-fetch when the ID changes.
  const loadedBudgetRef = useRef<string | null>(null);

  // Wait for auth to be fully ready before making any API calls.
  const authReady = authInitialized && !authLoading && !!user;

  useEffect(() => {
    if (authReady && budgets.length === 0) {
      fetchBudgets();
    }
  }, [budgets.length, fetchBudgets, authReady]);

  useEffect(() => {
    if (authReady && params.id && loadedBudgetRef.current !== params.id) {
      loadedBudgetRef.current = params.id;
      setActiveBudget(params.id);
    }
  }, [params.id, setActiveBudget, authReady]);

  const categories = useMemo(
    () => summary?.sections.map((c) => ({
      ...c.section,
      categories: c.categories.map((s) => s.category),
    })) ?? [],
    [summary]
  );

  // Determine what to render inside the shell
  const renderContent = () => {
    // Show error state with retry button if the budget fetch failed.
    if (budgetError && !summary && !summaryLoading) {
      return (
        <div className="border-2 border-foreground bg-card">
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-red-500 bg-red-50 dark:bg-red-950/30">
              <RefreshCw className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              Failed to load budget
            </h3>
            <p className="mb-4 max-w-sm text-base text-muted-foreground">
              {budgetError}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  loadedBudgetRef.current = null;
                  setActiveBudget(params.id);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                type="button"
                onClick={() => router.push("/budgets")}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Go to Budgets
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading skeleton while budget data is being fetched.
    if (summaryLoading && !summary) {
      return <BudgetLoadingSkeleton />;
    }

    // Data ready -- render children (the page).
    return children;
  };

  return (
    <AuthGuard>
      <AppShell
        onAddExpense={() => setShowAddExpense(true)}
        onAddBudget={() => setShowCreateBudget(true)}
      >
        {renderContent()}
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
