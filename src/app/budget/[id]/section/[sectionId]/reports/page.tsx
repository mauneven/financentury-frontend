"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useBudgetStore } from "@/store/budget-store";
import { ArrowLeft, BarChart3, Settings, Plus } from "lucide-react";
import { formatCompact, getPercentage, getProgressColor, getProgressTextColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import type { Category } from "@/types/budget";
import { useTranslations } from "@/i18n/client";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-64 animate-pulse bg-muted" /></div> }
);
const BreakdownChart = dynamic(
  () => import("@/components/dashboard/breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-64 animate-pulse bg-muted" /></div> }
);

export default function SectionReportsPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const budgetBase = "budget";
  const tc = useTranslations("common");
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const tSection = useTranslations("section");
  const tActions = useTranslations("dashboard.sectionActions");

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  const sectionSummary = summary?.sections.find(
    (s) => s.section.id === params.sectionId
  );

  useEffect(() => {
    // Only redirect if summary loaded but section not found
    if (summary && !summaryLoading && !sectionSummary) {
      router.push(`/${budgetBase}/${params.id}`);
    }
  }, [summary, summaryLoading, sectionSummary, router, budgetBase, params.id]);

  if (!summary || !sectionSummary) {
    if (summaryLoading) {
      return null; // Layout handles skeleton
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
  const currency = summary.budget.currency;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);
  const categoryIds = categories.map((c) => c.category.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header — matches section page pattern */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${budgetBase}/${params.id}`)}
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={section.icon} className="size-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {section.name}
              </h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {tActions("reports")} · {section.allocation_percent}% {tDash("ofBudget")}
            </p>
          </div>
        </div>
        </div>
        {categories.length > 0 ? (
          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{t("addExpense")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAddCategoryOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{tSection("addCategory")}</span>
          </button>
        )}
      </div>

      {/* Stats totales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("budgeted")}</p>
          <p className="text-xl font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("spent")}</p>
          <p className={cn("text-xl font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("remaining")}</p>
          <p className={cn(
            "text-xl font-bold tabular-nums font-mono",
            remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {remaining < 0 ? "-" : ""}{formatCompact(Math.abs(remaining), currency)}
          </p>
        </div>
      </div>

      {/* Progress bar general */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t("budgetUsage")}</span>
          <span className={cn("text-sm font-bold tabular-nums font-mono", textColor)}>{percentage}%</span>
        </div>
        <div className="h-4 w-full overflow-hidden bg-muted border border-border">
          <div
            className={cn("h-full transition-all duration-500", progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Charts — always show SpendingChart */}
      {total_spent > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart budgetId={params.id} currency={currency} categoryIds={categoryIds} />
          </div>
          <div>
            <BreakdownChart summary={summary} sectionId={params.sectionId} />
          </div>
        </div>
      ) : (
        <SpendingChart budgetId={params.id} currency={currency} categoryIds={categoryIds} />
      )}

      {/* Desglose por categorías */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-widest border-b-2 border-foreground pb-2">
          {tSection("categories")} · {categories.length}
        </h2>

        {categories.length === 0 ? (
          <div className="border-2 border-foreground bg-card flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-foreground bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="mb-1 text-base font-semibold text-foreground">
              {tDash("noCategories")}
            </h4>
            <p className="mb-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              {tDash("noCategoriesHint")}
            </p>
            <button
              type="button"
              onClick={() => setAddCategoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
            >
              <Plus className="size-3.5" />
              {tSection("addCategory")}
            </button>
          </div>
        ) : (
          categories.map((cat) => {
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
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tSection("allocationPercent")}</p>
                        <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                          {formatCompact(cat.allocated_amount, currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tDash("used")}</p>
                        <p className={cn("text-2xl font-bold tabular-nums font-mono", catTextColor)}>{catPct}%</p>
                      </div>
                    </div>
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
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tSection("allocationPercent")}</p>
                      <p className="text-3xl font-bold tabular-nums font-mono text-foreground">
                        {formatCompact(cat.allocated_amount, currency)}
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
                        {formatCompact(cat.total_spent, currency)}
                      </span>
                    </span>
                    <span>
                      {t("remaining")}:{" "}
                      <span className={cn(
                        "font-bold font-mono tabular-nums",
                        catRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                      )}>
                        {catRemaining < 0 ? "-" : ""}
                        {formatCompact(Math.abs(catRemaining), currency)}
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
          })
        )}
      </div>

      {/* Edit Category Dialog */}
      {/* Dialogs */}
      {editingCategory && (
        <EditCategoryDialog
          sectionId={section.id}
          category={editingCategory}
          parentSection={section}
          siblingCategories={categories.map((c) => c.category)}
          open={!!editingCategory}
          onOpenChange={(open) => { if (!open) setEditingCategory(null); }}
        />
      )}
      <AddCategoryDialog
        sectionId={section.id}
        existingCategoryIcons={categories.map((c) => c.category.icon)}
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
      />
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        budgetId={params.id}
        categories={summary.sections.map((s) => ({
          ...s.section,
          categories: s.categories.map((c) => c.category),
        }))}
        currency={currency}
        preselectedCategoryId={categories.length > 0 ? categories[0].category.id : undefined}
      />
    </div>
  );
}
