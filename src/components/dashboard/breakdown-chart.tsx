"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetSummary } from "@/types/budget";
import { formatCompact, getPercentage } from "@/lib/format";
import { useTranslations } from "@/i18n/client";

const CATEGORY_COLORS = [
  "hsl(var(--foreground))",
  "hsl(var(--accent))",
  "#f43f5e",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#3b82f6",
  "#22c55e",
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
      <div className="border-2 border-foreground bg-card">
        <div className="border-b-2 border-foreground px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {t("budgetOverview")}
          </h3>
        </div>
        <div className="p-6">
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {formatCompact(0, budget.currency)}
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("ofBudget")} {formatCompact(total_budget, budget.currency)}
            </p>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              {t("notEnoughData")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground bg-card">
      <div className="border-b-2 border-foreground px-6 py-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
          {t("budgetOverview")}
        </h3>
      </div>
      <div className="px-3 sm:px-6 py-6">
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
                paddingAngle={1}
                dataKey="value"
                strokeWidth={2}
                stroke="hsl(var(--background))"
                startAngle={90}
                endAngle={90 - (spentPercentage / 100) * 360}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--foreground))",
                  borderRadius: "0",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  boxShadow: "4px 4px 0px hsl(var(--foreground))",
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
            <p className="text-xl font-bold font-mono tabular-nums text-foreground">
              {formatCompact(total_spent, budget.currency)}
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("ofBudget")} {formatCompact(total_budget, budget.currency)}
            </p>
            <p className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-muted-foreground">
              {spentPercentage}% {t("used")}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {categoryData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 min-h-[28px]">
              <div
                className="h-3 w-3 shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate text-sm text-muted-foreground">
                {entry.name}
              </span>
              <span className="ml-auto text-sm font-semibold font-mono tabular-nums text-foreground">
                {formatCompact(entry.value, budget.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
