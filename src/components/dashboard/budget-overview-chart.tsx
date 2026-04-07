"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import type { BudgetSummary } from "@/types/budget";
import { formatCompact, getPercentage } from "@/lib/format";
import { useTranslations } from "@/i18n/client";
import { CHART_COLORS } from "@/lib/chart-config";

interface BudgetOverviewChartProps {
  summary: BudgetSummary;
}

export function BudgetOverviewChart({ summary }: BudgetOverviewChartProps) {
  const { budget, categories, total_budget, total_spent } = summary;
  const spentPercentage = getPercentage(total_spent, total_budget);
  const t = useTranslations("dashboard");

  const chartData = categories.map((cat) => ({
    name: cat.category.name,
    value: cat.total_spent,
    allocated: cat.allocated_amount,
  }));

  // If nothing spent yet, show allocated amounts instead
  const hasSpending = total_spent > 0;
  const displayData = hasSpending
    ? chartData
    : categories.map((cat) => ({
        name: cat.category.name,
        value: cat.allocated_amount,
        allocated: cat.allocated_amount,
      }));

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
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {displayData.map((_entry, index) => (
                  <Cell
                    key={index}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
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
          {categories.map((cat, i) => (
            <div key={cat.category.id} className="flex items-center gap-2 min-h-[28px]">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
              <span className="truncate text-sm text-muted-foreground">
                {cat.category.name}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-foreground">
                {formatCompact(cat.total_spent, budget.currency)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
