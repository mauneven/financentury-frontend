"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Home,
  UtensilsCrossed,
  Car,
  Lightbulb,
  PartyPopper,
  Coffee,
  ShoppingCart,
  TrendingUp,
  Landmark,
  Coins,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Currency = "USD" | "EUR" | "COP" | "MXN" | "BRL";

interface IncomePreset {
  label: string;
  value: number;
}

interface FinancialProfile {
  key: string;
  needs: number;
  wants: number;
  savings: number;
  debt: number;
}

interface DayExpense {
  day: number;
  amount: number;
  cumulative: number;
}

interface CategorySlice {
  name: string;
  translationKey: string;
  value: number;
  spent: number;
  color: string;
  icon: React.ReactNode;
}

interface DemoSection {
  name: string;
  translationKey: string;
  icon: React.ReactNode;
  categories: CategorySlice[];
  allocated: number;
  spent: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const PROFILES: FinancialProfile[] = [
  { key: "profileDebtFree", needs: 50, wants: 30, savings: 20, debt: 0 },
  { key: "profileLowDebt", needs: 50, wants: 30, savings: 10, debt: 10 },
  { key: "profileRecovery", needs: 50, wants: 30, savings: 0, debt: 20 },
];

const CATEGORY_COLORS: Record<string, string> = {
  catHousing: "#6366f1",
  catFood: "#f43f5e",
  catTransport: "#f97316",
  catUtilities: "#14b8a6",
  catEntertainment: "#eab308",
  catDining: "#22c55e",
  catShopping: "#ec4899",
  catEmergencyFund: "#3b82f6",
  catInvestment: "#6366f1",
  catDebt: "#f43f5e",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  catHousing: <Home className="size-4" />,
  catFood: <UtensilsCrossed className="size-4" />,
  catTransport: <Car className="size-4" />,
  catUtilities: <Lightbulb className="size-4" />,
  catEntertainment: <PartyPopper className="size-4" />,
  catDining: <Coffee className="size-4" />,
  catShopping: <ShoppingCart className="size-4" />,
  catEmergencyFund: <Landmark className="size-4" />,
  catInvestment: <TrendingUp className="size-4" />,
  catDebt: <Coins className="size-4" />,
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  sectionNeeds: <Home className="size-5" />,
  sectionWants: <PartyPopper className="size-5" />,
  sectionSavings: <Landmark className="size-5" />,
  sectionDebt: <Coins className="size-5" />,
};

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "2px solid var(--foreground)",
  borderRadius: "0",
  fontSize: "0.75rem",
  fontFamily: "monospace",
  boxShadow: "4px 4px 0px var(--foreground)",
  color: "var(--foreground)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    COP: "$",
    MXN: "$",
    BRL: "R$",
  };
  const sym = symbols[currency] || "$";
  if (value >= 1000000) return `${sym}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
  return `${sym}${Math.round(value)}`;
}

function formatFull(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    COP: "$",
    MXN: "$",
    BRL: "R$",
  };
  const sym = symbols[currency] || "$";
  return `${sym}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatAxisValue(value: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    COP: "$",
    MXN: "$",
    BRL: "R$",
  };
  const sym = symbols[currency] || "$";
  if (value >= 1000000) return `${sym}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${sym}${(value / 1000).toFixed(0)}K`;
  return `${sym}${value}`;
}

/** Deterministic seeded pseudo-random number generator */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-500";
  return "bg-emerald-500";
}

function getProgressTextColor(pct: number): string {
  if (pct >= 100) return "text-red-600 dark:text-red-400";
  if (pct >= 90) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function generateAreaChartData(
  income: number,
  profile: FinancialProfile
): DayExpense[] {
  const totalBudget = income * ((profile.needs + profile.wants) / 100);
  const rand = seededRandom(income + profile.needs * 100 + profile.debt * 10);

  const allDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const expenseDays = new Set<number>();
  expenseDays.add(1);
  expenseDays.add(5);
  expenseDays.add(10);
  expenseDays.add(15);
  expenseDays.add(20);
  expenseDays.add(25);

  while (expenseDays.size < 18) {
    const idx = Math.floor(rand() * 30);
    expenseDays.add(allDays[idx]);
  }

  const dayAmounts = new Map<number, number>();
  let remaining = totalBudget;

  const rent = income * (profile.needs / 100) * (0.3 + rand() * 0.1);
  dayAmounts.set(1, rent);
  remaining -= rent;

  const otherDays = Array.from(expenseDays).filter((d) => d !== 1);
  const weights = otherDays.map(() => 0.3 + rand() * 0.7);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  otherDays.forEach((day, i) => {
    const amount = (remaining * weights[i]) / totalWeight;
    const varied = amount * (0.6 + rand() * 0.8);
    dayAmounts.set(day, Math.max(varied, 0));
  });

  let cumulative = 0;
  const data: DayExpense[] = [];
  for (let day = 1; day <= 30; day++) {
    const amount = dayAmounts.get(day) || 0;
    cumulative += amount;
    data.push({
      day,
      amount: Math.round(amount),
      cumulative: Math.round(cumulative),
    });
  }

  return data;
}

function generateSections(
  income: number,
  profile: FinancialProfile
): DemoSection[] {
  const rand = seededRandom(income * 3 + profile.debt * 7);
  const sections: DemoSection[] = [];

  // Needs section
  const needsTotal = income * (profile.needs / 100);
  const needsSplit = [0.4, 0.25, 0.2, 0.15];
  const needsKeys = ["catHousing", "catFood", "catTransport", "catUtilities"];
  const needsCats: CategorySlice[] = needsSplit.map((pct, i) => {
    const allocated = Math.round(needsTotal * pct);
    const spentRatio = 0.55 + rand() * 0.4; // 55-95% spent
    const spent = Math.round(allocated * spentRatio);
    return {
      name: needsKeys[i],
      translationKey: needsKeys[i],
      value: allocated,
      spent,
      color: CATEGORY_COLORS[needsKeys[i]],
      icon: CATEGORY_ICONS[needsKeys[i]],
    };
  });
  const needsSpent = needsCats.reduce((s, c) => s + c.spent, 0);
  sections.push({
    name: "sectionNeeds",
    translationKey: "sectionNeeds",
    icon: SECTION_ICONS["sectionNeeds"],
    categories: needsCats,
    allocated: Math.round(needsTotal),
    spent: needsSpent,
  });

  // Wants section
  const wantsTotal = income * (profile.wants / 100);
  const wantsSplit = [0.35, 0.35, 0.3];
  const wantsKeys = ["catEntertainment", "catDining", "catShopping"];
  const wantsCats: CategorySlice[] = wantsSplit.map((pct, i) => {
    const allocated = Math.round(wantsTotal * pct);
    const spentRatio = 0.4 + rand() * 0.5; // 40-90% spent
    const spent = Math.round(allocated * spentRatio);
    return {
      name: wantsKeys[i],
      translationKey: wantsKeys[i],
      value: allocated,
      spent,
      color: CATEGORY_COLORS[wantsKeys[i]],
      icon: CATEGORY_ICONS[wantsKeys[i]],
    };
  });
  const wantsSpent = wantsCats.reduce((s, c) => s + c.spent, 0);
  sections.push({
    name: "sectionWants",
    translationKey: "sectionWants",
    icon: SECTION_ICONS["sectionWants"],
    categories: wantsCats,
    allocated: Math.round(wantsTotal),
    spent: wantsSpent,
  });

  // Savings section
  if (profile.savings > 0) {
    const savingsTotal = income * (profile.savings / 100);
    const savingsKeys =
      profile.savings >= 20
        ? ["catEmergencyFund", "catInvestment"]
        : ["catEmergencyFund"];
    const savingsSplit =
      profile.savings >= 20 ? [0.5, 0.5] : [1];
    const savingsCats: CategorySlice[] = savingsSplit.map((pct, i) => {
      const allocated = Math.round(savingsTotal * pct);
      const spentRatio = 0.3 + rand() * 0.4; // 30-70% "spent" (saved)
      const spent = Math.round(allocated * spentRatio);
      return {
        name: savingsKeys[i],
        translationKey: savingsKeys[i],
        value: allocated,
        spent,
        color: CATEGORY_COLORS[savingsKeys[i]],
        icon: CATEGORY_ICONS[savingsKeys[i]],
      };
    });
    const savingsSpent = savingsCats.reduce((s, c) => s + c.spent, 0);
    sections.push({
      name: "sectionSavings",
      translationKey: "sectionSavings",
      icon: SECTION_ICONS["sectionSavings"],
      categories: savingsCats,
      allocated: Math.round(savingsTotal),
      spent: savingsSpent,
    });
  }

  // Debt section
  if (profile.debt > 0) {
    const debtTotal = income * (profile.debt / 100);
    const allocated = Math.round(debtTotal);
    const spentRatio = 0.6 + rand() * 0.35;
    const spent = Math.round(allocated * spentRatio);
    const debtCats: CategorySlice[] = [
      {
        name: "catDebt",
        translationKey: "catDebt",
        value: allocated,
        spent,
        color: CATEGORY_COLORS["catDebt"],
        icon: CATEGORY_ICONS["catDebt"],
      },
    ];
    sections.push({
      name: "sectionDebt",
      translationKey: "sectionDebt",
      icon: SECTION_ICONS["sectionDebt"],
      categories: debtCats,
      allocated,
      spent,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
        selected
          ? "bg-foreground text-background"
          : "bg-background text-foreground border-2 border-foreground hover:bg-foreground hover:text-background"
      }`}
    >
      {label}
    </button>
  );
}

function DemoOverviewCards({
  totalBudget,
  totalSpent,
  currency,
  t,
}: {
  totalBudget: number;
  totalSpent: number;
  currency: string;
  t: (key: string) => string;
}) {
  const remaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const isOver = remaining < 0;
  const remainingPct = totalBudget > 0 ? Math.round(((totalBudget - totalSpent) / totalBudget) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Total Budget */}
      <div className="border-2 border-foreground bg-card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          {t("demoTotalBudget")}
        </p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight font-mono text-foreground">
          {formatFull(totalBudget, currency)}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {t("demoMonthly")}
        </p>
      </div>

      {/* Total Spent */}
      <div className="border-2 border-foreground bg-card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          {t("demoTotalSpent")}
        </p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight font-mono text-foreground">
          {formatFull(totalSpent, currency)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-foreground/40" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
            {spentPct}% {t("used")}
          </p>
        </div>
      </div>

      {/* Remaining */}
      <div
        className={cn(
          "border-2 border-foreground bg-card p-4 sm:p-5",
          isOver ? "border-l-4 border-l-red-500" : "border-l-4 border-l-emerald-500"
        )}
      >
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
          {t("demoRemaining")}
        </p>
        <p
          className={cn(
            "mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight font-mono",
            isOver ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {isOver ? "-" : ""}
          {formatFull(Math.abs(remaining), currency)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2",
              isOver ? "bg-red-500" : "bg-emerald-500"
            )}
          />
          <p
            className={cn(
              "text-xs uppercase tracking-wider font-mono",
              isOver ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {remainingPct}% {t("demoRemainingLabel")}
          </p>
        </div>
      </div>
    </div>
  );
}

function DemoSectionCard({
  section,
  currency,
  t,
}: {
  section: DemoSection;
  currency: string;
  t: (key: string) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pct = section.allocated > 0 ? Math.round((section.spent / section.allocated) * 100) : 0;
  const remaining = section.allocated - section.spent;
  const progressColor = getProgressColor(pct);
  const textColor = getProgressTextColor(pct);

  return (
    <div className="border-2 border-foreground bg-card">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-foreground">{section.icon}</span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {t(section.translationKey)}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {section.categories.length} {section.categories.length === 1 ? t("demoCategory") : t("demoCategories")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded((p) => !p)}
              className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="size-3" />
                  <span className="hidden sm:inline">{t("demoCollapse")}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  <span className="hidden sm:inline">{t("demoBreakdown")}</span>
                </>
              )}
            </button>
            <div className="text-right">
              <p className="text-lg sm:text-xl font-bold tabular-nums font-mono text-foreground">
                {formatAmount(section.allocated, currency)}
              </p>
              <p className={cn("text-xs font-bold tabular-nums font-mono", textColor)}>
                {pct}% {t("used")}
              </p>
            </div>
          </div>
        </div>

        {/* Spent / Left */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            {t("demoSpent")}:{" "}
            <span className="font-bold font-mono tabular-nums text-foreground">
              {formatAmount(section.spent, currency)}
            </span>
          </span>
          <span>
            {t("demoLeft")}:{" "}
            <span
              className={cn(
                "font-bold font-mono tabular-nums",
                remaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
              )}
            >
              {remaining < 0 ? "-" : ""}
              {formatAmount(Math.abs(remaining), currency)}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden bg-muted">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        {/* Expandable categories */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-in-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-4 border-t border-border pt-4 space-y-0">
              {section.categories.map((cat, idx) => {
                const catPct = cat.value > 0 ? Math.round((cat.spent / cat.value) * 100) : 0;
                const catProgress = getProgressColor(catPct);
                const catText = getProgressTextColor(catPct);
                const catRemaining = cat.value - cat.spent;

                return (
                  <div
                    key={cat.name}
                    className={cn(
                      "flex flex-col gap-1.5 px-2 py-2.5",
                      idx !== 0 && "border-t border-foreground/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{cat.icon}</span>
                        <span className="text-sm font-bold text-foreground">
                          {t(cat.translationKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold tabular-nums font-mono text-foreground">
                          {formatAmount(cat.value, currency)}
                        </span>
                        <span
                          className={cn(
                            "min-w-[2rem] text-right text-xs font-bold tabular-nums font-mono",
                            catText
                          )}
                        >
                          {catPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden bg-muted">
                      <div
                        className={cn("h-full transition-all duration-300", catProgress)}
                        style={{ width: `${Math.min(catPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {formatAmount(cat.spent, currency)} {t("demoSpent").toLowerCase()}
                      </span>
                      <span
                        className={cn(
                          "font-mono tabular-nums",
                          catRemaining < 0 ? "text-red-600 dark:text-red-400" : ""
                        )}
                      >
                        {catRemaining < 0 ? "-" : ""}
                        {formatAmount(Math.abs(catRemaining), currency)} {t("demoLeft").toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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

  // Generate data
  const areaData = useMemo(
    () => generateAreaChartData(income, profile),
    [income, profile]
  );

  const sections = useMemo(
    () => generateSections(income, profile),
    [income, profile]
  );

  const totalBudget = income;
  const totalSpent = sections.reduce((s, sec) => s + sec.spent, 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const budgetProgressColor = budgetPct >= 100 ? "bg-red-600" : budgetPct >= 75 ? "bg-yellow-500" : "bg-emerald-600";
  const budgetTextColor = budgetPct >= 100 ? "text-red-600 dark:text-red-400" : budgetPct >= 75 ? "text-yellow-600 dark:text-yellow-400" : "text-emerald-600";

  // Flatten for pie chart
  const categoryData = sections.flatMap((sec) => sec.categories);
  const spentPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="w-full">
      {/* ── Controls bar ─────────────────────────────────────── */}
      <div className="border-2 border-foreground bg-card p-4 sm:p-5 space-y-4 mb-4">
        <div className="flex flex-wrap gap-6">
          {/* Currency */}
          <div className="space-y-1.5">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
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
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
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
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
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

      {/* ── Dashboard mock ───────────────────────────────────── */}
      <div className="space-y-4">
        {/* Overview Cards */}
        <DemoOverviewCards
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          currency={currency}
          t={t}
        />

        {/* Budget usage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
              {t("demoOfBudgetUsed")}
            </span>
            <span className={cn("font-bold tabular-nums font-mono", budgetTextColor)}>
              {budgetPct}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden bg-muted border-2 border-foreground">
            <div
              className={cn("h-full transition-all duration-300", budgetProgressColor)}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Area Chart */}
          <div className="lg:col-span-2 border-2 border-foreground bg-card">
            <div className="border-b-2 border-foreground px-5 py-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-foreground">
                {t("spendingTrends")}
              </h3>
            </div>
            <div className="p-4 sm:p-5">
              <div
                className="h-56 sm:h-64 w-full [&_.recharts-surface]:outline-none [&_.recharts-surface:focus]:outline-none"
                style={{ outline: "none" }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={areaData}
                    margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="landing-area-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--foreground)"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--foreground)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="none"
                      stroke="var(--border)"
                      strokeOpacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      ticks={[1, 5, 10, 15, 20, 25, 30]}
                      tick={{
                        fontSize: 10,
                        fill: "var(--muted-foreground)",
                        fontFamily: "monospace",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: "var(--foreground)",
                        strokeWidth: 2,
                      }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "var(--muted-foreground)",
                        fontFamily: "monospace",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) =>
                        formatAxisValue(value, currency)
                      }
                      width={50}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{
                        fontWeight: 700,
                        marginBottom: 4,
                        textTransform: "uppercase" as const,
                        color: "var(--foreground)",
                      }}
                      labelFormatter={(label) => `${t("day")} ${label}`}
                      itemStyle={{ color: "var(--foreground)" }}
                      formatter={(value) => [
                        formatAmount(Number(value), currency),
                        t("cumulative"),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--foreground)"
                      fill="url(#landing-area-gradient)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="border-2 border-foreground bg-card">
            <div className="border-b-2 border-foreground px-5 py-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-foreground">
                {t("breakdown")}
              </h3>
            </div>
            <div className="px-3 sm:px-5 py-5">
              <div className="relative h-44 sm:h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    {/* Background muted ring — no tooltip */}
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive={false}
                      cursor="default"
                      activeShape={undefined}
                      // @ts-expect-error recharts internal prop to suppress tooltip
                      tooltipType="none"
                    >
                      <Cell fill="var(--muted)" />
                    </Pie>
                    {/* Category slices */}
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={1}
                      dataKey="spent"
                      nameKey="translationKey"
                      strokeWidth={2}
                      stroke="var(--background)"
                      startAngle={90}
                      endAngle={90 - (spentPercentage / 100) * 360}
                      isAnimationActive={false}
                      activeShape={undefined}
                      cursor="pointer"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      wrapperStyle={{ zIndex: 50 }}
                      itemStyle={{ color: "var(--foreground)" }}
                      formatter={(value, name) => [
                        formatAmount(Number(value), currency),
                        t(String(name)),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                    {formatAmount(totalSpent, currency)}
                  </p>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {spentPercentage}% {t("used")}
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {categoryData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-1.5 min-h-[24px]"
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate text-xs text-muted-foreground">
                      {t(entry.translationKey)}
                    </span>
                    <span className="ml-auto text-xs font-semibold font-mono tabular-nums text-foreground">
                      {formatAmount(entry.spent, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base font-semibold text-foreground">
              {t("demoSectionBreakdown")}
            </h2>
          </div>
          {sections.map((sec) => (
            <DemoSectionCard
              key={sec.name}
              section={sec}
              currency={currency}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
