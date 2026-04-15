"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, Settings, Plus, ArrowLeft, Link2 } from "lucide-react";
import { useBudgetStore } from "@/store/budget-store";
import { useTranslations } from "@/i18n/client";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";
import { OverviewCards } from "./overview-cards";
import { SectionCard } from "./section-card";
import { LinkedSectionCard } from "./linked-section-card";
import { SpendingByUser } from "./spending-by-user";
import { BudgetUnallocatedBanner } from "./unallocated-banner";
import { BudgetResume } from "./budget-resume";
import { EmptyDashboard } from "./empty-dashboard";
import { BILLING_PERIODS } from "@/types/budget";
import type { Expense, Section as SectionType } from "@/types/budget";
import { AddSectionDialog } from "@/components/budget/add-section-dialog";
import { CreateLinkDialog } from "@/components/budget/create-link-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import Link from "next/link";

// Lazy-load chart components (they import recharts which is heavy)
const SpendingChart = dynamic(
  () => import("./spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  {
    loading: () => (
      <div className="border-2 border-foreground bg-card p-6">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 h-64 animate-pulse bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

const BreakdownChart = dynamic(
  () => import("./breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  {
    loading: () => (
      <div className="border-2 border-foreground bg-card p-6">
        <div className="h-4 w-28 animate-pulse bg-muted" />
        <div className="mt-4 h-64 animate-pulse bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

interface BudgetDashboardProps {
  budgetId: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse bg-muted" />
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-7 w-28 animate-pulse bg-muted" />
              <div className="h-3 w-20 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-2 border-foreground bg-card p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
        <div className="border-2 border-foreground bg-card p-6">
          <div className="h-4 w-28 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
      </div>

      {/* Category cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 animate-pulse bg-muted" />
                  <div className="h-3 w-16 animate-pulse bg-muted" />
                </div>
              </div>
              <div className="h-4 w-10 animate-pulse bg-muted" />
            </div>
            <div className="mt-4 h-4 w-full animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetDashboard({ budgetId }: BudgetDashboardProps) {
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);
  const loading = useBudgetStore((s) => s.loading);
  const error = useBudgetStore((s) => s.error);
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tl = useTranslations("links");
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionPrefillAmount, setSectionPrefillAmount] = useState<number | undefined>(undefined);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  // Linked expense state: when adding expense to a linked section
  const [linkedExpenseOpen, setLinkedExpenseOpen] = useState(false);
  const [linkedExpenseSourceBudgetId, setLinkedExpenseSourceBudgetId] = useState<string | null>(null);
  const [linkedExpensePreselectedCategoryId, setLinkedExpensePreselectedCategoryId] = useState<string | undefined>(undefined);

  const sections = summary?.sections ?? [];
  const linkedSections = summary?.linked_sections ?? [];

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
  const dialogCategories = useMemo(
    () =>
      sections.map((s) => ({
        ...s.section,
        categories: s.categories.map((c) => c.category),
      })),
    [sections]
  );

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

  const handleAddLinkedExpense = (sourceBudgetId: string, preselectedCategoryId?: string) => {
    setLinkedExpenseSourceBudgetId(sourceBudgetId);
    setLinkedExpensePreselectedCategoryId(preselectedCategoryId);
    setLinkedExpenseOpen(true);
  };

  // Show loading skeleton only on initial load (no summary and loading)
  // Once summary exists, show content even if still loading (e.g., refreshing data)
  if (!summary && loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-red-500 bg-red-50 dark:bg-red-950/30">
            <RefreshCw className="h-6 w-6 text-red-500" />
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
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
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
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-foreground transition-colors duration-200 hover:bg-foreground hover:text-background border-2 border-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
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
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{t("addExpense")}</span>
          </button>
          <Link
            href={`/budget/${budgetId}/settings`}
            className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border-2 border-foreground"
            aria-label="Budget settings"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>

      {/* Overview cards */}
      <OverviewCards summary={summary} />

      {/* Progress bar — matches section + category */}
      {(() => {
        const pct = summary.total_budget > 0 ? Math.round((summary.total_spent / summary.total_budget) * 100) : 0;
        const pc = pct >= 100 ? "bg-red-600" : pct >= 75 ? "bg-yellow-500" : "bg-emerald-600";
        const tc2 = pct >= 100 ? "text-red-600 dark:text-red-400" : pct >= 75 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600";
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t("ofBudgetUsed")}</span>
              <span className={cn("font-bold tabular-nums font-mono", tc2)}>{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden bg-muted">
              <div className={cn("h-full transition-all duration-300", pc)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Unallocated budget notification */}
      {(() => {
        const totalAllocated = sections.reduce((sum, s) => sum + s.section.allocation_percent, 0);
        const unallocatedPct = parseFloat((100 - totalAllocated).toFixed(2));
        if (unallocatedPct <= 0) return null;
        const unallocatedAmt = (unallocatedPct / 100) * budget.monthly_income;
        return (
          <BudgetUnallocatedBanner
            unallocatedPercent={unallocatedPct}
            unallocatedAmount={unallocatedAmt}
            currency={budget.currency}
            sections={sections.map((s) => ({
              id: s.section.id,
              name: s.section.name,
              icon: s.section.icon,
              allocation_percent: s.section.allocation_percent,
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
        <div className="border-2 border-foreground bg-card p-5 sm:p-6">
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
          <SpendingChart expenses={expenses} currency={budget.currency} />
        </div>
        <div className="[&>*]:h-full">
          <BreakdownChart summary={summary} />
        </div>
      </div>

      {/* Section breakdown */}
      {sections.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("categoryBreakdown")}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCreateLinkOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <Link2 className="size-3.5" />
                {tl("linkSection")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const totalAllocated = sections.reduce((sum, s) => sum + s.section.allocation_percent, 0);
                  const remainingAmt = Math.max(0, ((100 - totalAllocated) / 100) * budget.monthly_income);
                  setSectionPrefillAmount(remainingAmt > 0 ? remainingAmt : undefined);
                  setAddSectionOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3.5" />
                {t("addSection")}
              </button>
            </div>
          </div>
          <div className="space-y-4 sm:space-y-5">
            {sections.map((cat) => (
              <SectionCard
                key={cat.section.id}
                sectionSummary={cat}
                currency={budget.currency}
                budgetId={budgetId}
              />
            ))}
          </div>

          {/* Linked sections */}
          {linkedSections.length > 0 && (
            <div className="space-y-4 sm:space-y-5 mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {tl("linkedSections")}
              </h3>
              {linkedSections.map((ls) => (
                <LinkedSectionCard
                  key={ls.link.id}
                  linked={ls}
                  currency={budget.currency}
                  onAddExpense={handleAddLinkedExpense}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center border-2 border-foreground bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" />
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t("addFirstSection")}
          </button>
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("recentExpenses")}
            </h2>
          </div>
          <ExpenseList
            expenses={expenses}
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
      />

      {editingExpense && (
        <EditExpenseDialog
          open={!!editingExpense}
          onOpenChange={(open) => { if (!open) setEditingExpense(null); }}
          budgetId={budgetId}
          expense={editingExpense}
          categories={dialogCategories}
          currency={budget.currency}
        />
      )}

      <CreateLinkDialog
        budgetId={budgetId}
        open={createLinkOpen}
        onOpenChange={setCreateLinkOpen}
      />

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
