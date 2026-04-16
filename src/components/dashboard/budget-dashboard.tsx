"use client";

import { useState, useMemo, useCallback } from "react";
import { useFlipList } from "@/hooks/use-flip-list";
import dynamic from "next/dynamic";
import { RefreshCw, Settings, Plus, ArrowLeft } from "lucide-react";
import { useBudgetStore } from "@/store/budget-store";
import { useTranslations } from "@/i18n/client";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";
import { OverviewCards } from "./overview-cards";
import { SectionCard, type LinkedCategoryItem } from "./section-card";
import { SpendingByUser } from "./spending-by-user";
import { BudgetUnallocatedBanner } from "./unallocated-banner";
import { BudgetResume } from "./budget-resume";
import { EmptyDashboard } from "./empty-dashboard";
import { BILLING_PERIODS } from "@/types/budget";
import type { Expense, Section as SectionType, SectionSummary, BudgetLink, Budget } from "@/types/budget";
import { AddSectionDialog } from "@/components/budget/add-section-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import Link from "next/link";
import { useDisplayOrder } from "@/hooks/use-display-order";

// Lazy-load chart components (they import recharts which is heavy)
const SpendingChart = dynamic(
  () => import("./spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  {
    loading: () => (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

const BreakdownChart = dynamic(
  () => import("./breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  {
    loading: () => (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

// Types for merged section data
interface MergedSection {
  sectionSummary: SectionSummary;
  linkedInfo?: {
    link: BudgetLink;
    source_budget: Budget;
  };
  linkedCategories: LinkedCategoryItem[];
}

interface BudgetDashboardProps {
  budgetId: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-7 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Category cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetDashboard({ budgetId }: BudgetDashboardProps) {
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);
  const linkedExpensesFromStore = useBudgetStore((s) => s.linkedExpenses);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);
  const loading = useBudgetStore((s) => s.loading);
  const error = useBudgetStore((s) => s.error);
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionPrefillAmount, setSectionPrefillAmount] = useState<number | undefined>(undefined);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // Linked expense state: when adding expense to a linked section
  const [linkedExpenseOpen, setLinkedExpenseOpen] = useState(false);
  const [linkedExpenseSourceBudgetId, setLinkedExpenseSourceBudgetId] = useState<string | null>(null);
  const [linkedExpensePreselectedCategoryId, setLinkedExpensePreselectedCategoryId] = useState<string | undefined>(undefined);

  const sections = summary?.sections ?? [];
  const linkedSections = summary?.linked_sections ?? [];

  // ---------------------------------------------------------------------------
  // Merge linked content inline into sections
  // ---------------------------------------------------------------------------
  const mergedSections = useMemo((): MergedSection[] => {
    // Start with own sections — each gets an empty linkedCategories array.
    const result: MergedSection[] = sections.map((s) => ({
      sectionSummary: s,
      linkedCategories: [],
    }));

    for (const ls of linkedSections) {
      const isCategoryLink = !!ls.link.source_category_id;

      if (!isCategoryLink) {
        // Section-level link → add as a new section entry with linkedInfo
        result.push({
          sectionSummary: {
            section: ls.section,
            categories: ls.categories,
            allocated_amount: ls.section.allocation_value,
            total_spent: ls.total_spent,
            spending_by_user: ls.spending_by_user,
          },
          linkedInfo: {
            link: ls.link,
            source_budget: ls.source_budget,
          },
          linkedCategories: [],
        });
      } else {
        // Category-level link → find target section and add categories there
        const targetSectionId = ls.link.target_section_id;
        const targetEntry = targetSectionId
          ? result.find((m) => m.sectionSummary.section.id === targetSectionId)
          : null;

        if (targetEntry) {
          for (const cat of ls.categories) {
            targetEntry.linkedCategories.push({
              categorySummary: cat,
              link: ls.link,
              sourceBudgetName: ls.source_budget.name,
            });
          }
        }
      }
    }

    return result;
  }, [sections, linkedSections]);

  // Memoize categoriesMap so ExpenseList doesn't get a new object every render.
  const categoriesMap = useMemo(() => {
    const m = new Map<string, { name: string; icon: string | null; categoryName: string }>();
    for (const sec of sections) {
      for (const cat of sec.categories) {
        m.set(cat.category.id, {
          name: cat.category.name,
          icon: cat.category.icon,
          categoryName: sec.section.name,
        });
      }
    }
    // Also include linked section categories for expense display
    for (const ls of linkedSections) {
      for (const cat of ls.categories) {
        m.set(cat.category.id, {
          name: cat.category.name,
          icon: cat.category.icon,
          categoryName: ls.section.name,
        });
      }
    }
    return m;
  }, [sections, linkedSections]);

  // Memoize the categories list shared by AddExpenseDialog and EditExpenseDialog.
  // Include linked sections so their categories appear in the expense picker.
  const dialogCategories = useMemo(() => {
    const own = sections.map((s) => {
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
  }, [sections, linkedSections]);

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

  // Build categories for linked expense dialog (from the specific linked section being added to).
  const linkedExpenseCategories = useMemo((): SectionType[] => {
    if (!linkedExpenseSourceBudgetId) return [];
    // Find all linked sections from that source budget
    return linkedSections
      .filter((ls) => ls.link.source_budget_id === linkedExpenseSourceBudgetId)
      .map((ls) => ({
        ...ls.section,
        categories: ls.categories.map((c) => c.category),
      }));
  }, [linkedSections, linkedExpenseSourceBudgetId]);

  // Merge own + linked expenses for charts and expense list
  const allExpenses = useMemo(
    () => [...expenses, ...linkedExpensesFromStore],
    [expenses, linkedExpensesFromStore]
  );

  const getMergedSectionId = useCallback(
    (m: MergedSection) => m.linkedInfo ? `linked-${m.linkedInfo.link.id}` : m.sectionSummary.section.id,
    []
  );
  const { ordered: orderedSections, moveUp: moveSectionUp, moveDown: moveSectionDown } = useDisplayOrder(
    `budget-${budgetId}-sections`,
    mergedSections,
    getMergedSectionId
  );

  const { ref: sectionListRef, capturePositions: captureSectionPositions } = useFlipList();

  const handleAddLinkedExpense = (sourceBudgetId: string, preselectedCategoryId?: string) => {
    setLinkedExpenseSourceBudgetId(sourceBudgetId);
    setLinkedExpensePreselectedCategoryId(preselectedCategoryId);
    setLinkedExpenseOpen(true);
  };

  // Show loading skeleton only on initial load (no summary and loading)
  if (!summary && loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
            <RefreshCw className="h-6 w-6 text-red-500" strokeWidth={1.8} />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">
            {t("errorLoading")}
          </h3>
          <p className="mb-4 max-w-sm text-base text-muted-foreground">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setActiveBudget(budgetId)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
            {tc("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <EmptyDashboard />;
  }

  const { budget } = summary;
  const billingPeriod = BILLING_PERIODS.find((p) => p.value === budget.billing_period_months);
  const billingLabel = billingPeriod
    ? tc(billingPeriod.labelKey)
    : `${budget.billing_period_months}m`;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/budgets"
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-muted border border-border"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} />
          </Link>
          <div>
            <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: 'var(--text-fluid-xl)' }}>{budget.name}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {budget.currency} &middot; {billingLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="size-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">{t("addExpense")}</span>
          </button>
          <Link
            href={`/budget/${budgetId}/settings`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border border-border"
            aria-label="Budget settings"
          >
            <Settings className="size-4" strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      {/* Overview cards */}
      <OverviewCards summary={summary} />

      {/* Progress bar — matches section + category */}
      {(() => {
        const linkedSpent = linkedSections.reduce((sum, ls) => sum + ls.total_spent, 0);
        const linkedAlloc = linkedSections
          .filter((ls) => !ls.link.source_category_id)
          .reduce((sum, ls) => sum + ls.section.allocation_value, 0);
        const effectiveBudget = summary.total_budget + linkedAlloc;
        const effectiveSpent = summary.total_spent + linkedSpent;
        const pct = effectiveBudget > 0 ? Math.round((effectiveSpent / effectiveBudget) * 100) : 0;
        const pc = pct >= 100 ? "bg-red-600" : pct >= 75 ? "bg-yellow-500" : "bg-emerald-600";
        const tc2 = pct >= 100 ? "text-red-600 dark:text-red-400" : pct >= 75 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600";
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-sm font-medium text-muted-foreground">{t("ofBudgetUsed")}</span>
              <span className={cn("font-semibold tabular-nums", tc2)}>{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full transition-all duration-300", pc)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Unallocated budget notification */}
      {(() => {
        const linkedSectionAlloc = linkedSections
          .filter(ls => !ls.link.source_category_id)
          .reduce((sum, ls) => sum + ls.section.allocation_value, 0);
        const totalAllocated = sections.reduce((sum, s) => sum + s.section.allocation_value, 0) + linkedSectionAlloc;
        const unallocatedAmt = budget.monthly_income - totalAllocated;
        if (unallocatedAmt <= 0) return null;
        const unallocatedPct = budget.monthly_income > 0 ? Math.round((unallocatedAmt / budget.monthly_income) * 100) : 0;
        return (
          <BudgetUnallocatedBanner
            unallocatedPercent={unallocatedPct}
            unallocatedAmount={unallocatedAmt}
            currency={budget.currency}
            sections={sections.map((s) => ({
              id: s.section.id,
              name: s.section.name,
              icon: s.section.icon,
              allocation_value: s.section.allocation_value,
            }))}
            onCreateSection={() => {
              setSectionPrefillAmount(unallocatedAmt);
              setAddSectionOpen(true);
            }}
          />
        );
      })()}

      {/* Per-person spending (shared budgets only) */}
      {summary.spending_by_user && summary.spending_by_user.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <SpendingByUser
            spendingByUser={summary.spending_by_user}
            totalSpent={summary.total_spent}
            currency={budget.currency}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 [&>*]:h-full">
          <SpendingChart expenses={allExpenses} currency={budget.currency} />
        </div>
        <div className="[&>*]:h-full">
          <BreakdownChart summary={summary} />
        </div>
      </div>

      {/* Section breakdown — merged: own sections + linked sections inline */}
      {mergedSections.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("categoryBreakdown")}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const linkedSectionAlloc = linkedSections
                    .filter(ls => !ls.link.source_category_id)
                    .reduce((sum, ls) => sum + ls.section.allocation_value, 0);
                  const totalAllocated = sections.reduce((sum, s) => sum + s.section.allocation_value, 0) + linkedSectionAlloc;
                  const remainingAmt = Math.max(0, budget.monthly_income - totalAllocated);
                  setSectionPrefillAmount(remainingAmt > 0 ? remainingAmt : undefined);
                  setAddSectionOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
                {t("addSection")}
              </button>
            </div>
          </div>
          <div ref={sectionListRef} className="space-y-4 sm:space-y-5">
            {orderedSections.map((merged, idx) => {
              const sectionKey = getMergedSectionId(merged);
              return (
                <div key={sectionKey} data-flip-key={sectionKey}>
                  <SectionCard
                    sectionSummary={merged.sectionSummary}
                    currency={budget.currency}
                    budgetId={budgetId}
                    linkedInfo={merged.linkedInfo}
                    linkedCategories={merged.linkedCategories}
                    onAddLinkedExpense={handleAddLinkedExpense}
                    onMoveUp={orderedSections.length > 1 && idx > 0 ? () => { captureSectionPositions(); moveSectionUp(sectionKey); } : undefined}
                    onMoveDown={orderedSections.length > 1 && idx < orderedSections.length - 1 ? () => { captureSectionPositions(); moveSectionDown(sectionKey); } : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t("noSectionsYet")}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
            {t("noSectionsHint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setSectionPrefillAmount(budget.monthly_income * 0.3);
              setAddSectionOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" strokeWidth={1.8} />
            {t("addFirstSection")}
          </button>
        </div>
      )}

      {/* Expense list */}
      {allExpenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("recentExpenses")}
            </h2>
          </div>
          <ExpenseList
            expenses={allExpenses}
            currency={budget.currency}
            categoriesMap={categoriesMap}
            onEdit={(exp) => setEditingExpense(exp)}
            onDelete={(id) => deleteExpense(id)}
          />
        </div>
      )}

      {/* Budget resume */}
      <BudgetResume budgetId={budgetId} currency={budget.currency} />

      {/* Dialogs */}
      <AddSectionDialog
        budgetId={budgetId}
        open={addSectionOpen}
        onOpenChange={(open) => {
          setAddSectionOpen(open);
          if (!open) setSectionPrefillAmount(undefined);
        }}
        prefillAmount={sectionPrefillAmount}
      />

      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        budgetId={budgetId}
        categories={dialogCategories}
        currency={budget.currency}
        linkedCategoryBudgetMap={linkedCategoryBudgetMap}
      />

      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => { if (!open) setEditingExpense(null); }}
          expense={editingExpense}
          categories={dialogCategories}
          currency={budget.currency}
        />
      )}

      {/* Linked expense dialog — routes to source budget */}
      {linkedExpenseSourceBudgetId && (
        <AddExpenseDialog
          open={linkedExpenseOpen}
          onOpenChange={(open) => {
            setLinkedExpenseOpen(open);
            if (!open) {
              setLinkedExpenseSourceBudgetId(null);
              setLinkedExpensePreselectedCategoryId(undefined);
            }
          }}
          budgetId={budgetId}
          sourceBudgetId={linkedExpenseSourceBudgetId}
          categories={linkedExpenseCategories}
          currency={budget.currency}
          preselectedCategoryId={linkedExpensePreselectedCategoryId}
        />
      )}
    </div>
  );
}
