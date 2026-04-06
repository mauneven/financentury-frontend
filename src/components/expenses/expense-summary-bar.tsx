"use client";

import { DollarSign } from "lucide-react";

import {
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface ExpenseSummaryBarProps {
  totalBudget: number;
  totalSpent: number;
  currency: string;
}

export function ExpenseSummaryBar({
  totalBudget,
  totalSpent,
  currency,
}: ExpenseSummaryBarProps) {
  const t = useTranslations("expense");
  const percentage = getPercentage(totalSpent, totalBudget);
  const remaining = Math.max(0, totalBudget - totalSpent);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
      {/* Icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <DollarSign className="size-4 text-muted-foreground" />
      </div>

      {/* Info + Progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {t("spentSummary", {
              spent: formatCurrency(totalSpent, currency),
              total: formatCurrency(totalBudget, currency),
            })}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm font-mono font-medium",
              getProgressTextColor(percentage)
            )}
          >
            {percentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              getProgressColor(percentage)
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
