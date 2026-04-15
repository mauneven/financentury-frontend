"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useBudgetStore } from "@/store/budget-store";
import { ArrowLeft, BarChart3, Settings, Plus, Link2, GripVertical } from "lucide-react";
import { formatCurrency, getPercentage, getProgressColor, getProgressTextColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
// ManageLinkDialog replaced — EditCategoryDialog handles linked categories too
import type { Category, CategorySummary, BudgetLink, UserSpending } from "@/types/budget";
import { SpendingByUser } from "@/components/dashboard/spending-by-user";
import { SectionUnallocatedBanner } from "@/components/dashboard/unallocated-banner";
import { useTranslations } from "@/i18n/client";
import { useDisplayOrder } from "@/hooks/use-display-order";

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
  const expenses = useBudgetStore((s) => s.expenses);
  const linkedExpensesFromStore = useBudgetStore((s) => s.linkedExpenses);
  const budgetBase = "budget";
  const tc = useTranslations("common");
  const t = useTranslations("expense");
  const tDash = useTranslations("dashboard");
  const tSection = useTranslations("section");
  const tActions = useTranslations("dashboard.sectionActions");

  const tl = useTranslations("links");

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryPrefillAmount, setCategoryPrefillAmount] = useState<number | undefined>(undefined);
  const [editingLinkedCat, setEditingLinkedCat] = useState<{ cat: CategorySummary; link: BudgetLink; sourceName: string } | null>(null);

  const summaryLoading = useBudgetStore((s) => s.summaryLoading);
  const updateSection = useBudgetStore((s) => s.updateSection);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  const sectionSummary = summary?.sections.find(
    (s) => s.section.id === params.sectionId
  );

  const linkedSections = summary?.linked_sections ?? [];

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

  // Build expense dialog categories: merge linked categories into their target sections
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

  // Map category IDs to source budget for linked categories
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

  // Inclusive totals (own + linked categories)
  const linkedSpent = linkedCategories.reduce((sum, lc) => sum + lc.categorySummary.total_spent, 0);
  const linkedAllocated = linkedCategories.reduce((sum, lc) => sum + lc.categorySummary.allocated_amount, 0);
  const effectiveSpent = total_spent + linkedSpent;
  const effectiveAllocated = allocated_amount + linkedAllocated;
  const remaining = effectiveAllocated - effectiveSpent;
  const percentage = getPercentage(effectiveSpent, effectiveAllocated);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  // Merge spending_by_user from section + linked categories
  const mergedSpendingByUser = useMemo((): UserSpending[] => {
    const userMap = new Map<string, UserSpending>();
    const addUsers = (users?: UserSpending[]) => {
      for (const u of users ?? []) {
        const existing = userMap.get(u.user_id);
        if (existing) {
          existing.amount += u.amount;
        } else {
          userMap.set(u.user_id, { ...u });
        }
      }
    };
    addUsers(sectionSummary.spending_by_user);
    for (const lc of linkedCategories) {
      addUsers(lc.categorySummary.spending_by_user);
    }
    return Array.from(userMap.values()).sort((a, b) => b.amount - a.amount);
  }, [sectionSummary, linkedCategories]);

  // Filter expenses for this section only (including linked categories).
  const sectionCatIds = new Set([
    ...categories.map((c) => c.category.id),
    ...linkedCategories.map((lc) => lc.categorySummary.category.id),
  ]);
  const sectionExpenses = [...expenses, ...linkedExpensesFromStore].filter((e) => sectionCatIds.has(e.category_id));
  const totalCategoryCount = categories.length + linkedCategories.length;

  // Unified category list for ordering
  type OrderableCat = { id: string; type: "own"; cat: CategorySummary } | { id: string; type: "linked"; lc: typeof linkedCategories[number] };
  const allCats = useMemo((): OrderableCat[] => [
    ...categories.map((cat): OrderableCat => ({ id: cat.category.id, type: "own", cat })),
    ...linkedCategories.map((lc): OrderableCat => ({ id: `linked-${lc.link.id}-${lc.categorySummary.category.id}`, type: "linked", lc })),
  ], [categories, linkedCategories]);

  const getCatId = useCallback((c: OrderableCat) => c.id, []);
  const { ordered: orderedCats, moveTo: moveCatTo } = useDisplayOrder(
    `budget-${params.id}-section-${params.sectionId}-categories`,
    allCats,
    getCatId
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const displayCats = useMemo(() => {
    if (!dragId || !dragOverId || dragId === dragOverId) return orderedCats;
    const items = [...orderedCats];
    const fromIdx = items.findIndex(i => i.id === dragId);
    const toIdx = items.findIndex(i => i.id === dragOverId);
    if (fromIdx < 0 || toIdx < 0) return orderedCats;
    const [removed] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, removed);
    return items;
  }, [orderedCats, dragId, dragOverId]);
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); setDragId(id); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, itemId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(itemId); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); if (dragId && dragOverId && dragId !== dragOverId) { const toIdx = orderedCats.findIndex(i => i.id === dragOverId); if (toIdx >= 0) moveCatTo(dragId, toIdx); } setDragId(null); setDragOverId(null); }, [dragId, dragOverId, orderedCats, moveCatTo]);
  const handleDragEnd = useCallback(() => { setDragId(null); setDragOverId(null); }, []);

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header — matches section page pattern */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${budgetBase}/${params.id}`)}
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-foreground transition-colors hover:bg-foreground hover:text-background border-2 border-foreground"
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
              {tActions("reports")} · {summary.budget.monthly_income > 0 ? Math.round((section.allocation_value / summary.budget.monthly_income) * 100) : 0}% {tDash("ofBudget")}
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
            onClick={() => {
              setCategoryPrefillAmount(allocated_amount * 0.3);
              setAddCategoryOpen(true);
            }}
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
            {formatCurrency(effectiveAllocated, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("spent")}</p>
          <p className={cn("text-xl font-bold tabular-nums font-mono", textColor)}>
            {formatCurrency(effectiveSpent, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">{t("remaining")}</p>
          <p className={cn(
            "text-xl font-bold tabular-nums font-mono",
            remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {remaining < 0 ? "-" : ""}{formatCurrency(Math.abs(remaining), currency)}
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

      {/* Unallocated section notification */}
      {(categories.length > 0 || linkedCategories.length > 0) && (() => {
        const totalCatValue = categories.reduce((sum, c) => sum + c.category.allocation_value, 0)
          + linkedCategories.reduce((sum, lc) => sum + lc.categorySummary.category.allocation_value, 0);
        const unallocAmt = allocated_amount - totalCatValue;
        if (unallocAmt <= 0) return null;
        const unallocPct = allocated_amount > 0 ? Math.round((unallocAmt / allocated_amount) * 100) : 0;
        return (
          <SectionUnallocatedBanner
            unallocatedPercent={unallocPct}
            unallocatedAmount={unallocAmt}
            currency={currency}
            sectionId={section.id}
            categories={[
              ...categories.map((c) => ({
                id: c.category.id,
                name: c.category.name,
                icon: c.category.icon,
                allocation_value: c.category.allocation_value,
                sectionId: section.id,
              })),
              ...linkedCategories.map((lc) => ({
                id: lc.categorySummary.category.id,
                name: lc.categorySummary.category.name,
                icon: lc.categorySummary.category.icon,
                allocation_value: lc.categorySummary.category.allocation_value,
                sectionId: lc.link.source_section_id,
                sourceBudgetId: lc.link.source_budget_id,
              })),
            ]}
            onCreateCategory={() => {
              setCategoryPrefillAmount(unallocAmt);
              setAddCategoryOpen(true);
            }}
            onTrimSection={async () => {
              await updateSection(section.id, { allocation_value: totalCatValue });
              await refreshSummary();
            }}
            trimTargetValue={totalCatValue}
          />
        );
      })()}

      {/* Per-person spending (section level) */}
      {mergedSpendingByUser.length > 0 && (
        <div className="border-2 border-foreground bg-card p-5 sm:p-6">
          <SpendingByUser
            spendingByUser={mergedSpendingByUser}
            totalSpent={effectiveSpent}
            currency={currency}
          />
        </div>
      )}

      {/* Charts — always show SpendingChart */}
      {effectiveSpent > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart expenses={sectionExpenses} currency={currency} />
          </div>
          <div>
            <BreakdownChart summary={summary} sectionId={params.sectionId} />
          </div>
        </div>
      ) : (
        <SpendingChart expenses={sectionExpenses} currency={currency} />
      )}

      {/* Desglose por categorías */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-2">
          <h2 className="text-base font-bold uppercase tracking-widest">
            {tSection("categories")} · {totalCategoryCount}
          </h2>
          <button
            type="button"
            onClick={() => {
              setCategoryPrefillAmount(undefined);
              setAddCategoryOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {tSection("addCategory")}
          </button>
        </div>

        {displayCats.length === 0 ? (
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
              onClick={() => {
                setCategoryPrefillAmount(allocated_amount * 0.3);
                setAddCategoryOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
            >
              <Plus className="size-3.5" />
              {tSection("addCategory")}
            </button>
          </div>
        ) : (
          displayCats.map((item, idx) => {
            if (item.type === "own") {
              const cat = item.cat;
              const catPct = getPercentage(cat.total_spent, cat.allocated_amount);
              const catProgressColor = getProgressColor(catPct);
              const catTextColor = getProgressTextColor(catPct);
              const catRemaining = cat.allocated_amount - cat.total_spent;

              return (
                <div key={item.id} className={cn("border-2 border-foreground bg-card transition-opacity", dragId === item.id && "opacity-50")} draggable={displayCats.length > 1} onDragStart={(e) => handleDragStart(e, item.id)} onDragOver={(e) => handleDragOver(e, item.id)} onDrop={(e) => handleDrop(e)} onDragEnd={handleDragEnd}>
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
                        {displayCats.length > 1 && (
                          <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-foreground transition-colors" aria-label="Drag to reorder">
                            <GripVertical className="size-5" />
                          </div>
                        )}
                      </div>
                      <div className="mb-4 pb-4 border-b border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                            {formatCurrency(cat.allocated_amount, currency)}
                          </p>
                          <span className="text-sm font-bold font-mono text-muted-foreground">
                            {allocated_amount > 0 ? Math.round((cat.category.allocation_value / allocated_amount) * 100) : 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-base font-mono tabular-nums text-muted-foreground">
                            {formatCurrency(cat.total_spent, currency)} {t("spent").toLowerCase()}
                          </p>
                          <span className={cn("text-sm font-bold font-mono tabular-nums", catTextColor)}>
                            {catPct}% {tDash("used")}
                          </span>
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
                        <div className="flex items-baseline justify-end gap-2">
                          <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                            {formatCurrency(cat.allocated_amount, currency)}
                          </p>
                          <span className="text-sm font-bold font-mono text-muted-foreground">
                            {allocated_amount > 0 ? Math.round((cat.category.allocation_value / allocated_amount) * 100) : 0}%
                          </span>
                        </div>
                        <p className={cn("text-sm font-semibold tabular-nums font-mono mt-1", catTextColor)}>
                          {formatCurrency(cat.total_spent, currency)} · {catPct}% {tDash("used")}
                        </p>
                      </div>
                      {displayCats.length > 1 && (
                        <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-foreground transition-colors" aria-label="Drag to reorder">
                          <GripVertical className="size-5" />
                        </div>
                      )}
                    </div>

                    {/* Remaining row */}
                    <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
                      <span>
                        {t("remaining")}:{" "}
                        <span className={cn(
                          "font-bold font-mono tabular-nums",
                          catRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                        )}>
                          {catRemaining < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(catRemaining), currency)}
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

                    {/* Per-person spending (category level) */}
                    {cat.spending_by_user && cat.spending_by_user.length > 0 && (
                      <SpendingByUser
                        spendingByUser={cat.spending_by_user}
                        totalSpent={cat.total_spent}
                        currency={currency}
                        compact
                      />
                    )}
                  </div>
                </div>
              );
            }

            // Linked category
            const lc = item.lc;
            const lcat = lc.categorySummary;
            const lcPct = getPercentage(lcat.total_spent, lcat.allocated_amount);
            const lcProgressColor = getProgressColor(lcPct);
            const lcTextColor = getProgressTextColor(lcPct);
            const lcRemaining = lcat.allocated_amount - lcat.total_spent;

            return (
              <div key={item.id} className={cn("border-2 border-foreground/50 border-dashed bg-card transition-opacity", dragId === item.id && "opacity-50")} draggable={displayCats.length > 1} onDragStart={(e) => handleDragStart(e, item.id)} onDragOver={(e) => handleDragOver(e, item.id)} onDrop={(e) => handleDrop(e)} onDragEnd={handleDragEnd}>
                <div className="p-5 sm:p-7">
                  {/* Linked badge */}
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Link2 className="size-3.5" />
                    <span className="font-bold">
                      {tl("linkedFrom", { name: lc.sourceBudgetName })}
                    </span>
                  </div>

                  {/* Mobile layout */}
                  <div className="sm:hidden">
                    <div className="flex items-center gap-3 mb-4">
                      <CategoryIcon iconKey={lcat.category.icon} className="size-6" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-foreground">{lcat.category.name}</p>
                      </div>
                      {displayCats.length > 1 && (
                        <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-foreground transition-colors" aria-label="Drag to reorder">
                          <GripVertical className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="mb-4 pb-4 border-b border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                          {formatCurrency(lcat.allocated_amount, currency)}
                        </p>
                        <span className="text-sm font-bold font-mono text-muted-foreground">
                          {allocated_amount > 0 ? Math.round((lcat.category.allocation_value / allocated_amount) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-mono tabular-nums text-muted-foreground">
                          {formatCurrency(lcat.total_spent, currency)} {t("spent").toLowerCase()}
                        </p>
                        <span className={cn("text-sm font-bold font-mono tabular-nums", lcTextColor)}>
                          {lcPct}% {tDash("used")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${lcat.category.id}`)}
                        className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
                      >
                        <BarChart3 className="size-3.5" />
                        {tActions("reports")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLinkedCat({ cat: lcat, link: lc.link, sourceName: lc.sourceBudgetName })}
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
                      <CategoryIcon iconKey={lcat.category.icon} className="size-6" />
                      <div>
                        <p className="text-lg font-semibold text-foreground">{lcat.category.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mr-6">
                      <button
                        type="button"
                        onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${lcat.category.id}`)}
                        className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
                      >
                        <BarChart3 className="size-3.5" />
                        {tActions("reports")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLinkedCat({ cat: lcat, link: lc.link, sourceName: lc.sourceBudgetName })}
                        className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
                      >
                        <Settings className="size-3.5" />
                        {tActions("adjust")}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                          {formatCurrency(lcat.allocated_amount, currency)}
                        </p>
                        <span className="text-sm font-bold font-mono text-muted-foreground">
                          {allocated_amount > 0 ? Math.round((lcat.category.allocation_value / allocated_amount) * 100) : 0}%
                        </span>
                      </div>
                      <p className={cn("text-sm font-semibold tabular-nums font-mono mt-1", lcTextColor)}>
                        {formatCurrency(lcat.total_spent, currency)} · {lcPct}% {tDash("used")}
                      </p>
                    </div>
                    {displayCats.length > 1 && (
                      <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-foreground transition-colors" aria-label="Drag to reorder">
                        <GripVertical className="size-5" />
                      </div>
                    )}
                  </div>

                  {/* Remaining row */}
                  <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
                    <span>
                      {t("remaining")}:{" "}
                      <span className={cn(
                        "font-bold font-mono tabular-nums",
                        lcRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                      )}>
                        {lcRemaining < 0 ? "-" : ""}
                        {formatCurrency(Math.abs(lcRemaining), currency)}
                      </span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-3 w-full overflow-hidden bg-muted">
                      <div
                        className={cn("h-full transition-all duration-300", lcProgressColor)}
                        style={{ width: `${Math.min(lcPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {lcat.spending_by_user && lcat.spending_by_user.length > 0 && (
                    <SpendingByUser
                      spendingByUser={lcat.spending_by_user}
                      totalSpent={lcat.total_spent}
                      currency={currency}
                      compact
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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
        onOpenChange={(open) => {
          setAddCategoryOpen(open);
          if (!open) setCategoryPrefillAmount(undefined);
        }}
        prefillAmount={categoryPrefillAmount}
      />
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        budgetId={params.id}
        categories={expenseDialogCategories}
        currency={currency}
        preselectedCategoryId={categories.length > 0 ? categories[0].category.id : undefined}
        linkedCategoryBudgetMap={linkedCategoryBudgetMap}
      />
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
