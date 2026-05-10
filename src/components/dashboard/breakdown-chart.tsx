"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useTranslations } from "@/i18n/client";
import { formatCompact, getPercentage } from "@/lib/format";
import type { BudgetSummary } from "@/types/budget";

const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#f97316", // orange
  "#14b8a6", // teal
  "#eab308", // yellow
  "#ec4899", // pink
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#e11d48", // crimson
  "#06b6d4", // cyan
  "#84cc16", // lime
];

interface BreakdownChartProps {
  summary: BudgetSummary;
}

export function BreakdownChart({ summary }: BreakdownChartProps) {
  const { budget, categories, total_budget, total_spent } = summary;
  const linkedCategories = summary.linked_categories ?? [];

  // Budget envelope is fixed at monthly_income. Linked categories are slices
  // of it, not additions. Backend `total_spent` already includes linked spend.
  const scopedSpent = total_spent;
  const scopedBudget = total_budget;
  const spentPercentage = getPercentage(scopedSpent, scopedBudget);
  // Cap the arc at a full circle so over-budget doesn't overlap itself.
  const arcPercentage = Math.min(spentPercentage, 100);
  const remaining = Math.max(scopedBudget - scopedSpent, 0);
  const t = useTranslations("dashboard");

  // Collect each category with spending > 0 (own + linked, flat).
  const categoryData: {
    name: string;
    value: number;
    allocated: number;
    color: string;
  }[] = [];

  let colorIdx = 0;
  for (const c of categories) {
    if (c.total_spent > 0) {
      categoryData.push({
        name: c.category.name,
        value: c.total_spent,
        allocated: c.allocated_amount,
        color: CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length],
      });
      colorIdx++;
    }
  }
  for (const l of linkedCategories) {
    if (l.category.total_spent > 0) {
      categoryData.push({
        name: l.category.category.name,
        value: l.category.total_spent,
        allocated: l.category.allocated_amount,
        color: CATEGORY_COLORS[colorIdx % CATEGORY_COLORS.length],
      });
      colorIdx++;
    }
  }

  if (categoryData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col">
        <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("budgetOverview")}
          </h3>
        </div>
        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
          <div className="flex h-44 sm:h-56 flex-col items-center justify-center gap-3">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              0%
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
    <div className="rounded-xl border border-border bg-card flex flex-col">
      <div className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("budgetOverview")}
        </h3>
      </div>
      <div className="px-3 sm:px-6 py-4 sm:py-6 flex-1">
        <div
          className="relative h-52 sm:h-72 w-full [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:focus:outline-none [&_*]:focus:outline-none"
          style={{ outline: "none" }}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ name: t("notUsedYet"), value: remaining || 1 }]}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="value"
                strokeWidth={0}
                isAnimationActive
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
                cursor="default"
                activeShape={undefined}
              >
                <Cell fill="var(--muted)" />
              </Pie>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={1}
                dataKey="value"
                strokeWidth={2}
                stroke="var(--background)"
                startAngle={90}
                endAngle={90 - (arcPercentage / 100) * 360}
                isAnimationActive
                animationBegin={150}
                animationDuration={800}
                animationEasing="ease-out"
                cursor="default"
                activeShape={undefined}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "var(--foreground)",
                }}
                wrapperStyle={{ zIndex: 50 }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(value, name) => [
                  formatCompact(Number(value), budget.currency),
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {spentPercentage}%
            </p>
          </div>
        </div>

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
              <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                {formatCompact(entry.value, budget.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
