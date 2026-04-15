"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, BarChart3, ChevronUp, Settings, Plus, Link2 } from "lucide-react";
import type { SectionSummary, Category, CategorySummary, BudgetLink, Budget } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { useBudgetStore } from "@/store/budget-store";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddCategoryDialog } from "@/components/budget/add-category-dialog";
import { ManageLinkDialog } from "@/components/budget/manage-link-dialog";
import { CategoryIcon } from "@/lib/icon-picker";
import { SpendingByUser } from "./spending-by-user";
import { SectionUnallocatedBanner } from "./unallocated-banner";

// Linked category info passed from parent
export interface LinkedCategoryItem {
  categorySummary: CategorySummary;
  link: BudgetLink;
  sourceBudgetName: string;
}

interface SectionCardProps {
  sectionSummary: SectionSummary;
  currency: string;
  budgetId: string;
  /** Present when the entire section is linked from another budget */
  linkedInfo?: {
    link: BudgetLink;
    source_budget: Budget;
  };
  /** Categories from other budgets that are linked into this section */
  linkedCategories?: LinkedCategoryItem[];
  /** Callback to add expense to a linked category's source budget */
  onAddLinkedExpense?: (sourceBudgetId: string, preselectedCategoryId?: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SectionCard({
  sectionSummary,
  currency,
  budgetId,
  linkedInfo,
  linkedCategories = [],
  onAddLinkedExpense,
  onMoveUp,
  onMoveDown,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryPrefillAmount, setCategoryPrefillAmount] = useState<number | undefined>(undefined);
  const [manageLinkOpen, setManageLinkOpen] = useState(false);
  const [managingLinkedCat, setManagingLinkedCat] = useState<LinkedCategoryItem | null>(null);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.sectionActions");
  const tSection = useTranslations("section");
  const tl = useTranslations("links");
  const monthlyIncome = useBudgetStore((s) => s.summary?.budget.monthly_income ?? 0);
  const updateSection = useBudgetStore((s) => s.updateSection);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  const { section, categories: sectionCategories, allocated_amount, total_spent } =
    sectionSummary;

  const isLinkedSection = !!linkedInfo;
  const totalCategoryCount = sectionCategories.length + linkedCategories.length;
  const sectionPct = monthlyIncome > 0 ? Math.round((section.allocation_value / monthlyIncome) * 100) : 0;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const filterLabel = linkedInfo ? (linkedInfo.link.filter_mode === "mine" ? tl("filterMine") : tl("filterAll")) : "";

  return (
    <div className={cn(
      "border-2 bg-card",
      isLinkedSection ? "border-foreground/50 border-dashed" : "border-foreground"
    )}>
      <div className="p-5 sm:p-7">
        {/* Linked badge for section-level links */}
        {isLinkedSection && (
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Link2 className="size-3.5" />
            <span className="font-bold">
              {tl("linkedFrom", { name: linkedInfo.source_budget.name })}
            </span>
            <span className="text-muted-foreground/60">&middot;</span>
            <span>{filterLabel}</span>
          </div>
        )}

        {/* Section header - Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-center gap-3 mb-4">
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col shrink-0 -ml-1">
                <button type="button" onClick={onMoveUp} disabled={!onMoveUp} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-0 transition-colors" aria-label="Move up">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={onMoveDown} disabled={!onMoveDown} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-0 transition-colors" aria-label="Move down">
                  <ChevronDown className="size-4" />
                </button>
              </div>
            )}
            <span className="text-2xl" role="img" aria-label={section.name}>
              <CategoryIcon iconKey={section.icon} className="size-6" />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {totalCategoryCount === 1 ? tSection("categoryCount", { count: String(totalCategoryCount) }) : tSection("categoryCountPlural", { count: String(totalCategoryCount) })}
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
                  {sectionPct}% {t("ofBudget")}
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
          <div className="flex gap-1.5 mb-4">
            {!isLinkedSection && (
              <button
                type="button"
                onClick={() => {
                  router.push(`/budget/${budgetId}/section/${section.id}/reports`);
                }}
                className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
              >
                <BarChart3 className="size-3.5 shrink-0" />
                <span className="truncate">{tActions("reports")}</span>
              </button>
            )}
            {isLinkedSection && onAddLinkedExpense && (
              <button
                type="button"
                onClick={() => onAddLinkedExpense(linkedInfo.link.source_budget_id)}
                className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
              >
                <Plus className="size-3.5 shrink-0" />
                <span className="truncate">{tl("addExpenseToLinked")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleExpanded}
              className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3.5 shrink-0" />
                  <span className="truncate">{tActions("collapse")}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5 shrink-0" />
                  <span className="truncate">{tActions("breakdown")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isLinkedSection) {
                  setManageLinkOpen(true);
                } else {
                  setEditSectionOpen(true);
                }
              }}
              className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
            >
              <Settings className="size-3.5 shrink-0" />
              <span className="truncate">{tActions("adjust")}</span>
            </button>
          </div>
        </div>

        {/* Section header - Desktop layout */}
        <div className="hidden sm:flex items-center justify-between min-h-[44px] mb-4">
          <div className="flex items-center gap-3 flex-1">
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col shrink-0 -ml-1">
                <button type="button" onClick={onMoveUp} disabled={!onMoveUp} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-0 transition-colors" aria-label="Move up">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={onMoveDown} disabled={!onMoveDown} className="p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-0 transition-colors" aria-label="Move down">
                  <ChevronDown className="size-4" />
                </button>
              </div>
            )}
            <span className="text-2xl" role="img" aria-label={section.name}>
              <CategoryIcon iconKey={section.icon} className="size-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {totalCategoryCount === 1 ? tSection("categoryCount", { count: String(totalCategoryCount) }) : tSection("categoryCountPlural", { count: String(totalCategoryCount) })}
              </p>
            </div>
          </div>

          {/* Desktop action buttons */}
          <div className="flex items-center gap-2 mr-6">
            {!isLinkedSection && (
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
            )}
            {isLinkedSection && onAddLinkedExpense && (
              <button
                type="button"
                onClick={() => onAddLinkedExpense(linkedInfo.link.source_budget_id)}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                {tl("addExpenseToLinked")}
              </button>
            )}
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
                if (isLinkedSection) {
                  setManageLinkOpen(true);
                } else {
                  setEditSectionOpen(true);
                }
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
              <>
                <span className="h-5 w-px bg-border" />
                <span className="text-lg font-bold font-mono text-muted-foreground">
                  {sectionPct}%
                </span>
              </>
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

        {/* Unallocated section notification */}
        {!isLinkedSection && (sectionCategories.length > 0 || linkedCategories.length > 0) && (() => {
          const totalCatValue = sectionCategories.reduce((sum, c) => sum + c.category.allocation_value, 0)
            + linkedCategories.reduce((sum, lc) => sum + lc.categorySummary.category.allocation_value, 0);
          const unallocAmt = allocated_amount - totalCatValue;
          if (unallocAmt <= 0) return null;
          const unallocPct = allocated_amount > 0 ? Math.round((unallocAmt / allocated_amount) * 100) : 0;
          return (
            <div className="mt-3">
              <SectionUnallocatedBanner
                unallocatedPercent={unallocPct}
                unallocatedAmount={unallocAmt}
                currency={currency}
                sectionId={section.id}
                categories={sectionCategories.map((c) => ({
                  id: c.category.id,
                  name: c.category.name,
                  icon: c.category.icon,
                  allocation_value: c.category.allocation_value,
                  sectionId: section.id,
                }))}
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
            </div>
          );
        })()}

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
              {/* Regular categories */}
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
                      if (isLinkedSection && onAddLinkedExpense) {
                        onAddLinkedExpense(linkedInfo!.link.source_budget_id, sub.category.id);
                      } else {
                        const sectionId = sub.category.section_id || section.id;
                        router.push(`/budget/${budgetId}/section/${sectionId}/category/${sub.category.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex w-full flex-col gap-2">
                        {/* Category name + allocated amount */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 text-base" role="img" aria-label={sub.category.name}>
                              <CategoryIcon iconKey={sub.category.icon} className="size-4" />
                            </span>
                            <span className="text-sm sm:text-base font-bold text-foreground truncate">
                              {sub.category.name}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 shrink-0">
                            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-foreground">
                              {formatCurrency(sub.allocated_amount, currency)}
                            </span>
                            <>
                              <span className="hidden sm:block h-4 w-px bg-border" />
                              <span className="hidden sm:block text-sm font-bold font-mono text-muted-foreground">
                                {section.allocation_value > 0 ? Math.round((sub.category.allocation_value / section.allocation_value) * 100) : 0}% {t("ofSection")}
                              </span>
                            </>
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
                      {!isLinkedSection ? (
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
                      ) : onAddLinkedExpense ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddLinkedExpense(linkedInfo!.link.source_budget_id, sub.category.id);
                          }}
                          className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                          aria-label={`Add expense to ${sub.category.name}`}
                        >
                          <Plus className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {/* Linked categories (from other budgets targeting this section) */}
              {linkedCategories.map((lc, idx) => {
                const sub = lc.categorySummary;
                const subPercentage = getPercentage(sub.total_spent, sub.allocated_amount);
                const subProgressColor = getProgressColor(subPercentage);
                const subTextColor = getProgressTextColor(subPercentage);
                const isFirst = idx === 0 && sectionCategories.length === 0;

                return (
                  <div
                    key={`linked-${lc.link.id}-${sub.category.id}`}
                    className={cn(
                      "group/sub px-3 py-3 transition-colors duration-200 hover:bg-muted/50 min-h-[44px]",
                      !isFirst && "border-t border-foreground/10"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex w-full flex-col gap-2">
                        {/* Category name + linked badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 text-base" role="img" aria-label={sub.category.name}>
                              <CategoryIcon iconKey={sub.category.icon} className="size-4" />
                            </span>
                            <span className="text-sm sm:text-base font-bold text-foreground truncate">
                              {sub.category.name}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                              <Link2 className="size-3" />
                              {tl("linkedBadge", { name: lc.sourceBudgetName })}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 shrink-0">
                            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-foreground">
                              {formatCurrency(sub.allocated_amount, currency)}
                            </span>
                            <span className="hidden sm:block h-4 w-px bg-border" />
                            <span className="hidden sm:block text-sm font-bold font-mono text-muted-foreground">
                              {section.allocation_value > 0 ? Math.round((sub.category.allocation_value / section.allocation_value) * 100) : 0}% {t("ofSection")}
                            </span>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="h-2 w-full overflow-hidden bg-muted">
                          <div
                            className={cn("h-full transition-all duration-300", subProgressColor)}
                            style={{ width: `${Math.min(subPercentage, 100)}%` }}
                          />
                        </div>
                        {/* Spent + used % */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="font-mono tabular-nums">
                            {formatCurrency(sub.total_spent, currency)} {t("spentLabel").toLowerCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="h-3.5 w-px bg-border" />
                            <span className={cn("font-mono tabular-nums font-bold", subTextColor)}>
                              {subPercentage}% {t("used")}
                            </span>
                          </div>
                        </div>
                        {sub.spending_by_user && sub.spending_by_user.length > 0 && (
                          <SpendingByUser
                            spendingByUser={sub.spending_by_user}
                            totalSpent={sub.total_spent}
                            currency={currency}
                            compact
                          />
                        )}
                      </div>
                      {/* Manage linked category */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setManagingLinkedCat(lc);
                        }}
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                        aria-label={`Manage link for ${sub.category.name}`}
                      >
                        <Settings className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {sectionCategories.length === 0 && linkedCategories.length === 0 && (
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
                  {!isLinkedSection && (
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
                  )}
                </div>
              )}

              {/* Add Category button at the bottom of breakdown (for non-linked sections with existing categories) */}
              {!isLinkedSection && (sectionCategories.length > 0 || linkedCategories.length > 0) && (
                <div className="border-t border-foreground/10 pt-3 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryPrefillAmount(undefined);
                      setAddCategoryOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
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

      {/* Edit dialogs (only for non-linked sections) */}
      {!isLinkedSection && (
        <>
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
            onOpenChange={(open) => {
              setAddCategoryOpen(open);
              if (!open) setCategoryPrefillAmount(undefined);
            }}
            prefillAmount={categoryPrefillAmount}
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
        </>
      )}

      {/* Manage link dialog for section-level links */}
      {isLinkedSection && (
        <ManageLinkDialog
          link={linkedInfo.link}
          sourceBudgetName={linkedInfo.source_budget.name}
          sectionName={section.name}
          open={manageLinkOpen}
          onOpenChange={setManageLinkOpen}
        />
      )}

      {/* Manage link dialog for individual linked categories */}
      {managingLinkedCat && (
        <ManageLinkDialog
          link={managingLinkedCat.link}
          sourceBudgetName={managingLinkedCat.sourceBudgetName}
          sectionName={managingLinkedCat.categorySummary.category.name}
          open={!!managingLinkedCat}
          onOpenChange={(open) => {
            if (!open) setManagingLinkedCat(null);
          }}
        />
      )}
    </div>
  );
}
