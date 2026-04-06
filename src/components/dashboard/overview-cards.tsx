"use client";

import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BudgetSummary } from "@/types/budget";
import { formatCurrency, getPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface OverviewCardsProps {
  summary: BudgetSummary;
}

export function OverviewCards({ summary }: OverviewCardsProps) {
  const { budget, total_budget, total_spent } = summary;
  const remaining = total_budget - total_spent;
  const spentPercentage = getPercentage(total_spent, total_budget);
  const isOverBudget = remaining < 0;
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Total Budget */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {t("totalBudget")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(total_budget, budget.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {budget.billing_period_months === 1
                ? tc("monthly")
                : `Every ${budget.billing_period_months} months`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {t("totalSpent")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(total_spent, budget.currency)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {spentPercentage}% {t("ofBudgetUsed")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remaining */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {t("remaining")}
            </p>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isOverBudget
                  ? "bg-red-50 dark:bg-red-950/30"
                  : "bg-emerald-50 dark:bg-emerald-950/30"
              )}
            >
              {isOverBudget ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <p
              className={cn(
                "text-2xl font-bold",
                isOverBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isOverBudget ? "-" : ""}
              {formatCurrency(Math.abs(remaining), budget.currency)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              {isOverBudget ? (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-emerald-500" />
              )}
              <p
                className={cn(
                  "text-xs",
                  isOverBudget
                    ? "text-red-500"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {isOverBudget
                  ? `${Math.abs(100 - spentPercentage)}% ${t("overBudgetPercent")}`
                  : `${100 - spentPercentage}% ${t("remainingPercent")}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
