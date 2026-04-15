"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { AppShell } from "@/components/layout/app-shell";

import { CreateBudgetDialog } from "@/components/budget/create-budget-dialog";
import { BudgetCard } from "@/components/budget/budget-card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useDisplayOrder } from "@/hooks/use-display-order";

export default function HomePage() {
  const router = useRouter();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const budgets = useBudgetStore((s) => s.budgets);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const loading = useBudgetStore((s) => s.loading);
  const error = useBudgetStore((s) => s.error);
  const authLoading = useAuthStore((s) => s.loading);
  const authInitialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const { ordered: orderedBudgets, moveUp, moveDown, moveTo } = useDisplayOrder(
    "budgets",
    budgets,
    (b) => b.id
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const displayBudgets = useMemo(() => {
    if (!dragId || !dragOverId || dragId === dragOverId) return orderedBudgets;
    const items = [...orderedBudgets];
    const fromIdx = items.findIndex(b => b.id === dragId);
    const toIdx = items.findIndex(b => b.id === dragOverId);
    if (fromIdx < 0 || toIdx < 0) return orderedBudgets;
    const [removed] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, removed);
    return items;
  }, [orderedBudgets, dragId, dragOverId]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDragId(id);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(itemId);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragId && dragOverId && dragId !== dragOverId) {
      const toIdx = orderedBudgets.findIndex(b => b.id === dragOverId);
      if (toIdx >= 0) moveTo(dragId, toIdx);
    }
    setDragId(null);
    setDragOverId(null);
  }, [dragId, dragOverId, orderedBudgets, moveTo]);
  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  // Wait for auth to fully resolve before fetching budgets.
  const authReady = authInitialized && !authLoading && !!user;

  useEffect(() => {
    if (authReady) {
      fetchBudgets();
    }
  }, [fetchBudgets, authReady]);

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
              <div className="flex size-16 items-center justify-center border-2 border-red-500 bg-red-50 dark:bg-red-950/30">
                <Wallet className="size-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {t("errorLoading")}
                </h1>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchBudgets()}
                className="gap-2"
              >
                <Plus className="size-4" />
                {tc("retry")}
              </Button>
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
                    {budgets.length} / 7 {t("budgetCountLabel")}
                  </p>
                </div>
                {budgets.length < 7 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateBudget(true)}
                    className="gap-1.5 h-10 min-w-[44px]"
                  >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t("newBudget")}</span>
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:gap-6">
                {displayBudgets.map((budget, idx) => (
                  <div
                    key={budget.id}
                    draggable={displayBudgets.length > 1}
                    onDragStart={(e) => handleDragStart(e, budget.id)}
                    onDragOver={(e) => handleDragOver(e, budget.id)}
                    onDrop={(e) => handleDrop(e)}
                    onDragEnd={handleDragEnd}
                    className={dragId === budget.id ? "opacity-50" : undefined}
                  >
                    <BudgetCard
                      budget={budget}
                      onClick={() => router.push(`/budget/${budget.id}`)}
                      onMoveUp={displayBudgets.length > 1 && idx > 0 ? () => {} : undefined}
                      onMoveDown={displayBudgets.length > 1 && idx < displayBudgets.length - 1 ? () => {} : undefined}
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
