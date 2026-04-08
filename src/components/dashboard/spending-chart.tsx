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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { budgetApi } from "@/lib/api";
import type { TrendsResponse } from "@/types/budget";
import { formatCompact } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-config";
import { useTranslations } from "@/i18n/client";
import { useAuthStore } from "@/store/auth-store";
import { useBudgetStore } from "@/store/budget-store";

interface SpendingChartProps {
  budgetId: string;
  currency: string;
}

export function SpendingChart({ budgetId, currency }: SpendingChartProps) {
  const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("dashboard");
  const { mode } = useAuthStore();
  const expenses = useBudgetStore((s) => s.expenses);
  const summary = useBudgetStore((s) => s.summary);

  useEffect(() => {
    let cancelled = false;

    if (mode === "local") {
      // Compute trends from local expenses grouped by month and category
      if (summary && expenses.length > 0) {
        const categoryMap = new Map<string, { id: string; name: string }>();
        for (const cat of summary.categories) {
          for (const sub of cat.categories) {
            categoryMap.set(sub.category.id, {
              id: cat.category.id,
              name: cat.category.name,
            });
          }
        }

        const grouped = new Map<string, Map<string, number>>();
        for (const exp of expenses) {
          const month = exp.expense_date.slice(0, 7); // "YYYY-MM"
          const catInfo = categoryMap.get(exp.category_id);
          if (!catInfo) continue;
          if (!grouped.has(catInfo.name)) grouped.set(catInfo.name, new Map());
          const monthMap = grouped.get(catInfo.name)!;
          monthMap.set(month, (monthMap.get(month) || 0) + exp.amount);
        }

        const localTrends: TrendsResponse = {
          budget_id: budgetId,
          categories: Array.from(grouped.entries()).map(([name, monthMap]) => ({
            category_id: categoryMap.get(
              [...categoryMap.entries()].find(([, v]) => v.name === name)?.[0] || ""
            )?.id || "",
            category_name: name,
            months: Array.from(monthMap.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, total]) => ({ month, total_spent: total })),
          })),
        };
        setTrendsData(localTrends);
      } else {
        setTrendsData(null);
      }
      setLoading(false);
      return;
    }

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
  }, [budgetId, mode, expenses, summary]);

  // Transform nested TrendsResponse into recharts-friendly flat rows keyed by month.
  // Each row: { month: string, [categoryName]: number }
  const categoryNames: string[] = [];
  const chartData: Record<string, string | number>[] = [];

  if (trendsData && trendsData.categories.length > 0) {
    // Collect all months across all categories (sorted).
    const monthSet = new Set<string>();
    for (const cat of trendsData.categories) {
      categoryNames.push(cat.category_name);
      for (const m of cat.months) {
        monthSet.add(m.month);
      }
    }
    const sortedMonths = Array.from(monthSet).sort();

    for (const month of sortedMonths) {
      const row: Record<string, string | number> = { month };
      for (const cat of trendsData.categories) {
        const monthEntry = cat.months.find((m) => m.month === month);
        row[cat.category_name] = monthEntry ? monthEntry.total_spent : 0;
      }
      chartData.push(row);
    }
  }

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            {t("spendingTrends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            {t("spendingTrends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t("errorLoading")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            {t("spendingTrends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("notEnoughData")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          {t("spendingTrends")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                {categoryNames.map((name, i) => (
                  <linearGradient
                    key={name}
                    id={`gradient-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS[i % CHART_COLORS.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  formatCompact(value, currency)
                }
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value, name) => [
                  formatCompact(Number(value), currency),
                  String(name),
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "0.8125rem" }}
              />
              {categoryNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#gradient-${i})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
