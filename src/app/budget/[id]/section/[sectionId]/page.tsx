"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft, Plus, Settings } from "lucide-react";
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
import type { Category, Expense } from "@/types/budget";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-64 animate-pulse bg-muted" /></div> }
);
const BreakdownChart = dynamic(
  () => import("@/components/dashboard/breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  { ssr: false, loading: () => <div className="border-2 border-foreground bg-card p-6"><div className="h-64 animate-pulse bg-muted" /></div> }
);

export default function SectionPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const expenses = useBudgetStore((s) => s.expenses);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);
  const mode = useAuthStore((s) => s.mode);
  const budgetBase = mode === "local" ? "localBudget" : "budget";

  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const sectionSummary = summary?.sections.find(
    (c) => c.section.id === params.sectionId
  );

  useEffect(() => {
    if (summary && !sectionSummary) {
      router.push(`/${budgetBase}/${params.id}`);
    }
  }, [summary, sectionSummary, router, budgetBase, params.id]);

  if (!summary || !sectionSummary) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const { section, categories: subcategories, allocated_amount, total_spent } = sectionSummary;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

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
            className="mt-1 flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border border-border"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={section.icon} className="size-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{section.name}</h1>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {section.allocation_percent}% del presupuesto
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
            <span className="hidden sm:inline">Agregar Gasto</span>
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Presupuestado</p>
          <p className="text-lg font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Gastado</p>
          <p className={cn("text-lg font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Restante</p>
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
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Uso del presupuesto</span>
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

      {/* Charts — always show SpendingChart, only BreakdownChart when there's spending */}
      {total_spent > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart budgetId={params.id} currency={summary.budget.currency} categoryIds={subcategories.map(s => s.category.id)} />
          </div>
          <div>
            <BreakdownChart summary={summary} sectionId={params.sectionId} />
          </div>
        </div>
      ) : (
        <SpendingChart budgetId={params.id} currency={summary.budget.currency} categoryIds={subcategories.map(s => s.category.id)} />
      )}

      {/* Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
            Categorías
          </h2>
        </div>
        {subcategories.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground py-4 text-center">
            Aún no hay categorías.
          </p>
        ) : (
          <div className="space-y-4">
            {subcategories.map((sub) => {
              const subPct = getPercentage(sub.total_spent, sub.allocated_amount);
              const subProgressColor = getProgressColor(subPct);
              const subTextColor = getProgressTextColor(subPct);
              const subRemaining = sub.allocated_amount - sub.total_spent;

              return (
                <div key={sub.category.id} className="border-2 border-foreground bg-card p-5">
                  {/* Category info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CategoryIcon iconKey={sub.category.icon} className="size-5" />
                      <div>
                        <p className="font-bold text-foreground">{sub.category.name}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {formatCompact(sub.total_spent, summary.budget.currency)} / {formatCompact(sub.allocated_amount, summary.budget.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-bold tabular-nums font-mono", subTextColor)}>
                        {subPct}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subRemaining < 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-bold">excedido</span>
                        ) : (
                          <span>{formatCompact(subRemaining, summary.budget.currency)} restante</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="h-3 w-full overflow-hidden bg-muted mb-4">
                    <div className={cn("h-full", subProgressColor)} style={{ width: `${Math.min(subPct, 100)}%` }} />
                  </div>

                  {/* Action buttons — same style as SectionCard */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/${budgetBase}/${params.id}/section/${params.sectionId}/category/${sub.category.id}`)}
                      className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="size-3.5 rotate-180" />
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubcategory(sub.category)}
                      className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
                    >
                      <Settings className="size-3.5" />
                      Ajustar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expense list for this section */}
      {(() => {
        const catIds = new Set(subcategories.map(s => s.category.id));
        const sectionExpenses = expenses.filter(e => catIds.has(e.category_id));
        if (sectionExpenses.length === 0) return null;
        const subMap = new Map<string, { name: string; icon: string | null; categoryName: string }>();
        for (const sec of summary.sections) {
          for (const cat of sec.categories) {
            subMap.set(cat.category.id, { name: cat.category.name, icon: cat.category.icon, categoryName: sec.section.name });
          }
        }
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold border-b border-border pb-2">Gastos</h2>
            <ExpenseList
              expenses={sectionExpenses}
              currency={summary.budget.currency}
              subcategories={subMap}
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
        preselectedSubcategoryId={subcategories.length > 0 ? subcategories[0].category.id : undefined}
      />

      {/* Edit dialogs */}
      <EditSectionDialog
        section={section}
        categories={subcategories.map((s) => s.category)}
        open={editSectionOpen}
        onOpenChange={setEditSectionOpen}
      />
      {editingSubcategory && (
        <EditCategoryDialog
          sectionId={section.id}
          category={editingSubcategory}
          parentSection={section}
          siblingCategories={subcategories.map((s) => s.category)}
          open={!!editingSubcategory}
          onOpenChange={(open) => {
            if (!open) setEditingSubcategory(null);
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
