"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import type { BudgetSummary } from "@/types/budget";
import { formatCompact, getPercentage } from "@/lib/format";
import { useTranslations } from "@/i18n/client";

const CATEGORY_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#e11d48",
];

interface BreakdownChartProps {
  summary: BudgetSummary;
}

export function BreakdownChart({ summary }: BreakdownChartProps) {
  const { budget, categories: sections, total_budget, total_spent } = summary;
  const spentPercentage = getPercentage(total_spent, total_budget);
  const t = useTranslations("dashboard");

  // Collect all child categories with spending
  const categoryData: {
    name: string;
    value: number;
    allocated: number;
    color: string;
  }[] = [];

  let colorIdx = 0;
  for (const section of sections) {
    for (const cat of section.categories) {
      if (cat.total_spent > 0) {
        categoryData.push({
          name: cat.category.name,
          value: cat.total_spent,
          allocated: cat.allocated_amount,
          color: CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length],
        });
        colorIdx++;
      }
    }
  }

  // If nothing spent, show empty state
  if (categoryData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5 text-muted-foreground" />
            {t("budgetOverview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 flex-col items-center justify-center gap-2">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-foreground">
                  {formatCompact(0, budget.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("ofBudget")} {formatCompact(total_budget, budget.currency)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("notEnoughData")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          {t("budgetOverview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="relative h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Background ring for total budget */}
              <Pie
                data={[{ value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                <Cell fill="hsl(var(--muted))" />
              </Pie>
              {/* Category spending slices */}
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={90 - (spentPercentage / 100) * 360}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                }}
                formatter={(value, name) => [
                  formatCompact(Number(value), budget.currency),
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold text-foreground">
              {formatCompact(total_spent, budget.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("ofBudget")} {formatCompact(total_budget, budget.currency)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted-foreground">
              {spentPercentage}% {t("used")}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {categoryData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 min-h-[28px]">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate text-sm text-muted-foreground">
                {entry.name}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-foreground">
                {formatCompact(entry.value, budget.currency)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
