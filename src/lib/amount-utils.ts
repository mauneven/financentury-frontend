import { ICON_OPTIONS } from "@/lib/icon-picker";

/** Format a raw number as a comma-separated string (no currency symbol). */
export function formatAmount(value: number): string {
  if (isNaN(value) || value === 0) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Parse a formatted string back to a number. */
export function parseAmount(formatted: string): number {
  const stripped = formatted.replace(/,/g, "");
  return parseFloat(stripped);
}

/** Mask input to formatted money string. */
export function maskAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const decPart = parts.length > 1 ? "." + parts[1].slice(0, 2) : "";
  if (intPart === "") return decPart ? "0" + decPart : "";
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return formatted + decPart;
}

/** Pick a random icon not already used by existing sections/categories. */
export function pickRandomIcon(usedIcons: string[]): string {
  const available = ICON_OPTIONS.filter((o) => !usedIcons.includes(o.key));
  const pool = available.length > 0 ? available : ICON_OPTIONS;
  return pool[Math.floor(Math.random() * pool.length)].key;
}
