"use client";

import { RefreshCw, Loader2, Settings } from "lucide-react";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";
import { OverviewCards } from "./overview-cards";
import { CategoryCard } from "./category-card";
import { SpendingChart } from "./spending-chart";
import { BudgetOverviewChart } from "./budget-overview-chart";
import { EmptyDashboard } from "./empty-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { BILLING_PERIODS } from "@/types/budget";
import Link from "next/link";

interface BudgetDashboardProps {
  budgetId: string;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-7 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardContent className="p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-64 animate-pulse rounded-full bg-muted" />
          </CardContent>
        </Card>
      </div>

      {/* Category cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BudgetDashboard({ budgetId }: BudgetDashboardProps) {
  const { summary, loading, error, setActiveBudget, refreshSummary } =
    useBudgetStore();
  const { mode } = useAuthStore();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  if (loading && !summary) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <RefreshCw className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-foreground">
            {t("errorLoading")}
          </h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setActiveBudget(budgetId)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            {tc("retry")}
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return <EmptyDashboard />;
  }

  const { budget, categories, total_spent } = summary;
  const billingLabel =
    BILLING_PERIODS.find((p) => p.value === budget.billing_period_months)
      ?.label ?? `${budget.billing_period_months} months`;

  const hasAnySpending = total_spent > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: 'var(--text-fluid-xl)' }}>{budget.name}</h1>
            <Link
              href={`/${mode === "local" ? "localBudget" : "budget"}/${budgetId}/settings`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              aria-label="Budget settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
          <p className="mt-1.5 text-muted-foreground" style={{ fontSize: 'var(--text-fluid-base)' }}>
            {budget.currency} &middot; {billingLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshSummary}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t("refresh")}</span>
        </button>
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
            <BudgetOverviewChart summary={summary} />
          </div>
        </div>
      ) : (
        <SpendingChart budgetId={budgetId} currency={budget.currency} />
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="space-y-5">
          <h2 className="font-semibold tracking-tight text-foreground" style={{ fontSize: 'var(--text-fluid-lg)' }}>
            {t("categoryBreakdown")}
          </h2>
          <div className="space-y-4 sm:space-y-5">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.category.id}
                categorySummary={cat}
                currency={budget.currency}
              />
            ))}
          </div>
        </div>
      )}

      {!hasAnySpending && categories.length === 0 && <EmptyDashboard />}
    </div>
  );
}
