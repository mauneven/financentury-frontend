"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Link2, GripVertical } from "lucide-react";
import type { LinkedCategorySummary } from "@/types/budget";
import {
  formatCurrency,
  getPercentage,
  getProgressTextColor,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { ManageLinkDialog } from "@/components/budget/manage-link-dialog";

interface LinkedCategoryCardProps {
  linked: LinkedCategorySummary;
  currency: string;
  /** Target budget id — we keep the URL scoped to the viewer's budget. */
  budgetId: string;
  onAddExpense: (sourceBudgetId: string, preselectedCategoryId?: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** dnd-kit listeners + attributes from the parent SortableCell. */
  dragHandleProps?: Record<string, unknown>;
}

function SemicircleGauge({
  percent,
  strokeClass,
}: {
  percent: number;
  strokeClass: string;
}) {
  const clamped = Math.min(percent, 100);
  const circumference = Math.PI * 60;
  const dashLen = (clamped / 100) * circumference;

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 140 80" className="w-full h-auto" aria-hidden="true">
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          className="stroke-muted"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          className={cn("transition-all duration-300", strokeClass)}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1 flex items-end justify-center pointer-events-none">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function LinkedCategoryCard({
  linked,
  currency,
  budgetId,
  dragHandleProps,
}: LinkedCategoryCardProps) {
  const [manageLinkOpen, setManageLinkOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tActions = useTranslations("dashboard.categoryActions");

  const { link, source_budget, category: categorySummary } = linked;
  const { category, allocated_amount, total_spent } = categorySummary;

  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const textColor = getProgressTextColor(percentage);
  const strokeClass =
    percentage >= 100
      ? "stroke-red-600"
      : percentage >= 75
        ? "stroke-yellow-500"
        : "stroke-emerald-600";

  return (
    <div className="relative rounded-xl border border-border border-dashed bg-card flex flex-col">
      {/* Top-right controls: gear (manage link) | grip (drag) */}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 z-10">
        <button
          type="button"
          aria-label={tActions("adjust")}
          onClick={(e) => {
            e.stopPropagation();
            setManageLinkOpen(true);
          }}
          className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted"
        >
          <Settings className="size-3.5" strokeWidth={1.8} />
        </button>
        {dragHandleProps && (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
            {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <GripVertical className="size-3.5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(`/budget/${budgetId}/category/${category.id}`)
        }
        className="p-4 flex flex-col gap-3 flex-1 text-left rounded-xl hover:bg-muted/40 transition-colors"
      >
        {/* Header: icon + name + small link indicator */}
        <div
          className="flex items-center gap-2 min-w-0 pr-14"
          title={source_budget.name}
        >
          <span className="shrink-0">
            <CategoryIcon iconKey={category.icon} className="size-5" />
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {category.name}
          </h3>
          <Link2
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.8}
            aria-label={source_budget.name}
          />
        </div>

        {/* Gauge */}
        <div className="px-2">
          <SemicircleGauge percent={percentage} strokeClass={strokeClass} />
        </div>

        {/* Remaining big */}
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

        {/* Allocated */}
        <div className="text-center text-xs text-muted-foreground tabular-nums">
          {formatCurrency(allocated_amount, currency)} {t("ofBudget")}
        </div>
      </button>

      <ManageLinkDialog
        link={link}
        sourceBudgetName={source_budget.name}
        categoryName={category.name}
        open={manageLinkOpen}
        onOpenChange={setManageLinkOpen}
      />
    </div>
  );
}
