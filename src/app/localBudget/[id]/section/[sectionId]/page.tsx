"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import type { Category } from "@/types/budget";

export default function SectionPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const { summary } = useBudgetStore();
  const { mode } = useAuthStore();
  const budgetBase = mode === "local" ? "localBudget" : "budget";

  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Category | null>(null);

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const sectionSummary = summary.categories.find(
    (c) => c.category.id === params.sectionId
  );

  if (!sectionSummary) {
    router.push(`/${budgetBase}/${params.id}`);
    return null;
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${budgetBase}/${params.id}`)}
          className="shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-3xl">{section.icon || "📁"}</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{section.name}</h1>
            <p className="text-sm text-muted-foreground">
              {section.allocation_percent}% of total budget
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditSectionOpen(true)}
          className="shrink-0"
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-lg font-bold tabular-nums">
              {formatCompact(allocated_amount, summary.budget.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className={cn("text-lg font-bold tabular-nums", textColor)}>
              {formatCompact(total_spent, summary.budget.currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                remaining < 0 ? "text-destructive" : "text-emerald-600"
              )}
            >
              {remaining < 0 ? "-" : ""}
              {formatCompact(Math.abs(remaining), summary.budget.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Used</span>
          <span className={cn("font-medium tabular-nums", textColor)}>
            {percentage}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-300", progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Subcategories */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Subcategories</h2>
        {subcategories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No subcategories yet.
          </p>
        ) : (
          subcategories.map((sub) => {
            const subPct = getPercentage(sub.total_spent, sub.allocated_amount);
            const subProgressColor = getProgressColor(subPct);
            const subTextColor = getProgressTextColor(subPct);
            const subRemaining = sub.allocated_amount - sub.total_spent;

            return (
              <Card
                key={sub.category.id}
                className="group cursor-pointer transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4">
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
                        {sub.category.icon || "📌"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{sub.category.name}</span>
                          <div className="flex items-center gap-2 text-sm shrink-0 ml-2">
                            <span className="text-muted-foreground tabular-nums">
                              {formatCompact(sub.total_spent, summary.budget.currency)}
                              {" / "}
                              {formatCompact(sub.allocated_amount, summary.budget.currency)}
                            </span>
                            <span className={cn("font-semibold tabular-nums min-w-[2.5rem] text-right", subTextColor)}>
                              {subPct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", subProgressColor)}
                            style={{ width: `${Math.min(subPct, 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {subRemaining < 0 ? (
                            <span className="text-destructive">
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
                      className="shrink-0 flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      aria-label={`Edit ${sub.category.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
