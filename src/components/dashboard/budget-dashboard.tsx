"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, Settings, Plus } from "lucide-react";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";
import { OverviewCards } from "./overview-cards";
import { SectionCard } from "./section-card";
import { EmptyDashboard } from "./empty-dashboard";
import { BILLING_PERIODS } from "@/types/budget";
import { AddSectionDialog } from "@/components/budget/add-section-dialog";
import Link from "next/link";

// Lazy-load chart components (they import recharts which is heavy)
const SpendingChart = dynamic(
  () => import("./spending-chart").then((mod) => ({ default: mod.SpendingChart })),
  {
    loading: () => (
      <div className="border-2 border-foreground bg-card p-6">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 h-64 animate-pulse bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

const BreakdownChart = dynamic(
  () => import("./breakdown-chart").then((mod) => ({ default: mod.BreakdownChart })),
  {
    loading: () => (
      <div className="border-2 border-foreground bg-card p-6">
        <div className="h-4 w-28 animate-pulse bg-muted" />
        <div className="mt-4 h-64 animate-pulse bg-muted" />
      </div>
    ),
    ssr: false,
  }
);

interface BudgetDashboardProps {
  budgetId: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse bg-muted" />
        <div className="h-4 w-32 animate-pulse bg-muted" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-7 w-28 animate-pulse bg-muted" />
              <div className="h-3 w-20 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-2 border-foreground bg-card p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
        <div className="border-2 border-foreground bg-card p-6">
          <div className="h-4 w-28 animate-pulse bg-muted" />
          <div className="mt-4 h-64 animate-pulse bg-muted" />
        </div>
      </div>

      {/* Category cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 animate-pulse bg-muted" />
                  <div className="h-3 w-16 animate-pulse bg-muted" />
                </div>
              </div>
              <div className="h-4 w-10 animate-pulse bg-muted" />
            </div>
            <div className="mt-4 h-4 w-full animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetDashboard({ budgetId }: BudgetDashboardProps) {
  const summary = useBudgetStore((s) => s.summary);
  const loading = useBudgetStore((s) => s.loading);
  const error = useBudgetStore((s) => s.error);
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const mode = useAuthStore((s) => s.mode);
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [addSectionOpen, setAddSectionOpen] = useState(false);

  // Show loading skeleton only on initial load (no summary and loading)
  // Once summary exists, show content even if still loading (e.g., refreshing data)
  if (!summary && loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="border-2 border-foreground bg-card">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-red-500 bg-red-50 dark:bg-red-950/30">
            <RefreshCw className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">
            {t("errorLoading")}
          </h3>
          <p className="mb-4 max-w-sm text-base text-muted-foreground">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setActiveBudget(budgetId)}
            className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider text-background border-2 border-foreground shadow-[4px_4px_0px_hsl(var(--foreground)/0.2)] transition-all duration-200 hover:shadow-[2px_2px_0px_hsl(var(--foreground)/0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <RefreshCw className="h-4 w-4" />
            {tc("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <EmptyDashboard />;
  }

  const { budget, sections, total_spent } = summary;
  const billingLabel =
    BILLING_PERIODS.find((p) => p.value === budget.billing_period_months)
      ?.label ?? `${budget.billing_period_months} months`;

  const hasAnySpending = total_spent > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: 'var(--text-fluid-xl)' }}>{budget.name}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {budget.currency} &middot; {billingLabel}
          </p>
        </div>
        <Link
          href={`/${mode === "local" ? "localBudget" : "budget"}/${budgetId}/settings`}
          className="inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground border-2 border-foreground"
          aria-label="Budget settings"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      {/* Overview cards */}
      <OverviewCards summary={summary} />

      {/* Charts row */}
      {hasAnySpending ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart budgetId={budgetId} currency={budget.currency} />
          </div>
          <div>
            <BreakdownChart summary={summary} />
          </div>
        </div>
      ) : (
        <SpendingChart budgetId={budgetId} currency={budget.currency} />
      )}

      {/* Section breakdown */}
      {sections.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
              {t("categoryBreakdown")}
            </h2>
            <button
              type="button"
              onClick={() => setAddSectionOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3.5" />
              {t("addSection")}
            </button>
          </div>
          <div className="space-y-4 sm:space-y-5">
            {sections.map((cat) => (
              <SectionCard
                key={cat.section.id}
                sectionSummary={cat}
                currency={budget.currency}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyDashboard />
      )}

      {/* Add Section Dialog */}
      <AddSectionDialog
        budgetId={budgetId}
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
      />
    </div>
  );
}
