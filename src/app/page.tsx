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
        <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("loadingBudgets")}
              </p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex max-w-md flex-col items-center gap-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <Wallet className="size-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {t("welcome")}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("welcomeDescription")}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setShowCreateBudget(true)}
                className="gap-2"
              >
                <Plus className="size-4" />
                {t("createFirst")}
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    {t("yourBudgets")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {budgets.length === 1
                      ? t("budgetCount", { count: budgets.length })
                      : t("budgetCountPlural", { count: budgets.length })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateBudget(true)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  {t("newBudget")}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
