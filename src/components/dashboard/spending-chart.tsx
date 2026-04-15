"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Expense } from "@/types/budget";
import { formatCompact } from "@/lib/format";
import { useTranslations } from "@/i18n/client";

interface SpendingChartProps {
  expenses: Expense[];
  currency: string;
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function SpendingChart({ expenses, currency }: SpendingChartProps) {
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y">("6M");
  const t = useTranslations("dashboard");

  // Group expenses by date and sum amounts.
  const dateTotals = new Map<string, number>();
  for (const exp of expenses) {
    if (exp.expense_date) {
      dateTotals.set(
        exp.expense_date,
        (dateTotals.get(exp.expense_date) || 0) + exp.amount
      );
    }
  }
  const chartData = Array.from(dateTotals.keys())
    .sort()
    .map((date) => ({ date, total: dateTotals.get(date) || 0 }));

  // Filter by selected time range.
  const rangeMonths = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 } as const;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - rangeMonths[range]);
  const filteredData = chartData.filter((d) => new Date(d.date) >= cutoff);

  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="border-2 border-foreground bg-card flex flex-col">
      <div className="border-b-2 border-foreground px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground shrink-0">
          {t("spendingTrends")}
        </h3>
        <div className="flex gap-0.5 sm:gap-1">
          {(["1M", "3M", "6M", "1Y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
                range === r
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
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

  if (filteredData.length === 0) {
    return (
      <ChartWrapper>
        <div className="flex h-52 sm:h-72 items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t("notEnoughData")}
          </p>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper>
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
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="none"
              stroke="var(--border)"
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLabel}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "var(--foreground)", strokeWidth: 2 }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value, currency)}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "2px solid var(--foreground)",
                borderRadius: "0",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                boxShadow: "4px 4px 0px var(--foreground)",
                color: "var(--foreground)",
              }}
              labelFormatter={(label) => formatDayLabel(String(label))}
              labelStyle={{ fontWeight: 700, marginBottom: 4, textTransform: "uppercase", color: "var(--foreground)" }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value) => [
                formatCompact(Number(value), currency),
                "Total",
              ]}
            />
            <Area
              type="natural"
              dataKey="total"
              stroke="var(--foreground)"
              fill="url(#gradient-total)"
              strokeWidth={2}
              dot={{ fill: "var(--foreground)", r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}
