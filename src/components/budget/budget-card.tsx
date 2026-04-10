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
import {
  Scale,
  Wallet,
  PenLine,
  CreditCard,
  Plane,
  PartyPopper,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface BudgetCardProps {
  budget: Budget;
  onClick?: () => void;
}

const MODE_STYLES: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode; labelKey: string }
> = {
  balanced: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    icon: <Scale className="size-4" />,
    labelKey: "balanced",
  },
  "debt-free": {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    icon: <Wallet className="size-4" />,
    labelKey: "debtFree",
  },
  "debt-payoff": {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    icon: <CreditCard className="size-4" />,
    labelKey: "debtPayoff",
  },
  travel: {
    bg: "bg-sky-500/10",
    text: "text-sky-600",
    icon: <Plane className="size-4" />,
    labelKey: "travel",
  },
  event: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    icon: <PartyPopper className="size-4" />,
    labelKey: "event",
  },
  manual: {
    bg: "bg-violet-500/10",
    text: "text-violet-600",
    icon: <PenLine className="size-4" />,
    labelKey: "manual",
  },
};

// Fallback for legacy modes stored in the database.
const FALLBACK_STYLE = MODE_STYLES.manual;

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
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
        "hover:border-foreground/80",
        "active:scale-[0.99]"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center border-2 border-foreground",
                style.bg,
                style.text
              )}
            >
              {style.icon}
            </div>
            <div>
              <CardTitle className="text-base">{budget.name}</CardTitle>
              <CardDescription className="mt-0.5">
                {formattedDate}
              </CardDescription>
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
              {period
                ? tc(period.labelKey)
                : `${budget.billing_period_months}${t("perMonth")}`}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {t(style.labelKey)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
