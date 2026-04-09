"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, BarChart3, ChevronUp, Settings } from "lucide-react";
import type { SectionSummary, Section, Category } from "@/types/budget";
import {
  formatCurrency,
  formatCompact,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { CategoryIcon } from "@/lib/icon-picker";

interface SectionCardProps {
  sectionSummary: SectionSummary;
  currency: string;
  budgetId: string;
  onSubcategoryClick?: (subcategoryId: string) => void;
}

export function SectionCard({
  sectionSummary,
  currency,
  budgetId,
  onSubcategoryClick,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Category | null>(null);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.sectionActions");

  const { section, categories: subcategories, allocated_amount, total_spent } =
    sectionSummary;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="border-2 border-foreground bg-card">
      <div className="p-5 sm:p-7">
        {/* Section header - Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" role="img" aria-label={section.name}>
              <CategoryIcon iconKey={section.icon} className="size-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {subcategories.length} {subcategories.length === 1 ? "category" : "categories"}
              </p>
            </div>
          </div>

          {/* Amount row - Mobile */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Monto asignado
              </p>
              <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                {formatCompact(allocated_amount, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t("used")}
              </p>
              <p className={cn("text-2xl font-bold tabular-nums font-mono", textColor)}>
                {percentage}%
              </p>
            </div>
          </div>

          {/* Action buttons - Mobile */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                router.push(`/budget/${budgetId}/section/${section.id}/reports`);
              }}
              className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
            >
              <BarChart3 className="size-3.5" />
              {tActions("reports")}
            </button>
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5 min-w-max"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" />
                  {tActions("collapse")}
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  {tActions("breakdown")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditSectionOpen(true);
              }}
              className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1.5"
            >
              <Settings className="size-3.5" />
              {tActions("adjust")}
            </button>
          </div>
        </div>

        {/* Section header - Desktop layout */}
        <div className="hidden sm:flex items-center justify-between min-h-[44px] mb-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl" role="img" aria-label={section.name}>
              <CategoryIcon iconKey={section.icon} className="size-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {subcategories.length} {subcategories.length === 1 ? "category" : "categories"}
              </p>
            </div>
          </div>

          {/* Desktop action buttons - left side of amount */}
          <div className="flex items-center gap-2 mr-6">
            <button
              type="button"
              onClick={() => {
                router.push(`/budget/${budgetId}/section/${section.id}/reports`);
              }}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
            >
              <BarChart3 className="size-3.5" />
              {tActions("reports")}
            </button>
            <button
              type="button"
              onClick={toggleExpanded}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5 min-w-max"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5" />
                  {tActions("collapse")}
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  {tActions("breakdown")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditSectionOpen(true);
              }}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
            >
              <Settings className="size-3.5" />
              {tActions("adjust")}
            </button>
          </div>

          {/* Amount display - right side */}
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Monto asignado
            </p>
            <p className="text-3xl font-bold tabular-nums font-mono text-foreground">
              {formatCompact(allocated_amount, currency)}
            </p>
            <p className={cn("text-sm font-semibold tabular-nums font-mono mt-1", textColor)}>
              {percentage}% {t("used")}
            </p>
          </div>
        </div>

        {/* Budget / Spent / Left summary */}
        <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
          <span>
            {t("spentLabel")}:{" "}
            <span className="font-bold font-mono tabular-nums text-foreground">
              {formatCompact(total_spent, currency)}
            </span>
          </span>
          <span>
            {t("leftLabel")}:{" "}
            <span
              className={cn(
                "font-bold font-mono tabular-nums",
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
            <div className="h-3 w-full overflow-hidden bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-300",
                progressColor
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Expandable category list */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-in-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-5 border-t border-border pt-5 space-y-0">
              {subcategories.map((sub, idx) => {
                const subPercentage = getPercentage(
                  sub.total_spent,
                  sub.allocated_amount
                );
                const subProgressColor = getProgressColor(subPercentage);
                const subTextColor = getProgressTextColor(subPercentage);
                const subRemaining = sub.allocated_amount - sub.total_spent;

                return (
                  <div
                    key={sub.category.id}
                    className={cn(
                      "group/sub flex items-start gap-1.5 px-3 py-3 transition-colors duration-200 hover:bg-muted/50 min-h-[44px]",
                      idx !== 0 && "border-t border-foreground/10"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSubcategoryClick?.(sub.category.id)}
                      className="flex w-full flex-col gap-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base" role="img" aria-label={sub.category.name}>
                            <CategoryIcon iconKey={sub.category.icon} className="size-4" />
                          </span>
                          <span className="text-base font-bold text-foreground">
                            {sub.category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold tabular-nums font-mono text-foreground">
                            {formatCompact(sub.allocated_amount, currency)}
                          </span>
                          <span
                            className={cn(
                              "min-w-[2.5rem] text-right text-sm font-bold tabular-nums font-mono",
                              subTextColor
                            )}
                          >
                            {subPercentage}%
                          </span>
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="h-2 w-full overflow-hidden bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            subProgressColor
                          )}
                          style={{
                            width: `${Math.min(subPercentage, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-mono tabular-nums">
                          {formatCompact(sub.total_spent, currency)} spent
                        </span>
                        <span className={cn(
                          "font-mono tabular-nums",
                          subRemaining < 0 ? "text-red-600 dark:text-red-400" : ""
                        )}>
                          {subRemaining < 0 ? "-" : ""}
                          {formatCompact(Math.abs(subRemaining), currency)} left
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubcategory(sub.category);
                      }}
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                      aria-label={`Edit ${sub.category.name}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                );
              })}
              {subcategories.length === 0 && (
                <p className="py-3 text-center text-base text-muted-foreground font-medium">
                  {t("noSubcategories")}
                </p>
              )}
            </div>
          </div>
        </div>
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
