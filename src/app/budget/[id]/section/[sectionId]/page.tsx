"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { ArrowLeft, Plus, Settings, BarChart3 } from "lucide-react";
import {
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useTranslations } from "@/i18n/client";
import type { Category, Expense } from "@/types/budget";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-72 animate-pulse bg-muted" /></div> }
);
const BreakdownChart = dynamic(
  () => import("@/components/dashboard/breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-72 animate-pulse bg-muted" /></div> }
);

export default function SectionPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);
  const budgetBase = "budget";

  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const tc = useTranslations("common");
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const tSection = useTranslations("section");
  const tActions = useTranslations("dashboard.sectionActions");

  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  const sectionSummary = summary?.sections.find(
    (c) => c.section.id === params.sectionId
  );

  useEffect(() => {
    // Only redirect if summary loaded successfully but section not found
    if (summary && !summaryLoading && !sectionSummary) {
      router.push(`/${budgetBase}/${params.id}`);
    }
  }, [summary, summaryLoading, sectionSummary, router, budgetBase, params.id]);

  if (!summary || !sectionSummary) {
    // If we're still loading, let the parent layout handle the skeleton
    if (summaryLoading) {
      return null;
    }
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {tc("loading")}
          </p>
        </div>
      </div>
    );
  }

  const { section, categories, allocated_amount, total_spent } = sectionSummary;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  // Filter expenses to only those belonging to this section's categories.
  const sectionCatIds = new Set(categories.map((c) => c.category.id));
  const sectionExpenses = expenses.filter((e) => sectionCatIds.has(e.category_id));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${budgetBase}/${params.id}`)}
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-foreground transition-colors duration-200 hover:bg-foreground hover:text-background border-2 border-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={section.icon} className="size-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{section.name}</h1>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {section.allocation_percent}% {tDash("ofBudget")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{t("addExpense")}</span>
          </button>
          <button
            type="button"
            onClick={() => setEditSectionOpen(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border-2 border-foreground"
            aria-label="Section settings"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("budgeted")}</p>
          <p className="text-lg font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("spent")}</p>
          <p className={cn("text-lg font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("remaining")}</p>
          <p className={cn(
            "text-lg font-bold tabular-nums font-mono",
            remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {remaining < 0 ? "-" : ""}{formatCompact(Math.abs(remaining), summary.budget.currency)}
          </p>
        </div>
      </div>

      {/* Progress */}
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

      {/* Charts */}
      {total_spent > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart expenses={sectionExpenses} currency={summary.budget.currency} />
          </div>
          <div>
            <BreakdownChart summary={summary} sectionId={params.sectionId} />
          </div>
        </div>
      ) : (
        <SpendingChart expenses={sectionExpenses} currency={summary.budget.currency} />
      )}

      {/* Category cards — same layout as SectionCard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
            {tSection("categories")}
          </h2>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground py-4 text-center">
            {tDash("noCategories")}.
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => {
              const catPct = getPercentage(cat.total_spent, cat.allocated_amount);
              const catProgressColor = getProgressColor(catPct);
              const catTextColor = getProgressTextColor(catPct);
              const catRemaining = cat.allocated_amount - cat.total_spent;

              return (
                <div key={cat.category.id} className="border-2 border-foreground bg-card">
                  <div className="p-5 sm:p-7">
                    {/* Mobile layout */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <CategoryIcon iconKey={cat.category.icon} className="size-6" />
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-foreground">{cat.category.name}</p>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {cat.expense_count === 1 ? t("expenseCountSingular", { count: cat.expense_count }) : t("expenseCount", { count: cat.expense_count })}
                          </p>
                        </div>
                      </div>

                      {/* Amount row - Mobile */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            {tSection("allocationPercent")}
                          </p>
                          <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                            {formatCompact(cat.allocated_amount, summary.budget.currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tDash("used")}</p>
                          <p className={cn("text-2xl font-bold tabular-nums font-mono", catTextColor)}>
                            {catPct}%
                          </p>
                        </div>
                      </div>

                      {/* Action buttons - Mobile */}
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${cat.category.id}`)}
                          className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
                        >
                          <BarChart3 className="size-3.5" />
                          {tActions("reports")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(cat.category)}
                          className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
                        >
                          <Settings className="size-3.5" />
                          {tActions("adjust")}
                        </button>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:flex items-center justify-between min-h-[44px] mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <CategoryIcon iconKey={cat.category.icon} className="size-6" />
                        <div>
                          <p className="text-lg font-semibold text-foreground">{cat.category.name}</p>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {cat.expense_count === 1 ? t("expenseCountSingular", { count: cat.expense_count }) : t("expenseCount", { count: cat.expense_count })}
                          </p>
                        </div>
                      </div>

                      {/* Desktop action buttons */}
                      <div className="flex items-center gap-2 mr-6">
                        <button
                          type="button"
                          onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${cat.category.id}`)}
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
                        >
                          <BarChart3 className="size-3.5" />
                          {tActions("reports")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(cat.category)}
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
                        >
                          <Settings className="size-3.5" />
                          {tActions("adjust")}
                        </button>
                      </div>

                      {/* Amount display - right side */}
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          {tSection("allocationPercent")}
                        </p>
                        <p className="text-3xl font-bold tabular-nums font-mono text-foreground">
                          {formatCompact(cat.allocated_amount, summary.budget.currency)}
                        </p>
                        <p className={cn("text-sm font-semibold tabular-nums font-mono mt-1", catTextColor)}>
                          {catPct}% {tDash("used")}
                        </p>
                      </div>
                    </div>

                    {/* Spent / Remaining row */}
                    <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
                      <span>
                        {t("spent")}:{" "}
                        <span className="font-bold font-mono tabular-nums text-foreground">
                          {formatCompact(cat.total_spent, summary.budget.currency)}
                        </span>
                      </span>
                      <span>
                        {t("remaining")}:{" "}
                        <span className={cn(
                          "font-bold font-mono tabular-nums",
                          catRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                        )}>
                          {catRemaining < 0 ? "-" : ""}
                          {formatCompact(Math.abs(catRemaining), summary.budget.currency)}
                        </span>
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-3 w-full overflow-hidden bg-muted">
                        <div
                          className={cn("h-full transition-all duration-300", catProgressColor)}
                          style={{ width: `${Math.min(catPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expense list for this section */}
      {sectionExpenses.length > 0 && (() => {
        const categoryMap = new Map<string, { name: string; icon: string | null; categoryName: string }>();
        for (const sec of summary.sections) {
          for (const cat of sec.categories) {
            categoryMap.set(cat.category.id, { name: cat.category.name, icon: cat.category.icon, categoryName: sec.section.name });
          }
        }
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold border-b border-border pb-2">{t("expenses")}</h2>
            <ExpenseList
              expenses={sectionExpenses}
              currency={summary.budget.currency}
              categoriesMap={categoryMap}
              onEdit={(exp) => setEditingExpense(exp)}
              onDelete={(id) => deleteExpense(id)}
            />
          </div>
        );
      })()}

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        budgetId={params.id}
        categories={summary.sections.map((s) => ({
          ...s.section,
          categories: s.categories.map((c) => c.category),
        }))}
        currency={summary.budget.currency}
        preselectedCategoryId={categories.length > 0 ? categories[0].category.id : undefined}
      />

      {/* Edit dialogs */}
      <EditSectionDialog
        section={section}
        categories={categories.map((s) => s.category)}
        open={editSectionOpen}
        onOpenChange={setEditSectionOpen}
      />
      {editingCategory && (
        <EditCategoryDialog
          sectionId={section.id}
          category={editingCategory}
          parentSection={section}
          siblingCategories={categories.map((s) => s.category)}
          open={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null);
          }}
        />
      )}
      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => { if (!open) setEditingExpense(null); }}
          budgetId={params.id}
          expense={editingExpense}
          categories={summary.sections.map((s) => ({
            ...s.section,
            categories: s.categories.map((c) => c.category),
          }))}
          currency={summary.budget.currency}
        />
      )}
    </div>
  );
}
