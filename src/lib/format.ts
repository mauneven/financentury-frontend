import { CURRENCIES } from "@/types/budget";

// Zero-decimal currencies where fractional digits make no sense.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "COP", "CLP", "ARS", "MXN", "PEN", "JPY", "KRW", "VND", "IDR",
]);

// Cache Intl.NumberFormat instances — construction is expensive (~0.1ms each).
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currencyCode: string): Intl.NumberFormat {
  const key = `${locale}:${currencyCode}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode);
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const locale = currency?.locale || "en-US";
  return getFormatter(locale, currencyCode).format(amount);
}

export function formatCompact(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol || "$";
  const locale = currency?.locale || "en-US";

  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol} ${(abs / 1_000).toFixed(0)}K`;
  }

  return getFormatter(locale, currencyCode).format(amount);
}

export function getPercentage(spent: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.round((spent / budget) * 100);
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 90) return "bg-amber-500";
  return "bg-emerald-500";
}

export function getProgressTextColor(percentage: number): string {
  if (percentage >= 100) return "text-red-600";
  if (percentage >= 90) return "text-amber-600";
  return "text-emerald-600";
}

export function detectCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    const regionMap: Record<string, string> = {
      CO: "COP",
      US: "USD",
      GB: "GBP",
      DE: "EUR",
      FR: "EUR",
      ES: "EUR",
      MX: "MXN",
      BR: "BRL",
      AR: "ARS",
      CL: "CLP",
      PE: "PEN",
    };
    const region = locale.split("-")[1]?.toUpperCase();
    return region ? regionMap[region] || "USD" : "USD";
  } catch {
    return "USD";
  }
}
