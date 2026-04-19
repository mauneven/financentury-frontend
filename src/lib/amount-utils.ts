import { ICON_OPTIONS } from "@/lib/icon-picker";

// ---------------------------------------------------------------------------
// Locale-aware numeric separator detection
// ---------------------------------------------------------------------------
//
// Locales fall into two camps:
//   • comma = thousands, dot = decimal   → en-US, en-GB, ja-JP, es-MX, es-PE
//   • dot = thousands, comma = decimal   → de-DE, es-CO, es-AR, es-CL, pt-BR
//
// The previous implementation hardcoded en-US separators, which meant typing
// "1,5" in an es-CO or de-DE context (intended "one-and-a-half") parsed as 15.
// This causes silent data corruption when users enter budget allocations or
// expense amounts with their native decimal separator.
//
// Detection uses `Intl.NumberFormat.formatToParts` on a known value, so we
// never hardcode per-locale rules — the browser is the source of truth.

interface LocaleSeparators {
  decimal: string;
  group: string;
}

const separatorsCache = new Map<string, LocaleSeparators>();

function getSeparators(locale: string): LocaleSeparators {
  const cached = separatorsCache.get(locale);
  if (cached) return cached;

  let decimal = ".";
  let group = ",";
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    for (const p of parts) {
      if (p.type === "decimal") decimal = p.value;
      else if (p.type === "group") group = p.value;
    }
  } catch {
    // Fallback: en-US separators already set.
  }
  const seps: LocaleSeparators = { decimal, group };
  separatorsCache.set(locale, seps);
  return seps;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Format a raw number as a locale-formatted string (no currency symbol).
 * Defaults to en-US for back-compat with call sites that do not pass a locale.
 */
export function formatAmount(value: number, locale = "en-US"): string {
  if (isNaN(value) || value === 0) return "";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse a locale-formatted amount string back to a number.
 * Strips group separators, normalizes the decimal separator to "." before
 * parseFloat, so "1.234,56" (es-CO/de-DE) → 1234.56 and "1,234.56" (en-US) →
 * 1234.56.
 */
export function parseAmount(formatted: string, locale = "en-US"): number {
  if (typeof formatted !== "string" || formatted.length === 0) return NaN;
  const { decimal, group } = getSeparators(locale);

  // Strip everything that is not a digit, sign, or either separator. Leaves
  // the currency symbol / whitespace behind harmlessly.
  let s = formatted.replace(
    new RegExp(`[^0-9${escapeRegExp(decimal)}${escapeRegExp(group)}+\\-]`, "g"),
    ""
  );
  // Remove group separators, then normalize decimal to ".".
  s = s.split(group).join("");
  if (decimal !== ".") s = s.split(decimal).join(".");
  return parseFloat(s);
}

/**
 * Mask input to a locale-formatted money string as the user types.
 * Accepts either the locale decimal separator OR "." (since numeric keypads
 * commonly emit "." regardless of locale).
 *
 * Ambiguity: in locales where "." is the group separator (de-DE, es-CO), a
 * user typing "1234.56" on a numeric keypad means 1234.56, NOT "123456". The
 * disambiguation rule: if the input contains exactly one "." and that "."
 * has 1 or 2 trailing digits, treat it as a decimal point. Otherwise treat
 * every "." as a group separator (so "1.234.567" → 1234567).
 */
export function maskAmountInput(raw: string, locale = "en-US"): string {
  if (typeof raw !== "string") return "";
  const { decimal, group } = getSeparators(locale);

  // Keep only digits and the two candidate separators (decimal + "." + group).
  // group may equal "." in decimal-comma locales — the duplicate in the char
  // class is harmless.
  const allowedChars = `0-9${escapeRegExp(decimal)}${escapeRegExp(group)}.`;
  let cleaned = raw.replace(new RegExp(`[^${allowedChars}]`, "g"), "");

  if (decimal === ".") {
    // en-US family: "." is decimal, "," is group. Simple path — drop group
    // separators, normalize already uses ".".
    cleaned = cleaned.split(group).join("");
  } else {
    // Decimal-comma family (de-DE, es-CO, ...). Rules:
    //   • locale decimal (",") is unambiguous decimal → map to ".".
    //   • "." is ambiguous: decimal if exactly one and has ≤2 trailing digits,
    //     group otherwise.
    const dotCount = (cleaned.match(/\./g) || []).length;
    const lastDotIdx = cleaned.lastIndexOf(".");
    const tailAfterDot = lastDotIdx >= 0 ? cleaned.length - lastDotIdx - 1 : 0;
    const treatDotAsDecimal =
      dotCount === 1 && tailAfterDot >= 1 && tailAfterDot <= 2 && !cleaned.includes(decimal);
    if (treatDotAsDecimal) {
      // Single "." acts as decimal separator → already in normalized form.
      // No-op.
    } else {
      // Every "." is a group separator → strip.
      cleaned = cleaned.split(".").join("");
    }
    // Locale decimal ("," etc.) always means decimal → normalize to ".".
    cleaned = cleaned.split(decimal).join(".");
  }

  const parts = cleaned.split(".");
  const intPart = (parts[0] || "").replace(/^0+(?=\d)/, "");
  const decPart = parts.length > 1 ? parts[1].slice(0, 2) : "";

  if (intPart === "") {
    return decPart ? `0${decimal}${decPart}` : "";
  }
  // Insert group separator every 3 digits.
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return parts.length > 1 ? `${groupedInt}${decimal}${decPart}` : groupedInt;
}

/** Pick a random icon not already used by existing sections/categories. */
export function pickRandomIcon(usedIcons: string[]): string {
  const available = ICON_OPTIONS.filter((o) => !usedIcons.includes(o.key));
  const pool = available.length > 0 ? available : ICON_OPTIONS;
  return pool[Math.floor(Math.random() * pool.length)].key;
}
