"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Plus, Wallet } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { BudgetCard } from "@/components/budget/budget-card";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useBudgets } from "@/hooks/use-budget-queries";
import { useDisplayOrder } from "@/hooks/use-display-order";
import { useFlipList } from "@/hooks/use-flip-list";
import { useTranslations } from "@/i18n/client";
import { useAuthStore } from "@/store/auth-store";

const ICON_STROKE = 1.8;

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const authLoading = useAuthStore((s) => s.loading);
  const authInitialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const authReady = authInitialized && !authLoading && !!user;

  // Server state owned by react-query. `enabled: authReady` suppresses the
  // network call until the auth bootstrap settles — without this we'd fire
  // an unauthenticated /budgets request on first render and 401.
  const {
    data: budgets = [],
    isPending: loading,
    error: queryError,
    refetch,
  } = useBudgets({ enabled: authReady });

  const error = queryError instanceof Error ? queryError.message : null;
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const { ordered: orderedBudgets, moveUp, moveDown } = useDisplayOrder(
    "budgets",
    budgets,
    (b) => b.id
  );

  const { ref: budgetListRef, capturePositions: captureBudgetPositions } = useFlipList();

  return (
    <AuthGuard>
      <AppShell
        onAddExpense={() => {
          if (budgets.length > 0) {
            router.push(`/budget/${budgets[0].id}`);
          }
        }}
        onAddBudget={() => setShowCreateBudget(true)}
      >
        <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="size-10 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("loadingBudgets")}
              </p>
            </div>
          ) : error && budgets.length === 0 ? (
            <div className="flex max-w-md flex-col items-center gap-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                <Wallet className="size-8 text-red-500" strokeWidth={ICON_STROKE} />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {t("errorLoading")}
                </h1>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2"
              >
                <Plus className="size-4" strokeWidth={ICON_STROKE} />
                {tc("retry")}
              </Button>
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex max-w-md flex-col items-center gap-8 text-center">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
                <Wallet className="size-10 text-muted-foreground" strokeWidth={ICON_STROKE} />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  {t("welcome")}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t("welcomeDescription")}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setShowCreateBudget(true)}
                className="gap-2 h-12 px-8 text-base"
              >
                <Plus className="size-5" strokeWidth={ICON_STROKE} />
                {t("createFirst")}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {t("yourBudgets")}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {budgets.length} / 7 {t("budgetCountLabel")}
                  </p>
                </div>
                {budgets.length < 7 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateBudget(true)}
                    className="gap-1.5 h-10 min-w-[44px]"
                  >
                    <Plus className="size-4" strokeWidth={ICON_STROKE} />
                    <span className="hidden sm:inline">{t("newBudget")}</span>
                  </Button>
                )}
              </div>

              <div ref={budgetListRef} className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {orderedBudgets.map((budget, idx) => (
                  <div key={budget.id} data-flip-key={budget.id}>
                    <BudgetCard
                      budget={budget}
                      onClick={() => router.push(`/budget/${budget.id}`)}
                      onMoveUp={orderedBudgets.length > 1 && idx > 0 ? () => { captureBudgetPositions(); moveUp(budget.id); } : undefined}
                      onMoveDown={orderedBudgets.length > 1 && idx < orderedBudgets.length - 1 ? () => { captureBudgetPositions(); moveDown(budget.id); } : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AppShell>

      <CreateBudgetDialog
        open={showCreateBudget}
        onOpenChange={setShowCreateBudget}
      />
    </AuthGuard>
  );
}
