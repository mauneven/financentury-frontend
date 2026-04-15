"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Settings, Plus, Link2 } from "lucide-react";
import type { LinkedSectionSummary } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { SpendingByUser } from "./spending-by-user";
import { ManageLinkDialog } from "@/components/budget/manage-link-dialog";

interface LinkedSectionCardProps {
  linked: LinkedSectionSummary;
  currency: string;
  onAddExpense: (sourceBudgetId: string, preselectedCategoryId?: string) => void;
}

export function LinkedSectionCard({
  linked,
  currency,
  onAddExpense,
}: LinkedSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manageLinkOpen, setManageLinkOpen] = useState(false);
  const t = useTranslations("dashboard");
  const tl = useTranslations("links");
  const tActions = useTranslations("dashboard.sectionActions");

  const { link, source_budget, section, categories, total_spent } = linked;

  const filterLabel = link.filter_mode === "mine" ? tl("filterMine") : tl("filterAll");

  return (
    <div className="border-2 border-foreground/50 border-dashed bg-card">
      <div className="p-5 sm:p-7">
        {/* Linked badge */}
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Link2 className="size-3.5" />
          <span className="font-bold">
            {tl("linkedFrom", { name: source_budget.name })}
          </span>
          <span className="text-muted-foreground/60">&middot;</span>
          <span>{filterLabel}</span>
        </div>

        {/* Section header - Mobile */}
        <div className="sm:hidden">
          <div className="flex items-center gap-3 mb-4">
            <CategoryIcon iconKey={section.icon} className="size-6" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </p>
            </div>
          </div>

          {/* Spent display - Mobile */}
          <div className="mb-4 pb-4 border-b border-border">
            <p className="text-xl font-bold tabular-nums font-mono text-foreground">
              {formatCurrency(total_spent, currency)} <span className="text-sm font-normal text-muted-foreground">{t("spentLabel").toLowerCase()}</span>
            </p>
          </div>

          {/* Action buttons - Mobile */}
          <div className="flex gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => onAddExpense(link.source_budget_id)}
              className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">{tl("addExpenseToLinked")}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
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
              onClick={() => setManageLinkOpen(true)}
              className="flex-1 px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center justify-center gap-1"
            >
              <Settings className="size-3.5 shrink-0" />
              <span className="truncate">{tActions("adjust")}</span>
            </button>
          </div>
        </div>

        {/* Section header - Desktop */}
        <div className="hidden sm:flex items-center justify-between min-h-[44px] mb-4">
          <div className="flex items-center gap-3 flex-1">
            <CategoryIcon iconKey={section.icon} className="size-6" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {section.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </p>
            </div>
          </div>

          {/* Desktop action buttons */}
          <div className="flex items-center gap-2 mr-6">
            <button
              type="button"
              onClick={() => onAddExpense(link.source_budget_id)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              {tl("addExpenseToLinked")}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
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
              onClick={() => setManageLinkOpen(true)}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1.5"
            >
              <Settings className="size-3.5" />
              {tActions("adjust")}
            </button>
          </div>

          {/* Spent display - right side */}
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums font-mono text-foreground">
              {formatCurrency(total_spent, currency)}
            </p>
            <p className="text-sm font-mono tabular-nums text-muted-foreground mt-1">
              {t("spentLabel").toLowerCase()}
            </p>
          </div>
        </div>

        {/* Per-person spending */}
        {linked.spending_by_user && linked.spending_by_user.length > 0 && (
          <SpendingByUser
            spendingByUser={linked.spending_by_user}
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
              {categories.map((sub, idx) => {
                const subPercentage = getPercentage(sub.total_spent, sub.allocated_amount);
                const subProgressColor = getProgressColor(subPercentage);
                const subTextColor = getProgressTextColor(subPercentage);

                return (
                  <div
                    key={sub.category.id}
                    className={cn(
                      "group/sub px-3 py-3 transition-colors duration-200 hover:bg-muted/50 min-h-[44px]",
                      idx !== 0 && "border-t border-foreground/10"
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex w-full flex-col gap-2">
                        {/* Category name + allocated amount */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <CategoryIcon iconKey={sub.category.icon} className="size-4" />
                            <span className="text-sm sm:text-base font-bold text-foreground truncate">
                              {sub.category.name}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 shrink-0">
                            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-foreground">
                              {formatCurrency(sub.allocated_amount, currency)}
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
                      {/* Add expense to this specific category */}
                      <button
                        type="button"
                        onClick={() => onAddExpense(link.source_budget_id, sub.category.id)}
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                        aria-label={`Add expense to ${sub.category.name}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manage link dialog */}
      <ManageLinkDialog
        link={link}
        sourceBudgetName={source_budget.name}
        sectionName={section.name}
        open={manageLinkOpen}
        onOpenChange={setManageLinkOpen}
      />
    </div>
  );
}
