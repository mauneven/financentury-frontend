"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Settings, GripVertical } from "lucide-react";
import type { CategorySummary, Category } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { CategoryIcon } from "@/lib/icon-picker";

interface CategoryCardProps {
  categorySummary: CategorySummary;
  currency: string;
  budgetId: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** dnd-kit listeners + attributes from the parent SortableCell. */
  dragHandleProps?: Record<string, unknown>;
}

/** Fitness-ring style semicircle gauge with centered percent text. */
function SemicircleGauge({
  percent,
  strokeClass,
}: {
  percent: number;
  strokeClass: string;
}) {
  // Arc geometry: 180-degree arc from (10,70) to (130,70) with radius 60.
  // Viewbox 140x80 leaves small padding for stroke width.
  const clamped = Math.min(percent, 100);
  const circumference = Math.PI * 60; // half-circle arc length
  const dashLen = (clamped / 100) * circumference;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 140 80"
        className="w-full h-auto"
        aria-hidden="true"
      >
        {/* Track */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          className="stroke-muted"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          className={cn("transition-all duration-300", strokeClass)}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference}`}
        />
      </svg>
      {/* Percent label centered under arc */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1 flex items-end justify-center pointer-events-none">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function CategoryCard({
  categorySummary,
  currency,
  budgetId,
  dragHandleProps,
}: CategoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.categoryActions");

  const { category, allocated_amount, total_spent } = categorySummary;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const textColor = getProgressTextColor(percentage);
  // Stroke color for the gauge track. Mirror getProgressColor() → tailwind stroke.
  const strokeClass =
    percentage >= 100
      ? "stroke-red-600"
      : percentage >= 75
        ? "stroke-yellow-500"
        : "stroke-emerald-600";

  const reportsHref = `/budget/${budgetId}/category/${category.id}`;
  const rawCategory: Category = category;

  return (
    <div className="relative rounded-xl border border-border bg-card flex flex-col">
      {/* Drag handle — top right */}
      {dragHandleProps && (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="absolute right-1.5 top-1.5 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
          {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <GripVertical className="size-3.5" strokeWidth={1.8} />
        </button>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header: icon + name */}
        <div className="flex items-center gap-2 min-w-0 pr-6">
          <span className="shrink-0" role="img" aria-label={category.name}>
            <CategoryIcon iconKey={category.icon} className="size-5" />
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {category.name}
          </h3>
        </div>

        {/* Semicircle gauge with centered % */}
        <div className="px-2">
          <SemicircleGauge percent={percentage} strokeClass={strokeClass} />
        </div>

        {/* Remaining (big) */}
        <div className="text-center -mt-1">
          <p className="text-xs text-muted-foreground">{t("leftLabel")}</p>
          <p
            className={cn(
              "text-xl font-semibold tabular-nums",
              remaining < 0 ? "text-red-600 dark:text-red-400" : textColor
            )}
          >
            {remaining < 0 ? "-" : ""}
            {formatCurrency(Math.abs(remaining), currency)}
          </p>
        </div>

        {/* Allocated (smaller) */}
        <div className="text-center text-xs text-muted-foreground tabular-nums">
          {formatCurrency(allocated_amount, currency)} {t("ofBudget")}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => router.push(reportsHref)}
            className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted flex items-center justify-center gap-1"
          >
            <BarChart3 className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{tActions("reports")}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
            className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted flex items-center justify-center gap-1"
          >
            <Settings className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{tActions("adjust")}</span>
          </button>
        </div>
      </div>

      <EditCategoryDialog
        category={rawCategory}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
