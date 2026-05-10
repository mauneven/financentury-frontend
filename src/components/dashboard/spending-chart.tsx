"use client";

import { useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslations } from "@/i18n/client";
import { formatCompact } from "@/lib/format";
import type { Expense } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";

interface SpendingChartProps {
  expenses: Expense[];
  currency: string;
}

function makeDayLabelFormatter(locale: string): (dateStr: string) => string {
  return (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };
}

type Range = "1M" | "3M" | "6M" | "1Y";

function ChartWrapper({
  title,
  range,
  onRangeChange,
  children,
}: {
  title: string;
  range: Range;
  onRangeChange: (r: Range) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground shrink-0">
          {title}
        </h3>
        <div className="flex gap-0.5 sm:gap-1">
          {(["1M", "3M", "6M", "1Y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">{children}</div>
    </div>
  );
}

export function SpendingChart({ expenses, currency }: SpendingChartProps) {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const locale = currencyInfo?.locale || "en-US";
  const formatDayLabel = makeDayLabelFormatter(locale);
  const [range, setRange] = useState<Range>("6M");
  const t = useTranslations("dashboard");

  // Group expenses (own + linked) by date and sum amounts.
  const dateTotals = new Map<string, number>();
  for (const exp of expenses) {
    if (!exp?.expense_date) continue;
    const amount = Number(exp.amount);
    if (!Number.isFinite(amount)) continue;
    // Normalize to YYYY-MM-DD so timestamps and date-only both bucket daily.
    const dayKey = exp.expense_date.slice(0, 10);
    dateTotals.set(dayKey, (dateTotals.get(dayKey) ?? 0) + amount);
  }

  // Zero-fill every day from cutoff → today so the line reflects real daily
  // spending (with 0 on idle days) instead of connecting sparse expense-days
  // into an apparent upward climb.
  const rangeMonths = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 } as const;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - rangeMonths[range]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredData: { date: string; total: number }[] = [];
  const cursor = new Date(cutoff);
  while (cursor <= today) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    filteredData.push({ date: iso, total: dateTotals.get(iso) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // If the user has no expenses in the range at all, treat as empty state.
  const hasAnySpend = filteredData.some((d) => d.total > 0);
  if (!hasAnySpend) {
    filteredData.length = 0;
  }

  if (filteredData.length === 0) {
    return (
      <ChartWrapper title={t("spendingTrends")} range={range} onRangeChange={setRange}>
        <div className="flex h-52 sm:h-72 items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t("notEnoughData")}
          </p>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper title={t("spendingTrends")} range={range} onRangeChange={setRange}>
      <div
        className="h-52 sm:h-72 w-full [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:focus:outline-none [&_*]:focus:outline-none"
        style={{ outline: "none" }}
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradient-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLabel}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value, currency)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontSize: "0.75rem",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                color: "var(--foreground)",
              }}
              labelFormatter={(label) => formatDayLabel(String(label))}
              labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--foreground)" }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value) => [
                formatCompact(Number(value), currency),
                t("totalSpent"),
              ]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--foreground)"
              fill="url(#gradient-total)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ fill: "var(--foreground)", r: 3, strokeWidth: 0 }}
              isAnimationActive
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}
