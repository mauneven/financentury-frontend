"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFlipList } from "@/hooks/use-flip-list";
import dynamic from "next/dynamic";
import { RefreshCw, Settings, Plus, ArrowLeft } from "lucide-react";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";
import { OverviewCards } from "./overview-cards";
import { CategoryCard } from "./category-card";
import { LinkedCategoryCard } from "./linked-category-card";
import { SpendingByUser } from "./spending-by-user";
import { BudgetUnallocatedBanner } from "./unallocated-banner";
import { BudgetResume } from "./budget-resume";
import { EmptyDashboard } from "./empty-dashboard";
import { BILLING_PERIODS, MAX_CATEGORIES_PER_BUDGET } from "@/types/budget";
import type {
  Expense,
  CategorySummary,
  LinkedCategorySummary,
  Category,
} from "@/types/budget";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { ExpenseList } from "@/components/expenses/expense-list";
import Link from "next/link";
import { useDisplayOrder } from "@/hooks/use-display-order";

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

// Merged item — a single entry in the flat category list, either owned or linked.
type MergedCategory =
  | { type: "own"; id: string; summary: CategorySummary }
  | { type: "linked"; id: string; linked: LinkedCategorySummary };

interface BudgetDashboardProps {
  budgetId: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>

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
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryPrefillAmount, setCategoryPrefillAmount] = useState<number | undefined>(undefined);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [linkedExpenseOpen, setLinkedExpenseOpen] = useState(false);
  const [linkedExpenseSourceBudgetId, setLinkedExpenseSourceBudgetId] = useState<string | null>(null);
  const [linkedExpensePreselectedCategoryId, setLinkedExpensePreselectedCategoryId] = useState<string | undefined>(undefined);

  // Narrow via useMemo — `??` on a selector returns a fresh array every render,
  // which would cascade into every downstream useMemo below.
  const categories = useMemo(() => summary?.categories ?? [], [summary]);
  const linkedCategories = useMemo(
    () => summary?.linked_categories ?? [],
    [summary]
  );

  // Total count is own + linked (for the 50-cap).
  const totalCategoryCount = categories.length + linkedCategories.length;
  const atCap = totalCategoryCount >= MAX_CATEGORIES_PER_BUDGET;

  // Merge own + linked into a single flat list.
  const mergedCategories = useMemo((): MergedCategory[] => {
    const own: MergedCategory[] = categories.map((c) => ({
      type: "own",
      id: c.category.id,
      summary: c,
    }));
    const linked: MergedCategory[] = linkedCategories.map((l) => ({
      type: "linked",
      id: `linked-${l.link.id}`,
      linked: l,
    }));
    return [...own, ...linked];
  }, [categories, linkedCategories]);

  // Categories map for the expense list (for icon + name resolution).
  const categoriesMap = useMemo(() => {
    const m = new Map<string, { name: string; icon: string | null; categoryName: string }>();
    for (const c of categories) {
      m.set(c.category.id, {
        name: c.category.name,
        icon: c.category.icon,
        categoryName: c.category.name,
      });
    }
    for (const l of linkedCategories) {
      m.set(l.category.category.id, {
        name: l.category.category.name,
        icon: l.category.category.icon,
        categoryName: l.category.category.name,
      });
    }
    return m;
  }, [categories, linkedCategories]);

  // Flat list for the expense dialog (own + linked categories combined).
  const dialogCategories = useMemo((): Category[] => {
    const ownCats = categories.map((c) => c.category);
    const linkedCats = linkedCategories.map((l) => l.category.category);
    return [...ownCats, ...linkedCats];
  }, [categories, linkedCategories]);

  const linkedCategoryBudgetMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of linkedCategories) {
      m.set(l.category.category.id, l.link.source_budget_id);
    }
    return m;
  }, [linkedCategories]);

  // Categories available for a linked-expense flow (scoped to one source budget).
  const linkedExpenseCategories = useMemo((): Category[] => {
    if (!linkedExpenseSourceBudgetId) return [];
    return linkedCategories
      .filter((l) => l.link.source_budget_id === linkedExpenseSourceBudgetId)
      .map((l) => l.category.category);
  }, [linkedCategories, linkedExpenseSourceBudgetId]);

  const allExpenses = useMemo(
    () => [...expenses, ...linkedExpensesFromStore],
    [expenses, linkedExpensesFromStore]
  );

  // Map user_id -> display name for expense attribution on shared budgets.
  const currentUserId = useAuthStore((s) => s.user?.id);
  const collaboratorsMap = useMemo(() => {
    const m = new Map<string, { name: string }>();
    for (const u of summary?.spending_by_user ?? []) {
      const name = u.profile?.full_name?.trim() || u.profile?.email || "";
      if (name) m.set(u.user_id, { name });
    }
    return m;
  }, [summary?.spending_by_user]);

  const getMergedCategoryId = useCallback((m: MergedCategory) => m.id, []);
  const {
    ordered: orderedCategories,
    moveUp: moveCategoryUp,
    moveDown: moveCategoryDown,
    moveTo: moveCategoryTo,
  } = useDisplayOrder(
      `budget-${budgetId}-categories`,
      mergedCategories,
      getMergedCategoryId
    );

  const { ref: categoryListRef, capturePositions: captureCategoryPositions } = useFlipList();

  const handleAddLinkedExpense = (sourceBudgetId: string, preselectedCategoryId?: string) => {
    setLinkedExpenseSourceBudgetId(sourceBudgetId);
    setLinkedExpensePreselectedCategoryId(preselectedCategoryId);
    setLinkedExpenseOpen(true);
  };

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

      <OverviewCards summary={summary} />

      {/* Progress bar — budget envelope = monthly_income (linked don't inflate). */}
      {(() => {
        const effectiveBudget = summary.total_budget;
        const effectiveSpent = summary.total_spent;
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

      {/* Unallocated budget banner — linked categories count toward allocation. */}
      {(() => {
        const ownAllocated = categories.reduce(
          (sum, c) => sum + c.category.allocation_value,
          0
        );
        const linkedAllocated = linkedCategories.reduce(
          (sum, l) => sum + l.category.category.allocation_value,
          0
        );
        const totalAllocated = ownAllocated + linkedAllocated;
        const unallocatedAmt = budget.monthly_income - totalAllocated;
        if (unallocatedAmt <= 0) return null;
        const unallocatedPct = budget.monthly_income > 0
          ? Math.round((unallocatedAmt / budget.monthly_income) * 100)
          : 0;
        return (
          <BudgetUnallocatedBanner
            unallocatedPercent={unallocatedPct}
            unallocatedAmount={unallocatedAmt}
            currency={budget.currency}
            categories={categories.map((c) => ({
              id: c.category.id,
              name: c.category.name,
              icon: c.category.icon,
              allocation_value: c.category.allocation_value,
            }))}
            onCreateCategory={() => {
              setCategoryPrefillAmount(unallocatedAmt);
              setAddCategoryOpen(true);
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

      {/* Category list */}
      {mergedCategories.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("categoryBreakdown")}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalCategoryCount} / {MAX_CATEGORIES_PER_BUDGET}
              </span>
              <button
                type="button"
                onClick={() => {
                  const ownAllocated = categories.reduce(
                    (sum, c) => sum + c.category.allocation_value,
                    0
                  );
                  const linkedAllocatedSum = linkedCategories.reduce(
                    (sum, l) => sum + l.category.category.allocation_value,
                    0
                  );
                  const remainingAmt = Math.max(
                    0,
                    budget.monthly_income - ownAllocated - linkedAllocatedSum
                  );
                  setCategoryPrefillAmount(remainingAmt > 0 ? remainingAmt : undefined);
                  setAddCategoryOpen(true);
                }}
                disabled={atCap}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                  atCap
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={atCap ? t("maxCategoriesReached", { max: String(MAX_CATEGORIES_PER_BUDGET) }) : undefined}
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
                {t("addCategory")}
              </button>
            </div>
          </div>
          <DndCategoryGrid
            items={orderedCategories}
            budget={budget}
            budgetId={budgetId}
            onAddLinkedExpense={handleAddLinkedExpense}
            onReorder={(fromIdx, toIdx, id) => {
              captureCategoryPositions();
              // moveTo lives on the hook; use idx difference for moveUp/moveDown
              // fallback is cleaner but moveTo supports absolute index.
              moveCategoryTo(id, toIdx);
              void fromIdx;
            }}
            listRef={categoryListRef}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" strokeWidth={1.8} />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t("noCategoriesYet")}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
            {t("noCategoriesHint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryPrefillAmount(budget.monthly_income * 0.3);
              setAddCategoryOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" strokeWidth={1.8} />
            {t("addFirstCategory")}
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
            collaborators={collaboratorsMap}
            currentUserId={currentUserId}
            onEdit={(exp) => setEditingExpense(exp)}
            onDelete={(id) => deleteExpense(id)}
          />
        </div>
      )}

      <BudgetResume budgetId={budgetId} currency={budget.currency} />

      {/* Dialogs */}
      <AddCategoryDialog
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

// -----------------------------------------------------------------------------
// Drag-and-drop category grid
// -----------------------------------------------------------------------------
interface DndCategoryGridProps {
  items: MergedCategory[];
  budget: { currency: string };
  budgetId: string;
  onAddLinkedExpense: (sourceBudgetId: string, preselectedCategoryId?: string) => void;
  onReorder: (fromIndex: number, toIndex: number, id: string) => void;
  listRef: React.Ref<HTMLDivElement>;
}

function SortableCell({
  id,
  render,
}: {
  id: string;
  render: (handle: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} data-flip-key={id}>
      {render({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown> | undefined,
      })}
    </div>
  );
}

function DndCategoryGrid({
  items,
  budget,
  budgetId,
  onAddLinkedExpense,
  onReorder,
  listRef,
}: DndCategoryGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  const ids = items.map((m) => m.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = ids.indexOf(String(active.id));
    const toIdx = ids.indexOf(String(over.id));
    if (fromIdx < 0 || toIdx < 0) return;
    onReorder(fromIdx, toIdx, String(active.id));
    // local arrayMove not needed — hook persist + re-sort via saved order
    void arrayMove;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div ref={listRef} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((merged) => (
            <SortableCell
              key={merged.id}
              id={merged.id}
              render={(handle) =>
                merged.type === "own" ? (
                  <CategoryCard
                    categorySummary={merged.summary}
                    currency={budget.currency}
                    budgetId={budgetId}
                    dragHandleProps={{
                      ...handle.attributes,
                      ...(handle.listeners ?? {}),
                    }}
                  />
                ) : (
                  <LinkedCategoryCard
                    linked={merged.linked}
                    currency={budget.currency}
                    budgetId={budgetId}
                    onAddExpense={onAddLinkedExpense}
                    dragHandleProps={{
                      ...handle.attributes,
                      ...(handle.listeners ?? {}),
                    }}
                  />
                )
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
