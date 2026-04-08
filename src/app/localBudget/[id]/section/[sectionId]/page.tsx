"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import type { Category } from "@/types/budget";

export default function SectionPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const mode = useAuthStore((s) => s.mode);
  const budgetBase = mode === "local" ? "localBudget" : "budget";

  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Category | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const sectionSummary = summary?.categories.find(
    (c) => c.category.id === params.sectionId
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

  const { category: section, categories: subcategories, allocated_amount, total_spent } = sectionSummary;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/${budgetBase}/${params.id}`)}
          className="shrink-0 flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-3xl">{section.icon || "\ud83d\udcc1"}</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{section.name}</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {section.allocation_percent}% of total budget
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setAddExpenseOpen(true)}
          className="shrink-0 min-h-[44px] font-semibold text-xs"
        >
          <Plus className="size-4 mr-1.5" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Add</span>
        </Button>
        <button
          type="button"
          onClick={() => setEditSectionOpen(true)}
          className="shrink-0 flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Budget</p>
          <p className="text-lg font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Spent</p>
          <p className={cn("text-lg font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, summary.budget.currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Remaining</p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums font-mono",
              remaining < 0 ? "text-destructive" : "text-emerald-600"
            )}
          >
            {remaining < 0 ? "-" : ""}
            {formatCompact(Math.abs(remaining), summary.budget.currency)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Used</span>
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

      {/* Categories */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold border-b border-border pb-2">Categories</h2>
        {subcategories.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground py-4 text-center">
            No categories yet.
          </p>
        ) : (
          subcategories.map((sub) => {
            const subPct = getPercentage(sub.total_spent, sub.allocated_amount);
            const subProgressColor = getProgressColor(subPct);
            const subTextColor = getProgressTextColor(subPct);
            const subRemaining = sub.allocated_amount - sub.total_spent;

            return (
              <div
                key={sub.category.id}
                className="group border-2 border-foreground bg-card transition-colors hover:bg-muted/30"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/${budgetBase}/${params.id}/section/${params.sectionId}/category/${sub.category.id}`
                        )
                      }
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <span className="text-xl shrink-0 mt-0.5">
                        {sub.category.icon || "\ud83d\udccc"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">{sub.category.name}</span>
                          <div className="flex items-center gap-2 text-sm shrink-0 ml-2">
                            <span className="text-muted-foreground tabular-nums font-mono">
                              {formatCompact(sub.total_spent, summary.budget.currency)}
                              {" / "}
                              {formatCompact(sub.allocated_amount, summary.budget.currency)}
                            </span>
                            <span className={cn("font-bold tabular-nums font-mono min-w-[2.5rem] text-right", subTextColor)}>
                              {subPct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-3 w-full overflow-hidden bg-muted">
                          <div
                            className={cn("h-full", subProgressColor)}
                            style={{ width: `${Math.min(subPct, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground font-mono tabular-nums">
                          {subRemaining < 0 ? (
                            <span className="text-destructive font-bold">
                              -{formatCompact(Math.abs(subRemaining), summary.budget.currency)} over budget
                            </span>
                          ) : (
                            <span>
                              {formatCompact(subRemaining, summary.budget.currency)} remaining
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubcategory(sub.category);
                      }}
                      className="shrink-0 flex size-8 items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${sub.category.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        budgetId={params.id}
        categories={summary.categories.map((s) => ({
          ...s.category,
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
    </div>
  );
}
