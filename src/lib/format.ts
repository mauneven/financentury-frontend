import { CURRENCIES } from "@/types/budget";

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const locale = currency?.locale || "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
