"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { ArrowLeft, Plus, Settings, BarChart3, Link2, ChevronUp, ChevronDown } from "lucide-react";
import {
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFlipList } from "@/hooks/use-flip-list";
import dynamic from "next/dynamic";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
// ManageLinkDialog replaced — EditCategoryDialog handles linked categories too
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useTranslations } from "@/i18n/client";
import type { Category, Expense, CategorySummary, BudgetLink } from "@/types/budget";
import { useDisplayOrder } from "@/hooks/use-display-order";

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
  const linkedExpensesFromStore = useBudgetStore((s) => s.linkedExpenses);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);
  const budgetBase = "budget";

  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingLinkedCat, setEditingLinkedCat] = useState<{ cat: CategorySummary; link: BudgetLink; sourceName: string } | null>(null);
  const tc = useTranslations("common");
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const tSection = useTranslations("section");
  const tActions = useTranslations("dashboard.sectionActions");
  const tl = useTranslations("links");

  const summaryLoading = useBudgetStore((s) => s.summaryLoading);

  const sectionSummary = summary?.sections.find(
    (c) => c.section.id === params.sectionId
  );

  const linkedSections = summary?.linked_sections ?? [];

  // Category-level links targeting this section
  const linkedCategories = useMemo(() => {
    if (!params.sectionId) return [];
    return linkedSections
      .filter((ls) => ls.link.source_category_id && ls.link.target_section_id === params.sectionId)
      .flatMap((ls) =>
        ls.categories.map((cat) => ({
          categorySummary: cat,
          link: ls.link,
          sourceBudgetName: ls.source_budget.name,
        }))
      );
  }, [linkedSections, params.sectionId]);

  // All categories for expense dialogs: own sections + linked sections
  const expenseDialogCategories = useMemo(() => {
    if (!summary) return [];
    const own = summary.sections.map((s) => {
      const linkedCats = linkedSections
        .filter((ls) => ls.link.source_category_id && ls.link.target_section_id === s.section.id)
        .flatMap((ls) => ls.categories.map((c) => c.category));
      return {
        ...s.section,
        categories: [...s.categories.map((c) => c.category), ...linkedCats],
      };
    });
    const linked = linkedSections
      .filter((ls) => !ls.link.source_category_id)
      .map((ls) => ({
        ...ls.section,
        categories: ls.categories.map((c) => c.category),
      }));
    return [...own, ...linked];
  }, [summary, linkedSections]);

  const linkedCategoryBudgetMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ls of linkedSections) {
      if (ls.link.source_category_id) {
        for (const cat of ls.categories) {
          m.set(cat.category.id, ls.link.source_budget_id);
        }
      }
    }
    return m;
  }, [linkedSections]);

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

  // Filter expenses to only those belonging to this section's categories (including linked).
  const sectionCatIds = new Set([
    ...categories.map((c) => c.category.id),
    ...linkedCategories.map((lc) => lc.categorySummary.category.id),
  ]);
  const sectionExpenses = [...expenses, ...linkedExpensesFromStore].filter((e) => sectionCatIds.has(e.category_id));

  // Unified category list for ordering
  type OrderableCat = { id: string; type: "own"; cat: typeof categories[number] } | { id: string; type: "linked"; lc: typeof linkedCategories[number] };
  const allCats = useMemo((): OrderableCat[] => [
    ...categories.map((cat): OrderableCat => ({ id: cat.category.id, type: "own", cat })),
    ...linkedCategories.map((lc): OrderableCat => ({ id: `linked-${lc.link.id}-${lc.categorySummary.category.id}`, type: "linked", lc })),
  ], [categories, linkedCategories]);

  const getCatId = useCallback((c: OrderableCat) => c.id, []);
  const { ordered: orderedCats, moveUp: moveCatUp, moveDown: moveCatDown } = useDisplayOrder(
    `budget-${params.id}-section-${params.sectionId}-categories`,
    allCats,
    getCatId
  );

  const { ref: catListRef, capturePositions: captureCatPositions } = useFlipList();

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
                {summary.budget.monthly_income > 0 ? Math.round((section.allocation_value / summary.budget.monthly_income) * 100) : 0}% {tDash("ofBudget")}
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
          <button
            type="button"
            onClick={() => setAddCategoryOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {tSection("addCategory")}
          </button>
        </div>
        {orderedCats.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground py-4 text-center">
            {tDash("noCategories")}.
          </p>
        ) : (
          <div ref={catListRef} className="space-y-4">
            {orderedCats.map((item, idx) => {
              const isOwn = item.type === "own";
              const cat = isOwn ? item.cat : item.lc.categorySummary;
              const lc = isOwn ? null : item.lc;
              const catPct = getPercentage(cat.total_spent, cat.allocated_amount);
              const catProgressColor = getProgressColor(catPct);
              const catTextColor = getProgressTextColor(catPct);
              const catRemaining = cat.allocated_amount - cat.total_spent;

              const moveButtons = (size: "sm" | "lg") => (
                <div className={cn("flex flex-col shrink-0", orderedCats.length <= 1 && "invisible")}>
                  <button type="button" onClick={() => { captureCatPositions(); moveCatUp(item.id); }} className={cn("p-0.5 transition-colors", idx > 0 ? "text-muted-foreground/40 hover:text-foreground" : "invisible")} aria-label="Move up">
                    <ChevronUp className={size === "sm" ? "size-4" : "size-5"} />
                  </button>
                  <button type="button" onClick={() => { captureCatPositions(); moveCatDown(item.id); }} className={cn("p-0.5 transition-colors", idx < orderedCats.length - 1 ? "text-muted-foreground/40 hover:text-foreground" : "invisible")} aria-label="Move down">
                    <ChevronDown className={size === "sm" ? "size-4" : "size-5"} />
                  </button>
                </div>
              );

              return (
                <div
                  key={item.id}
                  data-flip-key={item.id}
                  className={isOwn ? "border-2 border-foreground bg-card" : "border-2 border-foreground/50 border-dashed bg-card"}
                >
                  <div className="p-5 sm:p-7">
                    {/* Linked badge */}
                    {!isOwn && lc && (
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Link2 className="size-3.5" />
                        <span className="font-bold">{tl("linkedFrom", { name: lc.sourceBudgetName })}</span>
                      </div>
                    )}

                    {/* Mobile layout */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <CategoryIcon iconKey={cat.category.icon} className="size-6" />
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-foreground">{cat.category.name}</p>
                          {isOwn && (
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              {cat.expense_count === 1 ? t("expenseCountSingular", { count: cat.expense_count }) : t("expenseCount", { count: cat.expense_count })}
                            </p>
                          )}
                        </div>
                        {moveButtons("sm")}
                      </div>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tSection("allocationPercent")}</p>
                          <p className="text-2xl font-bold tabular-nums font-mono text-foreground">{formatCompact(cat.allocated_amount, summary.budget.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tDash("used")}</p>
                          <p className={cn("text-2xl font-bold tabular-nums font-mono", catTextColor)}>{catPct}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <button type="button" onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${cat.category.id}`)} className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5">
                          <BarChart3 className="size-3.5" />{tActions("reports")}
                        </button>
                        <button type="button" onClick={() => isOwn ? setEditingCategory(cat.category) : lc && setEditingLinkedCat({ cat, link: lc.link, sourceName: lc.sourceBudgetName })} className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5">
                          <Settings className="size-3.5" />{tActions("adjust")}
                        </button>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:flex items-center justify-between min-h-[44px] mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <CategoryIcon iconKey={cat.category.icon} className="size-6" />
                        <div>
                          <p className="text-lg font-semibold text-foreground">{cat.category.name}</p>
                          {isOwn && (
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              {cat.expense_count === 1 ? t("expenseCountSingular", { count: cat.expense_count }) : t("expenseCount", { count: cat.expense_count })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mr-6">
                        <button type="button" onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${cat.category.id}`)} className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5">
                          <BarChart3 className="size-3.5" />{tActions("reports")}
                        </button>
                        <button type="button" onClick={() => isOwn ? setEditingCategory(cat.category) : lc && setEditingLinkedCat({ cat, link: lc.link, sourceName: lc.sourceBudgetName })} className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5">
                          <Settings className="size-3.5" />{tActions("adjust")}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tSection("allocationPercent")}</p>
                          <p className="text-3xl font-bold tabular-nums font-mono text-foreground">{formatCompact(cat.allocated_amount, summary.budget.currency)}</p>
                          <p className={cn("text-sm font-semibold tabular-nums font-mono mt-1", catTextColor)}>{catPct}% {tDash("used")}</p>
                        </div>
                        {moveButtons("lg")}
                      </div>
                    </div>

                    {/* Spent / Remaining */}
                    <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
                      <span>{t("spent")}: <span className="font-bold font-mono tabular-nums text-foreground">{formatCompact(cat.total_spent, summary.budget.currency)}</span></span>
                      <span>{t("remaining")}: <span className={cn("font-bold font-mono tabular-nums", catRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>{catRemaining < 0 ? "-" : ""}{formatCompact(Math.abs(catRemaining), summary.budget.currency)}</span></span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-3 w-full overflow-hidden bg-muted">
                        <div className={cn("h-full transition-all duration-300", catProgressColor)} style={{ width: `${Math.min(catPct, 100)}%` }} />
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
        for (const ls of linkedSections) {
          for (const cat of ls.categories) {
            categoryMap.set(cat.category.id, { name: cat.category.name, icon: cat.category.icon, categoryName: ls.section.name });
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
        categories={expenseDialogCategories}
        currency={summary.budget.currency}
        preselectedCategoryId={categories.length > 0 ? categories[0].category.id : undefined}
        linkedCategoryBudgetMap={linkedCategoryBudgetMap}
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
          expense={editingExpense}
          categories={expenseDialogCategories}
          currency={summary.budget.currency}
        />
      )}

      {/* Add Category Dialog */}
      <AddCategoryDialog
        sectionId={section.id}
        existingCategoryIcons={categories.map((s) => s.category.icon)}
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
      />

      {/* Edit linked category dialog */}
      {editingLinkedCat && (
        <EditCategoryDialog
          sectionId={editingLinkedCat.link.source_section_id}
          category={editingLinkedCat.cat.category}
          link={editingLinkedCat.link}
          open={!!editingLinkedCat}
          onOpenChange={(open) => {
            if (!open) setEditingLinkedCat(null);
          }}
        />
      )}
    </div>
  );
}
