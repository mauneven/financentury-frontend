"use client";

import { formatCurrency } from "@/lib/format";
import type { Budget } from "@/types/budget";
import { CURRENCIES, BILLING_PERIODS } from "@/types/budget";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Sparkles, PenLine } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface BudgetCardProps {
  budget: Budget;
  onClick?: () => void;
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
  const t = useTranslations("budgetCard");
  const tb = useTranslations("budget");
  const currency = CURRENCIES.find((c) => c.code === budget.currency);
  const period = BILLING_PERIODS.find(
    (p) => p.value === budget.billing_period_months
  );

  const formattedDate = new Intl.DateTimeFormat(currency?.locale || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(budget.created_at));

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:scale-[1.01] hover:border-border/80",
        "active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                budget.mode === "guided"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-violet-500/10 text-violet-600"
              )}
            >
              {budget.mode === "guided" ? (
                <Sparkles className="size-4" />
              ) : (
                <PenLine className="size-4" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{budget.name}</CardTitle>
              <CardDescription className="mt-0.5">{formattedDate}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {tb("monthlyIncome")}
            </p>
            <p className="text-lg font-bold tabular-nums">
              {formatCurrency(budget.monthly_income, budget.currency)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {budget.currency}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {period?.label || `${budget.billing_period_months}${t("perMonth")}`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
