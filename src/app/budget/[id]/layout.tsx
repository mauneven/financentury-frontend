"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RefreshCw } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useBudgetSummary } from "@/hooks/use-budget-queries";
import { useActiveBudgetStore } from "@/store/active-budget-store";
import { useAuthStore } from "@/store/auth-store";

const ICON_STROKE = 1.8;

/**
 * Skeleton shown while budget data is loading.
 * Prevents blank/empty page flash on direct URL navigation.
 */
function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg bg-card p-6">
            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-border rounded-lg bg-card p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-md bg-muted" />
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
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const authInitialized = useAuthStore((s) => s.initialized);
  const authReady = authInitialized && !authLoading && !!user;
  const setActiveBudgetId = useActiveBudgetStore((s) => s.setActiveBudgetId);

  // Tell the WS provider which budget is on screen so it can scope event
  // invalidations correctly. Cleared on unmount so global routes don't
  // accidentally pick up budget-scoped events.
  useEffect(() => {
    setActiveBudgetId(params.id);
    return () => setActiveBudgetId(null);
  }, [params.id, setActiveBudgetId]);

  // Server state via react-query. Gating on `authReady && params.id`
  // keeps unauthenticated/empty-id renders from firing requests.
  const {
    data: summary,
    isPending: summaryLoading,
    error: queryError,
    refetch: refetchSummary,
  } = useBudgetSummary(authReady ? params.id : undefined);
  const budgetError =
    queryError instanceof Error ? queryError.message : null;

  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Flat category list used by the global AddExpenseDialog.
  const categories = useMemo(
    () => summary?.categories.map((c) => c.category) ?? [],
    [summary]
  );

  // Determine what to render inside the shell
  const renderContent = () => {
    // Show error state with retry button if the budget fetch failed.
    if (budgetError && !summary && !summaryLoading) {
      return (
        <div className="border border-border rounded-lg bg-card">
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
              <RefreshCw className="h-6 w-6 text-red-500" strokeWidth={ICON_STROKE} />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              Failed to load budget
            </h3>
            <p className="mb-4 max-w-sm text-base text-muted-foreground">
              {budgetError}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => refetchSummary()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE} />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/budgets")}
              >
                Go to Budgets
              </Button>
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
