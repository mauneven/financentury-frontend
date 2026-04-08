"use client";

import { memo, useMemo } from "react";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BudgetSummary } from "@/types/budget";
import { formatCurrency, getPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface OverviewCardsProps {
  summary: BudgetSummary;
}

export const OverviewCards = memo(function OverviewCards({ summary }: OverviewCardsProps) {
  const { budget, total_budget, total_spent } = summary;
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  const { remaining, spentPercentage, isOverBudget, overBudgetPercent, remainingPercent } = useMemo(() => {
    const rem = total_budget - total_spent;
    return {
      remaining: rem,
      spentPercentage: getPercentage(total_spent, total_budget),
      isOverBudget: rem < 0,
      overBudgetPercent: total_budget > 0 ? Math.round(((total_spent - total_budget) / total_budget) * 100) : 0,
      remainingPercent: total_budget > 0 ? Math.round(((total_budget - total_spent) / total_budget) * 100) : 0,
    };
  }, [total_budget, total_spent]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
      {/* Total Budget */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-muted-foreground">
              {t("totalBudget")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(total_budget, budget.currency)}
            </p>
            <p className="mt-1.5 text-base text-muted-foreground">
              {budget.billing_period_months === 1
                ? tc("monthly")
                : `Every ${budget.billing_period_months} months`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-muted-foreground">
              {t("totalSpent")}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(total_spent, budget.currency)}
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-base text-muted-foreground">
                {spentPercentage}% {t("ofBudgetUsed")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remaining */}
      <Card className="shadow-sm sm:col-span-2 md:col-span-1">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-muted-foreground">
              {t("remaining")}
            </p>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isOverBudget
                  ? "bg-red-50 dark:bg-red-950/30"
                  : "bg-emerald-50 dark:bg-emerald-950/30"
              )}
            >
              {isOverBudget ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <p
              className={cn(
                "text-2xl sm:text-3xl font-bold tabular-nums",
                isOverBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isOverBudget ? "-" : ""}
              {formatCurrency(Math.abs(remaining), budget.currency)}
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              {isOverBudget ? (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <p
                className={cn(
                  "text-base",
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
        </CardContent>
      </Card>
    </div>
  );
});
