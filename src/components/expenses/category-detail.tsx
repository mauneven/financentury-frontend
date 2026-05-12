"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Settings } from "lucide-react";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  { ssr: false, loading: () => <div className="border border-border rounded-lg bg-card p-6"><div className="h-64 animate-pulse rounded-md bg-muted" /></div> }
);

import { useQueryClient } from "@tanstack/react-query";

import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { SpendingByUser } from "@/components/dashboard/spending-by-user";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { expenseApi } from "@/lib/api";
import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { CategoryIcon } from "@/lib/icon-picker";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Category, CategorySummary, Expense } from "@/types/budget";

import { AddExpenseDialog } from "./add-expense-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { ExpenseList } from "./expense-list";

const ICON_STROKE = 1.8;

interface CategoryDetailProps {
  categorySummary: CategorySummary;
  expenses: Expense[];
  currency: string;
  budgetId: string;
  /** Flat list of all categories (own + linked) for expense picker. */
  categories: Category[];
  /** Optional: when the category is linked, edits route through this budget. */
  linkedCategoryBudgetMap?: Map<string, string>;
}

export function CategoryDetail({
  categorySummary,
  expenses,
  currency,
  budgetId,
  categories,
  linkedCategoryBudgetMap,
}: CategoryDetailProps) {
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.categoryActions");
  const queryClient = useQueryClient();

  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);

  const { category: detailCategory, allocated_amount, total_spent, expense_count } = categorySummary;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);
  const overBudget = remaining < 0;

  const categoriesMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string | null; categoryName: string }>();
    for (const cat of categories) {
      map.set(cat.id, {
        name: cat.name,
        icon: cat.icon,
        categoryName: cat.name,
      });
    }
    return map;
  }, [categories]);

  // Only show expenses belonging to this category. The page passes the right
  // source — `expenses` for owned categories, `linkedExpenses` for linked.
  const filteredExpenses = expenses.filter((e) => e.category_id === detailCategory.id);

  // Route deletes through the expense's own budget_id so linked expenses
  // (whose budget_id refers to a foreign source budget) hit the correct
  // endpoint. After deletion, invalidate both budgets' detail subtrees:
  // the source (where the row lived) and the active one (whose summary
  // aggregates linked spend).
  const handleDelete = async (expenseId: string) => {
    const target = filteredExpenses.find((e) => e.id === expenseId);
    const targetBudgetId = target?.budget_id ?? budgetId;
    await expenseApi.delete(targetBudgetId, expenseId);
    queryClient.invalidateQueries({
      queryKey: qk.budget.detail(targetBudgetId),
    });
    if (targetBudgetId !== budgetId) {
      queryClient.invalidateQueries({
        queryKey: qk.budget.detail(budgetId),
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/budget/${budgetId}`)}
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-muted border border-border"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" strokeWidth={ICON_STROKE} />
          </button>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={detailCategory.icon} className="size-8" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{detailCategory.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {expense_count === 1 ? t("expensesRecorded", { count: expense_count }) : t("expensesRecordedPlural", { count: expense_count })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditCategoryOpen(true)}
            className="gap-1.5"
          >
            <Settings className="size-3.5" strokeWidth={ICON_STROKE} />
            <span className="hidden sm:inline">{tActions("adjust")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" strokeWidth={ICON_STROKE} />
            <span className="hidden sm:inline">{t("addExpense")}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-lg bg-card p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t("budgeted")}</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatCurrency(allocated_amount, currency)}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t("spent")}</p>
          <p className={cn("text-lg font-semibold tabular-nums", textColor)}>
            {formatCurrency(total_spent, currency)}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t("remaining")}</p>
          <p className={cn(
            "text-lg font-semibold tabular-nums",
            overBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {overBudget ? "-" : ""}{formatCurrency(Math.abs(remaining), currency)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-sm font-medium text-muted-foreground">{t("budgetUsage")}</span>
          <span className={cn("font-semibold tabular-nums", textColor)}>
            {percentage}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-300", progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Per-person spending (category level) */}
      {categorySummary.spending_by_user && categorySummary.spending_by_user.length > 0 && (
        <div className="border border-border rounded-lg bg-card p-5 sm:p-6">
          <SpendingByUser
            spendingByUser={categorySummary.spending_by_user}
            totalSpent={total_spent}
            currency={currency}
          />
        </div>
      )}

      {/* Chart */}
      <SpendingChart expenses={filteredExpenses} currency={currency} />

      {/* Expense List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("allExpenses")}
          </h2>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg px-4 py-12 text-center">
            <p className="mb-1 text-sm font-medium">{t("noExpenses")}</p>
            <p className="mb-5 max-w-xs text-sm text-muted-foreground">
              {t("addExpenseHere", { name: detailCategory.name })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-3.5" strokeWidth={ICON_STROKE} />
              {t("addExpense")}
            </Button>
          </div>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            currency={currency}
            categoriesMap={categoriesMap}
            onEdit={(expense) => setEditingExpense(expense)}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddExpenseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        budgetId={budgetId}
        categories={categories}
        currency={currency}
        preselectedCategoryId={detailCategory.id}
        linkedCategoryBudgetMap={linkedCategoryBudgetMap}
      />

      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
          expense={editingExpense}
          categories={categories}
          currency={currency}
        />
      )}

      {editCategoryOpen && (
        <EditCategoryDialog
          category={detailCategory}
          open={editCategoryOpen}
          onOpenChange={(o) => setEditCategoryOpen(o)}
        />
      )}

      {/* Tip for linked-category: reports section (spacing) */}
      <div className="sr-only">{tDash("categoryBreakdown")}</div>
    </div>
  );
}
