"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, getCurrencyInfo } from "@/lib/format";
import { budgetApi } from "@/lib/api";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { BudgetResumeResponse, BudgetResumePeriod } from "@/types/budget";

interface BudgetResumeProps {
  budgetId: string;
  currency: string;
}

function makeDateFormatter(locale: string): (dateStr: string) => string {
  return (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };
}

function BalanceIndicator({ balance }: { balance: number }) {
  if (balance > 0) {
    return <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />;
  }
  if (balance < 0) {
    return <TrendingDown className="size-4 text-red-600 dark:text-red-400" strokeWidth={1.8} />;
  }
  return <Minus className="size-4 text-muted-foreground" strokeWidth={1.8} />;
}

function PeriodRow({
  period,
  currency,
  formatDate,
  t,
}: {
  period: BudgetResumePeriod;
  currency: string;
  formatDate: (dateStr: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const isPositive = period.balance > 0;
  const isNegative = period.balance < 0;

  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {formatDate(period.period_start)} — {formatDate(period.period_end)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-5.5 sm:ml-0">
          <BalanceIndicator balance={period.balance} />
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
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

      <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t("income")}: {formatCurrency(period.income, currency)}
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="tabular-nums">
          {t("spent")}: {formatCurrency(period.total_spent, currency)}
        </span>
      </div>

      {/* Balance bar */}
      <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
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

export function BudgetResume({ budgetId, currency }: BudgetResumeProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [data, setData] = useState<BudgetResumeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refetchNonce, setRefetchNonce] = useState(0);

  const locale = getCurrencyInfo(currency)?.locale || "en-US";
  const formatDate = makeDateFormatter(locale);

  useEffect(() => {
    let cancelled = false;
    budgetApi
      .budgetResume(budgetId)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(false);
        }
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
  }, [budgetId, refetchNonce]);

  if (loading) {
    return (
      <>
        <div className="border-t border-border" />
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="border-t border-border" />
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle className="size-6 text-muted-foreground mb-3" strokeWidth={1.8} />
            <p className="text-sm font-semibold text-foreground mb-1">
              {t("errorLoading")}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(false);
                setRefetchNonce((n) => n + 1);
              }}
              className="mt-3 px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
            >
              {tc("retry")}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!data || data.periods.length === 0) return null;

  const title = data.one_time ? t("oneTimeResume") : t("budgetResume");
  const subtitle = data.one_time ? t("oneTimeResumeDescription") : t("completedPeriods");

  return (
    <>
      {/* Horizontal separator */}
      <div className="border-t border-border" />

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h3 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-base)' }}>
          {title}
        </h3>

        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {subtitle}
          </p>
          <div className="space-y-1">
            {data.periods.map((period) => (
              <PeriodRow
                key={period.period_start}
                period={period}
                currency={currency}
                formatDate={formatDate}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
