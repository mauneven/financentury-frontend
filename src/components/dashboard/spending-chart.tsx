"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { budgetApi } from "@/lib/api";
import type { TrendsResponse } from "@/types/budget";
import { formatCompact } from "@/lib/format";
import { useTranslations } from "@/i18n/client";

interface SpendingChartProps {
  budgetId: string;
  currency: string;
  categoryIds?: string[];
}

function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function SpendingChart({ budgetId, currency, categoryIds }: SpendingChartProps) {
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("dashboard");

  useEffect(() => {
    let cancelled = false;

    async function fetchTrends() {
      setLoading(true);
      setError(null);
      try {
        const data = await budgetApi.trends(budgetId);
        if (!cancelled) {
          setTrendsData(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrends();
    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  // Transform nested TrendsResponse into recharts-friendly flat rows — single total line.
  const chartData: { date: string; total: number }[] = [];

  if (trendsData && trendsData.categories.length > 0) {
    const categoryIdSet = categoryIds ? new Set(categoryIds) : null;
    const dateTotals = new Map<string, number>();
    for (const cat of trendsData.categories) {
      if (categoryIdSet && !categoryIdSet.has(cat.category_id)) continue;
      for (const m of cat.months) {
        dateTotals.set(m.month, (dateTotals.get(m.month) || 0) + m.total_spent);
      }
    }
    const sortedDates = Array.from(dateTotals.keys()).sort();
    for (const date of sortedDates) {
      chartData.push({ date, total: dateTotals.get(date) || 0 });
    }
  }

  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="border-2 border-foreground bg-card">
      <div className="border-b-2 border-foreground px-6 py-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {t("spendingTrends")}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <ChartWrapper>
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ChartWrapper>
    );
  }

  if (error) {
    return (
      <ChartWrapper>
        <div className="flex h-72 flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("errorLoading")}
          </p>
        </div>
      </ChartWrapper>
    );
  }

  if (chartData.length === 0) {
    return (
      <ChartWrapper>
        <div className="flex h-72 items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground">
            {t("notEnoughData")}
          </p>
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
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
              tickFormatter={(value: number) =>
                formatCompact(value, currency)
              }
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
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}
