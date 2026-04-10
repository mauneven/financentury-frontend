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
import { useTranslations } from "@/i18n/client";

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
  value: number;
  color: string;
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
  if (value >= 1000) return `${sym}${Math.round(value / 1000)}K`;
  return `${sym}${Math.round(value)}`;
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

function generateAreaChartData(
  income: number,
  profile: FinancialProfile
): DayExpense[] {
  const totalBudget =
    income * ((profile.needs + profile.wants) / 100);
  const rand = seededRandom(income + profile.needs * 100 + profile.debt * 10);

  // Pick 17 days out of 30 that have expenses
  const allDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const expenseDays = new Set<number>();
  // Always include day 1 (rent), and a few fixed anchor days
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

  // Distribute budget across expense days with variety
  const dayAmounts = new Map<number, number>();
  let remaining = totalBudget;

  // Day 1: rent is the biggest single expense (~30-40% of needs)
  const rent = income * (profile.needs / 100) * (0.3 + rand() * 0.1);
  dayAmounts.set(1, rent);
  remaining -= rent;

  // Spread remaining across other expense days
  const otherDays = Array.from(expenseDays).filter((d) => d !== 1);
  const weights = otherDays.map(() => 0.3 + rand() * 0.7);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  otherDays.forEach((day, i) => {
    const amount = (remaining * weights[i]) / totalWeight;
    // Add some variance
    const varied = amount * (0.6 + rand() * 0.8);
    dayAmounts.set(day, Math.max(varied, 0));
  });

  // Build the full 30-day dataset
  let cumulative = 0;
  const data: DayExpense[] = [];
  for (let day = 1; day <= 30; day++) {
    const amount = dayAmounts.get(day) || 0;
    cumulative += amount;
    data.push({ day, amount: Math.round(amount), cumulative: Math.round(cumulative) });
  }

  return data;
}

function generateCategoryData(
  income: number,
  profile: FinancialProfile
): CategorySlice[] {
  const rand = seededRandom(income * 3 + profile.debt * 7);
  const slices: CategorySlice[] = [];

  // Needs breakdown (housing, food, transport, utilities)
  const needsTotal = income * (profile.needs / 100);
  const needsSplit = [0.4, 0.25, 0.2, 0.15]; // housing, food, transport, utilities
  const needsLabels = ["catHousing", "catFood", "catTransport", "catUtilities"];
  needsSplit.forEach((pct, i) => {
    const val = needsTotal * pct * (0.9 + rand() * 0.2);
    slices.push({
      name: needsLabels[i],
      value: Math.round(val),
      color: CATEGORY_COLORS[needsLabels[i]],
    });
  });

  // Wants breakdown (entertainment, dining, shopping)
  const wantsTotal = income * (profile.wants / 100);
  const wantsSplit = [0.35, 0.35, 0.3];
  const wantsLabels = ["catEntertainment", "catDining", "catShopping"];
  wantsSplit.forEach((pct, i) => {
    const val = wantsTotal * pct * (0.85 + rand() * 0.3);
    slices.push({
      name: wantsLabels[i],
      value: Math.round(val),
      color: CATEGORY_COLORS[wantsLabels[i]],
    });
  });

  // Savings
  if (profile.savings > 0) {
    const savingsTotal = income * (profile.savings / 100);
    const savingsSplit = profile.savings >= 20 ? [0.5, 0.5] : [1];
    const savingsLabels =
      profile.savings >= 20
        ? ["catEmergencyFund", "catInvestment"]
        : ["catEmergencyFund"];
    savingsSplit.forEach((pct, i) => {
      slices.push({
        name: savingsLabels[i],
        value: Math.round(savingsTotal * pct),
        color: CATEGORY_COLORS[savingsLabels[i]],
      });
    });
  }

  // Debt
  if (profile.debt > 0) {
    slices.push({
      name: "catDebt",
      value: Math.round(income * (profile.debt / 100)),
      color: CATEGORY_COLORS["catDebt"],
    });
  }

  return slices;
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LandingCharts() {
  const tLanding = useTranslations("landing");

  const [currency, setCurrency] = useState<Currency>("USD");
  const [incomeIndex, setIncomeIndex] = useState<number>(
    DEFAULT_INCOME_INDEX["USD"]
  );
  const [profileIndex, setProfileIndex] = useState<number>(0);

  const presets = INCOME_PRESETS[currency];
  const income = presets[incomeIndex].value;
  const profile = PROFILES[profileIndex];

  // Reset income index when currency changes
  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    setIncomeIndex(DEFAULT_INCOME_INDEX[c]);
  };

  // Generate chart data
  const areaData = useMemo(
    () => generateAreaChartData(income, profile),
    [income, profile]
  );

  const categoryData = useMemo(
    () => generateCategoryData(income, profile),
    [income, profile]
  );

  const totalSpent = categoryData.reduce((sum, c) => sum + c.value, 0);
  const spentPercentage = Math.round((totalSpent / income) * 100);

  return (
    <div className="w-full space-y-6">
      {/* Currency Selector */}
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
          {tLanding("currency")}
        </p>
        <div className="flex flex-wrap gap-2">
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

      {/* Income Presets */}
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
          {tLanding("monthlyIncome")}
        </p>
        <div className="flex flex-wrap gap-2">
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

      {/* Financial Profile Presets */}
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
          {tLanding("financialProfile")}
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFILES.map((p, i) => (
            <SelectorButton
              key={p.key}
              label={tLanding(p.key)}
              selected={profileIndex === i}
              onClick={() => setProfileIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Area Chart */}
        <div className="lg:col-span-2 border-2 border-foreground bg-card">
          <div className="border-b-2 border-foreground px-6 py-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-foreground">
              {tLanding("spendingTrends")}
            </h3>
          </div>
          <div className="p-6">
            <div
              className="h-64 w-full [&_.recharts-surface]:outline-none [&_.recharts-surface:focus]:outline-none"
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
                    labelFormatter={(label) => `${tLanding("day")} ${label}`}
                    itemStyle={{ color: "var(--foreground)" }}
                    formatter={(value) => [
                      formatAmount(Number(value), currency),
                      tLanding("cumulative"),
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
          <div className="border-b-2 border-foreground px-6 py-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-foreground">
              {tLanding("breakdown")}
            </h3>
          </div>
          <div className="px-3 sm:px-6 py-6">
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Background muted ring */}
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
                    dataKey="value"
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
                    itemStyle={{ color: "var(--foreground)" }}
                    formatter={(value, name) => [
                      formatAmount(Number(value), currency),
                      tLanding(String(name)),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {formatAmount(totalSpent, currency)}
                </p>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {spentPercentage}% {tLanding("used")}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center gap-2 min-h-[28px]"
                >
                  <div
                    className="h-3 w-3 shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate text-xs text-muted-foreground">
                    {tLanding(entry.name)}
                  </span>
                  <span className="ml-auto text-xs font-semibold font-mono tabular-nums text-foreground">
                    {formatAmount(entry.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
