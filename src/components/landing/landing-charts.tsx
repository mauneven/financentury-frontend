"use client";

import { useMemo, useState } from "react";

import { BreakdownChart } from "@/components/dashboard/breakdown-chart";
import { CategoryCard } from "@/components/dashboard/category-card";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  BALANCED_CATEGORIES,
  type BudgetMode,
  type BudgetSummary,
  type CategorySummary,
  type CategoryTemplate,
  DEBT_FREE_CATEGORIES,
  DEBT_PAYOFF_CATEGORIES,
  type Expense,
} from "@/types/budget";

type Currency = "USD" | "EUR" | "COP" | "MXN" | "BRL";

interface IncomePreset {
  label: string;
  value: number;
}

interface ProfileOption {
  key: string;
  mode: BudgetMode;
  template: CategoryTemplate;
}

const CURRENCIES: Currency[] = ["USD", "EUR", "COP", "MXN", "BRL"];

const INCOME_PRESETS: Record<Currency, IncomePreset[]> = {
  USD: [
    { label: "$3K", value: 3000 },
    { label: "$4K", value: 4000 },
    { label: "$5K", value: 5000 },
    { label: "$6K", value: 6000 },
    { label: "$8K", value: 8000 },
  ],
  EUR: [
    { label: "\u20AC2.5K", value: 2500 },
    { label: "\u20AC3K", value: 3000 },
    { label: "\u20AC4K", value: 4000 },
    { label: "\u20AC5K", value: 5000 },
    { label: "\u20AC6K", value: 6000 },
  ],
  COP: [
    { label: "$1.5M", value: 1500000 },
    { label: "$2M", value: 2000000 },
    { label: "$2.5M", value: 2500000 },
    { label: "$3M", value: 3000000 },
    { label: "$4M", value: 4000000 },
  ],
  MXN: [
    { label: "$15K", value: 15000 },
    { label: "$20K", value: 20000 },
    { label: "$25K", value: 25000 },
    { label: "$30K", value: 30000 },
    { label: "$40K", value: 40000 },
  ],
  BRL: [
    { label: "R$3K", value: 3000 },
    { label: "R$4K", value: 4000 },
    { label: "R$5K", value: 5000 },
    { label: "R$6K", value: 6000 },
    { label: "R$8K", value: 8000 },
  ],
};

const DEFAULT_INCOME_INDEX: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  COP: 2,
  MXN: 2,
  BRL: 2,
};

const PROFILES: ProfileOption[] = [
  { key: "profileDebtFree", mode: "debt-free", template: DEBT_FREE_CATEGORIES },
  { key: "profileLowDebt", mode: "balanced", template: BALANCED_CATEGORIES },
  { key: "profileRecovery", mode: "debt-payoff", template: DEBT_PAYOFF_CATEGORIES },
];

function seededRandom(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function SelectorButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground hover:bg-muted/80"
      )}
    >
      {label}
    </button>
  );
}

function buildSummary(
  income: number,
  currency: Currency,
  profile: ProfileOption,
  rand: () => number
): { summary: BudgetSummary; expenses: Expense[] } {
  const now = new Date().toISOString();
  const budgetId = "landing-demo";

  const categories: CategorySummary[] = profile.template.map((tpl, i) => {
    const allocated = Math.round(income * (tpl.pct / 100));
    const spentRatio = 0.4 + rand() * 0.55;
    const spent = Math.round(allocated * spentRatio);
    return {
      category: {
        id: `${budgetId}-cat-${i}`,
        budget_id: budgetId,
        name: tpl.name,
        allocation_value: allocated,
        icon: tpl.icon,
        sort_order: i,
        created_at: now,
      },
      allocated_amount: allocated,
      total_spent: spent,
      expense_count: Math.round(spent / 50) + 1,
    };
  });

  const total_spent = categories.reduce((s, c) => s + c.total_spent, 0);

  const summary: BudgetSummary = {
    budget: {
      id: budgetId,
      user_id: "landing-user",
      name: "Demo Budget",
      icon: "landmark",
      monthly_income: income,
      currency,
      billing_period_months: 1,
      billing_cutoff_day: 1,
      mode: profile.mode,
      created_at: now,
      updated_at: now,
    },
    categories,
    total_budget: income,
    total_spent,
  };

  // Build 6 months of expense history, descending to the current month.
  const expenses: Expense[] = [];
  const today = new Date();
  let eid = 0;
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const base = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    // Each category scatters ~6 expenses across the month. Scale magnitude
    // with a per-month drift so the spending-trend line isn't flat.
    const monthDrift = 0.7 + rand() * 0.6;
    for (const c of categories) {
      const target = c.total_spent * monthDrift;
      const ticks = 5 + Math.floor(rand() * 3);
      const weights = Array.from({ length: ticks }, () => 0.3 + rand());
      const wsum = weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < ticks; i++) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const amount = Math.round((target * weights[i]) / wsum);
        if (amount <= 0) continue;
        expenses.push({
          id: `exp-${eid++}`,
          budget_id: budgetId,
          category_id: c.category.id,
          amount,
          description: c.category.name,
          expense_date: iso,
          created_at: now,
        });
      }
    }
  }

  return { summary, expenses };
}

export function LandingCharts() {
  const t = useTranslations("landing");

  const [currency, setCurrency] = useState<Currency>("USD");
  const [incomeIndex, setIncomeIndex] = useState<number>(
    DEFAULT_INCOME_INDEX["USD"]
  );
  const [profileIndex, setProfileIndex] = useState<number>(0);

  const presets = INCOME_PRESETS[currency];
  const income = presets[incomeIndex].value;
  const profile = PROFILES[profileIndex];

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    setIncomeIndex(DEFAULT_INCOME_INDEX[c]);
  };

  const { summary, expenses } = useMemo(() => {
    const seed =
      income +
      profileIndex * 97 +
      (currency.charCodeAt(0) + currency.charCodeAt(1)) * 13;
    return buildSummary(income, currency, profile, seededRandom(seed));
  }, [income, currency, profile, profileIndex]);

  return (
    <div className="w-full">
      {/* ── Controls bar ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4 mb-6">
        <div className="flex flex-wrap gap-6">
          {/* Currency */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("currency")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CURRENCIES.map((c) => (
                <SelectorButton
                  key={c}
                  label={c}
                  selected={currency === c}
                  onClick={() => handleCurrencyChange(c)}
                />
              ))}
            </div>
          </div>

          {/* Income */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("monthlyIncome")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, i) => (
                <SelectorButton
                  key={p.label}
                  label={p.label}
                  selected={incomeIndex === i}
                  onClick={() => setIncomeIndex(i)}
                />
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("financialProfile")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PROFILES.map((p, i) => (
                <SelectorButton
                  key={p.key}
                  label={t(p.key)}
                  selected={profileIndex === i}
                  onClick={() => setProfileIndex(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real dashboard components below — identical to /budget/[id]. */}
      <div className="space-y-6">
        <OverviewCards summary={summary} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart expenses={expenses} currency={currency} />
          </div>
          <BreakdownChart summary={summary} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summary.categories.map((c) => (
            <CategoryCard
              key={c.category.id}
              categorySummary={c}
              currency={currency}
              budgetId={summary.budget.id}
              readOnly
            />
          ))}
        </div>
      </div>
    </div>
  );
}
