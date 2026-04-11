"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-64 animate-pulse bg-muted" /></div> }
);

import type { Expense, Section, CategorySummary } from "@/types/budget";
import {
  formatCurrency,
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

import { ExpenseList } from "./expense-list";
import { AddExpenseDialog } from "./add-expense-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";

interface CategoryDetailProps {
  categorySummary: CategorySummary;
  expenses: Expense[];
  currency: string;
  budgetId: string;
  categories: Section[];
  sectionId: string;
}

export function CategoryDetail({
  categorySummary,
  expenses,
  currency,
  budgetId,
  categories,
  sectionId,
}: CategoryDetailProps) {
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);

  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { category: detailCategory, allocated_amount, total_spent, expense_count } = categorySummary;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);
  const overBudget = remaining < 0;
  // averageExpense available if needed: expense_count > 0 ? total_spent / expense_count : 0

  // Build categories map for expense list
  const categoriesMap = (() => {
    const map = new Map<string, { name: string; icon: string | null; categoryName: string }>();
    for (const sec of categories) {
      for (const cat of sec.categories || []) {
        map.set(cat.id, {
          name: cat.name,
          icon: cat.icon,
          categoryName: sec.name,
        });
      }
    }
    return map;
  })();

  // Filter expenses for this category
  const filteredExpenses = expenses.filter((e) => e.category_id === detailCategory.id);

  const handleDelete = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header — matches budget + section page pattern */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border border-border"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={detailCategory.icon} className="size-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{detailCategory.name}</h1>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {expense_count === 1 ? t("expensesRecorded", { count: expense_count }) : t("expensesRecordedPlural", { count: expense_count })}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t("addExpense")}</span>
        </button>
      </div>

      {/* Stats — 3 cards like budget + section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("budgeted")}</p>
          <p className="text-lg font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("spent")}</p>
          <p className={cn("text-lg font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("remaining")}</p>
          <p className={cn(
            "text-lg font-bold tabular-nums font-mono",
            overBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {overBudget ? "-" : ""}{formatCompact(Math.abs(remaining), currency)}
          </p>
        </div>
      </div>

      {/* Progress — same style as section */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t("budgetUsage")}</span>
          <span className={cn("font-bold tabular-nums font-mono", textColor)}>
            {percentage}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden bg-muted">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Chart — always show like budget dashboard */}
      <SpendingChart budgetId={budgetId} currency={currency} categoryIds={[detailCategory.id]} />

      {/* Expense List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
            {t("allExpenses")}
          </h2>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-foreground px-4 py-12 text-center">
            <p className="mb-1 text-sm font-semibold">{t("noExpenses")}</p>
            <p className="mb-5 max-w-xs text-sm text-muted-foreground">
              {t("addExpenseHere", { name: detailCategory.name })}
            </p>
            <button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <Plus className="size-3.5" />
              {t("addExpense")}
            </button>
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

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        budgetId={budgetId}
        categories={categories}
        currency={currency}
        preselectedCategoryId={detailCategory.id}
      />

      {/* Edit Expense Dialog */}
      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
          expense={editingExpense}
          budgetId={budgetId}
          categories={categories}
          currency={currency}
        />
      )}
    </div>
  );
}

