"use client";

import { useState, useCallback } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CategorySummary, Category, Subcategory } from "@/types/budget";
import {
  formatCurrency,
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { EditSubcategoryDialog } from "@/components/budget/edit-subcategory-dialog";

interface CategoryCardProps {
  categorySummary: CategorySummary;
  currency: string;
  onSubcategoryClick?: (subcategoryId: string) => void;
}

export function CategoryCard({
  categorySummary,
  currency,
  onSubcategoryClick,
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const t = useTranslations("dashboard");

  const { category, subcategories, allocated_amount, total_spent } =
    categorySummary;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <Card className="group shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-6">
        {/* Category header */}
        <div className="flex w-full items-center justify-between min-h-[44px]">
          <button
            type="button"
            onClick={toggleExpanded}
            className="flex flex-1 items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label={category.name}>
                {category.icon || "\ud83d\udcc1"}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {category.allocation_percent}% {t("ofIncome")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-sm font-semibold tabular-nums", textColor)}>
                {percentage}%
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditCategoryOpen(true);
            }}
            className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>

        {/* Budget / Spent / Left summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("budgetLabel")}:{" "}
            <span className="font-medium text-foreground">
              {formatCompact(allocated_amount, currency)}
            </span>
          </span>
          <span>
            {t("spentLabel")}:{" "}
            <span className="font-medium text-foreground">
              {formatCompact(total_spent, currency)}
            </span>
          </span>
          <span>
            {t("leftLabel")}:{" "}
            <span
              className={cn(
                "font-medium",
                remaining < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground"
              )}
            >
              {remaining < 0 ? "-" : ""}
              {formatCompact(Math.abs(remaining), currency)}
            </span>
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                progressColor
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Expandable subcategory list */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-in-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-4 space-y-2 border-t pt-4">
              {subcategories.map((sub) => {
                const subPercentage = getPercentage(
                  sub.total_spent,
                  sub.allocated_amount
                );
                const subProgressColor = getProgressColor(subPercentage);
                const subTextColor = getProgressTextColor(subPercentage);

                return (
                  <div
                    key={sub.subcategory.id}
                    className="group/sub flex items-start gap-1 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-muted/50 min-h-[44px]"
                  >
                    <button
                      type="button"
                      onClick={() => onSubcategoryClick?.(sub.subcategory.id)}
                      className="flex w-full flex-col gap-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base" role="img" aria-label={sub.subcategory.name}>
                            {sub.subcategory.icon || "\ud83d\udccc"}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {sub.subcategory.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="tabular-nums text-muted-foreground">
                            {formatCompact(sub.total_spent, currency)} /{" "}
                            {formatCompact(sub.allocated_amount, currency)}
                          </span>
                          <span
                            className={cn(
                              "min-w-[2.5rem] text-right font-semibold tabular-nums",
                              subTextColor
                            )}
                          >
                            {subPercentage}%
                          </span>
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            subProgressColor
                          )}
                          style={{
                            width: `${Math.min(subPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubcategory(sub.subcategory);
                      }}
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                      aria-label={`Edit ${sub.subcategory.name}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                );
              })}
              {subcategories.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  {t("noSubcategories")}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Edit dialogs */}
      <EditCategoryDialog
        category={category}
        open={editCategoryOpen}
        onOpenChange={setEditCategoryOpen}
      />
      {editingSubcategory && (
        <EditSubcategoryDialog
          categoryId={category.id}
          subcategory={editingSubcategory}
          open={!!editingSubcategory}
          onOpenChange={(open) => {
            if (!open) setEditingSubcategory(null);
          }}
        />
      )}
    </Card>
  );
}
