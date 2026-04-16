"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetSummary } from "@/types/budget";
import { formatCompact, getPercentage } from "@/lib/format";
import { useTranslations } from "@/i18n/client";

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
  sectionId?: string;
}

export function BreakdownChart({ summary, sectionId }: BreakdownChartProps) {
  const { budget, sections, total_budget, total_spent } = summary;
  const linkedSections = summary.linked_sections ?? [];
  const filteredSections = sectionId
    ? sections.filter((s) => s.section.id === sectionId)
    : sections;

  // Linked categories in scope for chart slices
  const linkedCatsInScope = sectionId
    ? linkedSections
        .filter((ls) => ls.link.source_category_id && ls.link.target_section_id === sectionId)
        .flatMap((ls) => ls.categories)
    : linkedSections.flatMap((ls) => ls.categories);

  const linkedSpent = linkedCatsInScope.reduce((sum, c) => sum + c.total_spent, 0);

  // Budget total: only add section-level link allocations (not category-level).
  // Category-level links live inside existing sections and don't inflate the total.
  const linkedSectionAlloc = linkedSections
    .filter((ls) => !ls.link.source_category_id)
    .reduce((sum, ls) => sum + ls.section.allocation_value, 0);

  const scopedSpent = (sectionId
    ? filteredSections.reduce((sum, s) => sum + s.total_spent, 0)
    : total_spent) + linkedSpent;
  const scopedBudget = sectionId
    ? filteredSections.reduce((sum, s) => sum + s.allocated_amount, 0)
      + linkedCatsInScope.reduce((sum, c) => sum + c.allocated_amount, 0)
    : total_budget + linkedSectionAlloc;
  const spentPercentage = getPercentage(scopedSpent, scopedBudget);
  const remaining = Math.max(scopedBudget - scopedSpent, 0);
  const t = useTranslations("dashboard");

  // Collect all child categories with spending (own + linked)
  const categoryData: {
    name: string;
    value: number;
    allocated: number;
    color: string;
  }[] = [];

  let colorIdx = 0;
  for (const section of filteredSections) {
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
  for (const cat of linkedCatsInScope) {
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

  // If nothing spent, show empty state
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
              {/* Background ring for total budget — shows "Not used yet" on hover */}
              <Pie
                data={[{ name: t("notUsedYet"), value: remaining || 1 }]}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
                cursor="default"
                activeShape={undefined}
              >
                <Cell fill="var(--muted)" />
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
                stroke="var(--background)"
                startAngle={90}
                endAngle={90 - (spentPercentage / 100) * 360}
                isAnimationActive={false}
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
          {/* Center text overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {spentPercentage}%
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
