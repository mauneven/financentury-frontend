"use client";

import type { BudgetSummary } from "@/types/budget";
import { BILLING_PERIODS } from "@/types/budget";
import { formatCurrency, getPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface OverviewCardsProps {
  summary: BudgetSummary;
}

export function OverviewCards({ summary }: OverviewCardsProps) {
  const { budget, total_budget } = summary;
  const linkedSections = summary.linked_sections ?? [];
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  // Include linked spending in totals
  const linkedSpent = linkedSections.reduce((sum, ls) => sum + ls.total_spent, 0);
  const linkedAllocated = linkedSections
    .filter((ls) => !ls.link.source_category_id)
    .reduce((sum, ls) => sum + ls.section.allocation_value, 0);
  const total_spent = summary.total_spent + linkedSpent;
  const effectiveBudget = total_budget + linkedAllocated;
  const remaining = effectiveBudget - total_spent;
  const spentPercentage = getPercentage(total_spent, effectiveBudget);
  const isOverBudget = remaining < 0;
  const overBudgetPercent = effectiveBudget > 0 ? Math.round(((total_spent - effectiveBudget) / effectiveBudget) * 100) : 0;
  const remainingPercent = effectiveBudget > 0 ? Math.round(((effectiveBudget - total_spent) / effectiveBudget) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
      {/* Total Budget */}
      <div className="border-2 border-foreground bg-card p-4 sm:p-6">
        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t("totalBudget")}
        </p>
        <div className="mt-2 sm:mt-3">
          <p className="text-xl sm:text-4xl font-bold tabular-nums tracking-tight font-mono text-foreground">
            {formatCurrency(effectiveBudget, budget.currency)}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            {(() => {
              const bp = BILLING_PERIODS.find((p) => p.value === budget.billing_period_months);
              return bp ? tc(bp.labelKey) : `${budget.billing_period_months}m`;
            })()}
          </p>
        </div>
      </div>

      {/* Total Spent */}
      <div className="border-2 border-foreground bg-card p-4 sm:p-6">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-bold">
          {t("totalSpent")}
        </p>
        <div className="mt-2 sm:mt-3">
          <p className="text-xl sm:text-4xl font-bold tabular-nums tracking-tight font-mono text-foreground">
            {formatCurrency(total_spent, budget.currency)}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 bg-foreground/40" />
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-mono">
              {spentPercentage}% {t("ofBudgetUsed")}
            </p>
          </div>
        </div>
      </div>

      {/* Remaining */}
      <div
        className={cn(
          "border-2 border-foreground bg-card p-4 sm:p-6 col-span-2 md:col-span-1",
          isOverBudget
            ? "border-l-4 border-l-red-500"
            : "border-l-4 border-l-emerald-500"
        )}
      >
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-bold">
          {t("remaining")}
        </p>
        <div className="mt-2 sm:mt-3">
          <p
            className={cn(
              "text-xl sm:text-4xl font-bold tabular-nums tracking-tight font-mono",
              isOverBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {isOverBudget ? "-" : ""}
            {formatCurrency(Math.abs(remaining), budget.currency)}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2 w-2 sm:h-2.5 sm:w-2.5",
                isOverBudget ? "bg-red-500" : "bg-emerald-500"
              )}
            />
            <p
              className={cn(
                "text-[10px] sm:text-xs uppercase tracking-wider font-mono",
                isOverBudget
                  ? "text-red-500"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isOverBudget
                ? `${overBudgetPercent}% ${t("overBudgetPercent")}`
                : `${remainingPercent}% ${t("remainingPercent")}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
