"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { AppShell } from "@/components/layout/app-shell";
import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { BudgetCard } from "@/components/budget/budget-card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations("home");
  const { budgets, fetchBudgets, loading } = useBudgetStore();
  const [showCreateBudget, setShowCreateBudget] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return (
    <AuthGuard>
      <AppShell
        onAddExpense={() => {
          // If we have budgets, go to the first one then open expense dialog
          if (budgets.length > 0) {
            router.push(`/budget/${budgets[0].id}`);
          }
        }}
        onAddBudget={() => setShowCreateBudget(true)}
      >
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="size-10 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("loadingBudgets")}
              </p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex max-w-md flex-col items-center gap-8 text-center">
              <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
                <Wallet className="size-10 text-muted-foreground" />
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
                <Plus className="size-5" />
                {t("createFirst")}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {t("yourBudgets")}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {budgets.length === 1
                      ? t("budgetCount", { count: budgets.length })
                      : t("budgetCountPlural", { count: budgets.length })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateBudget(true)}
                  className="gap-1.5 h-10 min-w-[44px]"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">{t("newBudget")}</span>
                </Button>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                {budgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onClick={() => router.push(`/budget/${budget.id}`)}
                  />
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
