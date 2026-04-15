"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { budgetApi } from "@/lib/api";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { BillingHistoryResponse, BillingPeriodBalance } from "@/types/budget";

interface BillingHistoryProps {
  budgetId: string;
  currency: string;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function BalanceIndicator({ balance }: { balance: number }) {
  if (balance > 0) {
    return <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (balance < 0) {
    return <TrendingDown className="size-4 text-red-600 dark:text-red-400" />;
  }
  return <Minus className="size-4 text-muted-foreground" />;
}

function PeriodRow({
  period,
  currency,
  t,
  isCurrent,
}: {
  period: BillingPeriodBalance;
  currency: string;
  t: ReturnType<typeof useTranslations>;
  isCurrent?: boolean;
}) {
  const isPositive = period.balance > 0;
  const isNegative = period.balance < 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4",
        isCurrent && "border-2 border-foreground bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {formatDate(period.period_start)} — {formatDate(period.period_end)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <BalanceIndicator balance={period.balance} />
          <span
            className={cn(
              "text-sm font-bold font-mono tabular-nums",
              isPositive && "text-emerald-600 dark:text-emerald-400",
              isNegative && "text-red-600 dark:text-red-400",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isNegative ? "-" : ""}
            {formatCurrency(Math.abs(period.balance), currency)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">
          {t("income")}: {formatCurrency(period.income, currency)}
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="font-mono tabular-nums">
          {t("spent")}: {formatCurrency(period.total_spent, currency)}
        </span>
      </div>

      {/* Balance bar */}
      <div className="h-1.5 w-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isNegative ? "bg-red-500" : "bg-emerald-500"
          )}
          style={{
            width: `${Math.min(
              period.income > 0
                ? (period.total_spent / period.income) * 100
                : 0,
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

export function BillingHistory({ budgetId, currency }: BillingHistoryProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [data, setData] = useState<BillingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHistory = useCallback((id: string) => {
    let cancelled = false;
    setError(false);
    budgetApi
      .billingHistory(id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return fetchHistory(budgetId);
  }, [budgetId, fetchHistory]);

  if (loading) {
    return (
      <div className="border-2 border-foreground bg-card p-5 sm:p-6">
        <div className="h-4 w-40 animate-pulse bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-20 animate-pulse bg-muted" />
          <div className="h-16 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-foreground bg-card p-5 sm:p-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="size-6 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {t("errorLoading")}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(false);
              fetchHistory(budgetId);
            }}
            className="mt-3 px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            {tc("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.current) return null;

  return (
    <div className="border-2 border-foreground bg-card p-5 sm:p-6">
      <h3 className="font-bold text-foreground" style={{ fontSize: 'var(--text-fluid-base)' }}>
        {t("billingHistory")}
      </h3>

      {/* Current period */}
      <div className="mt-4 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("currentPeriod")}
        </p>
        <PeriodRow period={data.current} currency={currency} t={t} isCurrent />
      </div>

      {/* Past periods */}
      {data.history.length > 0 && (
        <div className="mt-5 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("pastPeriods")}
          </p>
          <div className="space-y-1">
            {data.history.map((period) => (
              <PeriodRow
                key={period.period_start}
                period={period}
                currency={currency}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
