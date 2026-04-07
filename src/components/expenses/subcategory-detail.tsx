"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Receipt,
} from "lucide-react";

import type { Expense, Category, SubcategorySummary } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExpenseList } from "./expense-list";
import { AddExpenseDialog } from "./add-expense-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";

interface SubcategoryDetailProps {
  subcategorySummary: SubcategorySummary;
  expenses: Expense[];
  currency: string;
  budgetId: string;
  categories: Category[];
}

export function SubcategoryDetail({
  subcategorySummary,
  expenses,
  currency,
  budgetId,
  categories,
}: SubcategoryDetailProps) {
  const t = useTranslations("expense");
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { subcategory, allocated_amount, total_spent, expense_count } = subcategorySummary;

  const remaining = Math.max(0, allocated_amount - total_spent);
  const percentage = getPercentage(total_spent, allocated_amount);
  const overBudget = total_spent > allocated_amount;
  const averageExpense = expense_count > 0 ? total_spent / expense_count : 0;

  // Build subcategories map for expense list
  const subcategoriesMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string | null; categoryName: string }>();
    for (const cat of categories) {
      for (const sub of cat.subcategories || []) {
        map.set(sub.id, {
          name: sub.name,
          icon: sub.icon,
          categoryName: cat.name,
        });
      }
    }
    return map;
  }, [categories]);

  // Filter expenses for this subcategory
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.subcategory_id === subcategory.id),
    [expenses, subcategory.id]
  );

  const handleDelete = useCallback(
    async (expenseId: string) => {
      await deleteExpense(expenseId);
    },
    [deleteExpense]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-xl">
          {subcategory.icon || "📂"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{subcategory.name}</h2>
          <p className="text-sm text-muted-foreground">
            {expense_count !== 1
              ? t("expensesRecordedPlural", { count: String(expense_count) })
              : t("expensesRecorded", { count: String(expense_count) })}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="min-h-[44px] shrink-0">
          <Plus className="mr-2 size-4" />
          <span className="hidden sm:inline">{t("addExpense")}</span>
          <span className="sm:hidden">{t("addExpense")}</span>
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("budgetUsage")}</span>
          <span className={cn("font-mono font-medium", getProgressTextColor(percentage))}>
            {percentage}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              getProgressColor(percentage)
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("spentAmount", { amount: formatCurrency(total_spent, currency) })}</span>
          <span>{t("budgetedAmount", { amount: formatCurrency(allocated_amount, currency) })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t("budgeted")}
          value={formatCurrency(allocated_amount, currency)}
          icon={null}
        />
        <StatCard
          label={t("spent")}
          value={formatCurrency(total_spent, currency)}
          icon={<TrendingUp className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label={t("remaining")}
          value={formatCurrency(remaining, currency)}
          className={overBudget ? "text-destructive" : "text-emerald-600"}
          icon={
            overBudget
              ? <TrendingDown className="size-4 text-destructive" />
              : null
          }
        />
        <StatCard
          label={t("averageExpense")}
          value={expense_count > 0 ? formatCurrency(averageExpense, currency) : "--"}
          icon={null}
        />
      </div>

      <Separator />

      {/* Expense List */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("allExpenses")}</h3>
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 sm:py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Receipt className="size-6 text-muted-foreground" />
            </div>
            <p className="mb-1 text-sm font-medium">{t("noExpenses")}</p>
            <p className="mb-4 max-w-xs text-sm text-muted-foreground">
              {t("addExpenseHere", { name: subcategory.name })}
            </p>
            <Button variant="outline" onClick={() => setAddDialogOpen(true)} className="min-h-[44px]">
              <Plus className="mr-1.5 size-4" />
              {t("addExpense")}
            </Button>
          </div>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            currency={currency}
            subcategories={subcategoriesMap}
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
        preselectedSubcategoryId={subcategory.id}
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

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1.5 p-3 sm:p-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <span className={cn("font-mono text-sm font-semibold", className)}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}
