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
import { CategoryIcon } from "@/lib/icon-picker";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface BudgetCardProps {
  budget: Budget;
  onClick?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const MODE_STYLES: Record<
  string,
  { bg: string; text: string; labelKey: string }
> = {
  balanced: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    labelKey: "balanced",
  },
  "debt-free": {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    labelKey: "debtFree",
  },
  "debt-payoff": {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    labelKey: "debtPayoff",
  },
  travel: {
    bg: "bg-sky-500/10",
    text: "text-sky-600",
    labelKey: "travel",
  },
  event: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    labelKey: "event",
  },
  manual: {
    bg: "bg-violet-500/10",
    text: "text-violet-600",
    labelKey: "manual",
  },
};

// Fallback for legacy modes stored in the database.
const FALLBACK_STYLE = MODE_STYLES.manual;

export function BudgetCard({ budget, onClick, onMoveUp, onMoveDown }: BudgetCardProps) {
  const t = useTranslations("budgetCard");
  const tb = useTranslations("budget");
  const tc = useTranslations("common");

  const curr = CURRENCIES.find((c) => c.code === budget.currency);
  const period = BILLING_PERIODS.find(
    (p) => p.value === budget.billing_period_months
  );
  const formattedDate = new Intl.DateTimeFormat(curr?.locale || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(budget.created_at));

  const modeKey = budget.mode as string;
  const style = MODE_STYLES[modeKey] ?? FALLBACK_STYLE;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:border-border",
        "active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border border-border",
                style.bg,
                style.text
              )}
            >
              <CategoryIcon iconKey={budget.icon || "wallet"} className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">{budget.name}</CardTitle>
              <CardDescription className="mt-0.5">
                {formattedDate}
              </CardDescription>
            </div>
          </div>
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={onMoveUp} className={cn("p-0.5 transition-colors", onMoveUp ? "text-muted-foreground/40 hover:text-foreground" : "invisible")} aria-label="Move up">
                <ChevronUp className="size-4" />
              </button>
              <button type="button" onClick={onMoveDown} className={cn("p-0.5 transition-colors", onMoveDown ? "text-muted-foreground/40 hover:text-foreground" : "invisible")} aria-label="Move down">
                <ChevronDown className="size-4" />
              </button>
            </div>
          )}
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
              {period
                ? tc(period.labelKey)
                : `${budget.billing_period_months}${t("perMonth")}`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
