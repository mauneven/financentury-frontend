"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, BarChart3, ChevronUp, Settings, Plus } from "lucide-react";
import type { SectionSummary, Section, Category } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { CategoryIcon } from "@/lib/icon-picker";
import { SpendingByUser } from "./spending-by-user";

interface SectionCardProps {
  sectionSummary: SectionSummary;
  currency: string;
  budgetId: string;
}

export function SectionCard({
  sectionSummary,
  currency,
  budgetId,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.sectionActions");
  const tSection = useTranslations("section");

  const { section, categories: sectionCategories, allocated_amount, total_spent } =
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
                {sectionCategories.length === 1 ? tSection("categoryCount", { count: String(sectionCategories.length) }) : tSection("categoryCountPlural", { count: String(sectionCategories.length) })}
              </p>
            </div>
          </div>

          {/* Amount row - Mobile */}
          <div className="mb-4 pb-4 border-b border-border space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-bold tabular-nums font-mono text-foreground">
                {formatCurrency(allocated_amount, currency)}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="h-4 w-px bg-border" />
                <span className="text-sm font-bold font-mono text-muted-foreground">
                  {section.allocation_percent}% {t("ofBudget")}
                </span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-base font-mono tabular-nums text-muted-foreground">
                {formatCurrency(total_spent, currency)} {t("spentLabel").toLowerCase()}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="h-4 w-px bg-border" />
                <span className={cn("text-sm font-bold font-mono tabular-nums", textColor)}>
                  {percentage}% {t("used")}
                </span>
              </div>
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
                {sectionCategories.length === 1 ? tSection("categoryCount", { count: String(sectionCategories.length) }) : tSection("categoryCountPlural", { count: String(sectionCategories.length) })}
              </p>
            </div>
          </div>

          {/* Desktop action buttons */}
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
            <div className="flex items-baseline justify-end gap-3">
              <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
                {formatCurrency(allocated_amount, currency)}
              </p>
              <span className="h-5 w-px bg-border" />
              <span className="text-lg font-bold font-mono text-muted-foreground">
                {section.allocation_percent}%
              </span>
            </div>
            <div className="flex items-baseline justify-end gap-3 mt-1">
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {formatCurrency(total_spent, currency)} {t("spentLabel").toLowerCase()}
              </span>
              <span className="h-4 w-px bg-border" />
              <span className={cn("text-sm font-bold font-mono tabular-nums", textColor)}>
                {percentage}% {t("used")}
              </span>
            </div>
          </div>
        </div>

        {/* Left summary */}
        <div className="mt-4 flex items-center justify-between text-base text-muted-foreground">
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
              {formatCurrency(Math.abs(remaining), currency)}
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

        {/* Per-person spending (section level) */}
        {sectionSummary.spending_by_user && sectionSummary.spending_by_user.length > 0 && (
          <SpendingByUser
            spendingByUser={sectionSummary.spending_by_user}
            totalSpent={total_spent}
            currency={currency}
            compact
          />
        )}

        {/* Expandable category list */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-in-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-5 border-t-2 border-foreground/10 pt-5 space-y-0">
              {sectionCategories.map((sub, idx) => {
                const subPercentage = getPercentage(
                  sub.total_spent,
                  sub.allocated_amount
                );
                const subProgressColor = getProgressColor(subPercentage);
                const subTextColor = getProgressTextColor(subPercentage);

                return (
                  <div
                    key={sub.category.id}
                    className={cn(
                      "group/sub px-3 py-3 transition-colors duration-200 hover:bg-muted/50 min-h-[44px] cursor-pointer",
                      idx !== 0 && "border-t border-foreground/10"
                    )}
                    onClick={() => {
                      const sectionId = sub.category.section_id || section.id;
                      router.push(`/budget/${budgetId}/section/${sectionId}/category/${sub.category.id}`);
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex w-full flex-col gap-2">
                        {/* Category name + allocated amount */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base" role="img" aria-label={sub.category.name}>
                              <CategoryIcon iconKey={sub.category.icon} className="size-4" />
                            </span>
                            <span className="text-base font-bold text-foreground">
                              {sub.category.name}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold tabular-nums font-mono text-foreground">
                              {formatCurrency(sub.allocated_amount, currency)}
                            </span>
                            <span className="h-4 w-px bg-border" />
                            <span className="text-sm font-bold font-mono text-muted-foreground">
                              {sub.category.allocation_percent}% {t("ofSection")}
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
                        {/* Spent + used % */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {formatCurrency(sub.total_spent, currency)} {t("spentLabel").toLowerCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="h-3.5 w-px bg-border" />
                            <span className={cn(
                              "font-mono tabular-nums font-bold",
                              subTextColor
                            )}>
                              {subPercentage}% {t("used")}
                            </span>
                          </div>
                        </div>
                        {/* Per-person spending (category level) */}
                        {sub.spending_by_user && sub.spending_by_user.length > 0 && (
                          <SpendingByUser
                            spendingByUser={sub.spending_by_user}
                            totalSpent={sub.total_spent}
                            currency={currency}
                            compact
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(sub.category);
                        }}
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                        aria-label={`Edit ${sub.category.name}`}
                      >
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sectionCategories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-foreground bg-muted">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h4 className="mb-1 text-base font-semibold text-foreground">
                    {t("noCategories")}
                  </h4>
                  <p className="mb-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
                    {t("noCategoriesHint")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddCategoryOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    {tSection("addCategory")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialogs */}
      <EditSectionDialog
        section={section}
        categories={sectionCategories.map((s) => s.category)}
        open={editSectionOpen}
        onOpenChange={setEditSectionOpen}
      />
      <AddCategoryDialog
        sectionId={section.id}
        existingCategoryIcons={sectionCategories.map((s) => s.category.icon)}
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
      />
      {editingCategory && (
        <EditCategoryDialog
          sectionId={section.id}
          category={editingCategory}
          parentSection={section}
          siblingCategories={sectionCategories.map((s) => s.category)}
          open={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}
