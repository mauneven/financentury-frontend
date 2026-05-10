import { describe, expect, it, vi } from "vitest";

// We need to mock the icon-picker module since it imports React components
vi.mock("@/lib/icon-picker", () => ({
  ICON_OPTIONS: [
    { key: "home" },
    { key: "car" },
    { key: "utensils" },
    { key: "plane" },
    { key: "coins" },
    { key: "heart" },
    { key: "coffee" },
    { key: "laptop" },
  ],
}));

import {
  formatAmount,
  maskAmountInput,
  parseAmount,
  pickRandomIcon,
} from "@/lib/amount-utils";

describe("formatAmount", () => {
  it("returns empty string for 0", () => {
    expect(formatAmount(0)).toBe("");
  });

  it("returns empty string for NaN", () => {
    expect(formatAmount(NaN)).toBe("");
  });

  it("formats 1000 with comma separator", () => {
    expect(formatAmount(1000)).toBe("1,000");
  });

  it("formats 1234.56 with decimals", () => {
    expect(formatAmount(1234.56)).toBe("1,234.56");
  });

  it("formats large numbers correctly", () => {
    expect(formatAmount(1000000)).toBe("1,000,000");
  });

  it("formats 99.9 correctly", () => {
    expect(formatAmount(99.9)).toBe("99.9");
  });

  it("formats negative numbers", () => {
    expect(formatAmount(-500)).toBe("-500");
  });

  it("formats small decimals", () => {
    expect(formatAmount(0.5)).toBe("0.5");
  });
});

describe("parseAmount", () => {
  it("parses simple number string", () => {
    expect(parseAmount("1234")).toBe(1234);
  });

  it("parses comma-formatted string", () => {
    expect(parseAmount("1,234")).toBe(1234);
  });

  it("parses decimal string with commas", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
  });

  it("parses large formatted numbers", () => {
    expect(parseAmount("1,000,000")).toBe(1000000);
  });

  it("returns NaN for empty string", () => {
    expect(parseAmount("")).toBeNaN();
  });

  it("parses decimal without integer part", () => {
    expect(parseAmount(".5")).toBe(0.5);
  });
});

describe("maskAmountInput", () => {
  it("returns empty string for empty input", () => {
    expect(maskAmountInput("")).toBe("");
  });

  it("strips non-numeric characters", () => {
    expect(maskAmountInput("abc123")).toBe("123");
  });

  it("formats with comma separators", () => {
    expect(maskAmountInput("1234")).toBe("1,234");
  });

  it("handles decimal input", () => {
    expect(maskAmountInput("1234.56")).toBe("1,234.56");
  });

  it("limits decimal to 2 places", () => {
    expect(maskAmountInput("1234.5678")).toBe("1,234.56");
  });

  it("strips leading zeros", () => {
    expect(maskAmountInput("007")).toBe("7");
  });

  it("handles just a decimal point", () => {
    const result = maskAmountInput(".5");
    expect(result).toBe("0.5");
  });

  it("handles large numbers", () => {
    expect(maskAmountInput("1000000")).toBe("1,000,000");
  });

  it("strips special characters like $", () => {
    expect(maskAmountInput("$1,234")).toBe("1,234");
  });

  it("handles multiple decimal points (takes first)", () => {
    expect(maskAmountInput("12.34.56")).toBe("12.34");
  });
});

// ---------------------------------------------------------------------------
// Locale-aware parsing: decimal-comma locales (es-CO, de-DE) and default en-US.
// Critical path — wrong separator means a user typing "1,5" in Colombian
// Spanish lands a 15-peso expense instead of 1.5.
// ---------------------------------------------------------------------------
describe("parseAmount — locale-aware", () => {
  it('parses "1.234,56" as 1234.56 in es-CO', () => {
    expect(parseAmount("1.234,56", "es-CO")).toBe(1234.56);
  });

  it('parses "1.234,56" as 1234.56 in de-DE', () => {
    expect(parseAmount("1.234,56", "de-DE")).toBe(1234.56);
  });

  it('parses "1,5" as 1.5 in es-CO (comma is decimal)', () => {
    expect(parseAmount("1,5", "es-CO")).toBe(1.5);
  });

  it('parses "1,5" as 15 in en-US (comma is group separator)', () => {
    expect(parseAmount("1,5", "en-US")).toBe(15);
  });

  it('strips currency symbols before parsing in de-DE', () => {
    expect(parseAmount("1.234,56 €", "de-DE")).toBe(1234.56);
  });

  it("returns NaN on empty string regardless of locale", () => {
    expect(parseAmount("", "de-DE")).toBeNaN();
    expect(parseAmount("", "es-CO")).toBeNaN();
  });
});

describe("maskAmountInput — locale-aware", () => {
  it("formats 1234.56 with de-DE separators (dot group, comma decimal)", () => {
    expect(maskAmountInput("1234,56", "de-DE")).toBe("1.234,56");
  });

  it("accepts '.' on numeric keypads even in de-DE and treats as decimal", () => {
    // Numeric keypad always emits ".". Must map to locale decimal.
    expect(maskAmountInput("1234.56", "de-DE")).toBe("1.234,56");
  });

  it("formats 1234567 with es-CO group separator (dot)", () => {
    expect(maskAmountInput("1234567", "es-CO")).toBe("1.234.567");
  });

  it("preserves existing en-US behavior with default locale", () => {
    expect(maskAmountInput("1234567")).toBe("1,234,567");
  });
});

describe("formatAmount — locale-aware", () => {
  it("formats 1234.56 in de-DE with comma decimal", () => {
    expect(formatAmount(1234.56, "de-DE")).toBe("1.234,56");
  });

  it("formats 1234.56 in es-CO with comma decimal", () => {
    expect(formatAmount(1234.56, "es-CO")).toBe("1.234,56");
  });

  it("keeps en-US default back-compat", () => {
    expect(formatAmount(1234.56)).toBe("1,234.56");
  });
});

describe("pickRandomIcon", () => {
  it("returns a string", () => {
    expect(typeof pickRandomIcon([])).toBe("string");
  });

  it("returns an icon not in the used list when possible", () => {
    const used = ["home", "car", "utensils", "plane", "coins", "heart", "coffee"];
    // Only "laptop" is left
    const result = pickRandomIcon(used);
    expect(result).toBe("laptop");
  });

  it("returns any icon when all are used", () => {
    const allUsed = ["home", "car", "utensils", "plane", "coins", "heart", "coffee", "laptop"];
    const result = pickRandomIcon(allUsed);
    // Should still return something from the full pool
    expect(typeof result).toBe("string");
    expect(
      ["home", "car", "utensils", "plane", "coins", "heart", "coffee", "laptop"].includes(result)
    ).toBe(true);
  });

  it("picks from available pool when some are used", () => {
    const used = ["home", "car"];
    const result = pickRandomIcon(used);
    expect(result).toBeDefined();
    // Should not pick used icons (usually, since pool is larger)
    expect(typeof result).toBe("string");
  });
});
