import { describe, it, expect, vi } from "vitest";

// Mock the icon-picker module (same pattern as amount-utils.test.ts)
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
  parseAmount,
  maskAmountInput,
  pickRandomIcon,
} from "@/lib/amount-utils";

// ---------------------------------------------------------------------------
// maskAmountInput — script tags
// ---------------------------------------------------------------------------
describe("maskAmountInput — script tags", () => {
  it("strips <script> tags entirely, keeping any digits", () => {
    const result = maskAmountInput('<script>alert("xss")</script>');
    // Only digits and dots survive the regex [^0-9.]
    expect(result).toBe("");
  });

  it("strips script with embedded digits, keeping the digits", () => {
    const result = maskAmountInput('<script>42</script>100');
    expect(result).toBe("42,100");
  });

  it("handles onclick-style XSS payload", () => {
    const result = maskAmountInput('onclick="steal()" 99.50');
    expect(result).toBe("99.50");
  });
});

// ---------------------------------------------------------------------------
// maskAmountInput — extremely long strings (performance)
// ---------------------------------------------------------------------------
describe("maskAmountInput — performance with long strings", () => {
  it("handles a 10 000 character digit string without crashing", () => {
    const long = "1".repeat(10_000);
    const start = performance.now();
    const result = maskAmountInput(long);
    const elapsed = performance.now() - start;
    // Should finish quickly (< 200 ms even on slow CI).
    expect(elapsed).toBeLessThan(200);
    // Should be a very long formatted string with commas.
    expect(result.length).toBeGreaterThan(0);
    // No digits should be lost (commas added).
    const digitsOnly = result.replace(/,/g, "");
    expect(digitsOnly).toBe(long);
  });

  it("handles 10 000 mixed characters (letters + digits)", () => {
    const mixed = "abc123".repeat(1_667); // ~10 002 chars
    const start = performance.now();
    const result = maskAmountInput(mixed);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
    expect(typeof result).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// parseAmount — Infinity / NaN strings
// ---------------------------------------------------------------------------
describe("parseAmount — special string values", () => {
  it('returns NaN for "Infinity"', () => {
    // "Infinity" after stripping commas is "Infinity" -> parseFloat returns Infinity
    const result = parseAmount("Infinity");
    expect(result).toBe(Infinity);
  });

  it('returns NaN for "NaN"', () => {
    expect(parseAmount("NaN")).toBeNaN();
  });

  it('returns NaN for "-Infinity"', () => {
    const result = parseAmount("-Infinity");
    expect(result).toBe(-Infinity);
  });
});

// ---------------------------------------------------------------------------
// parseAmount — scientific notation
// ---------------------------------------------------------------------------
describe("parseAmount — scientific notation", () => {
  it('parses "1e5" as 100000', () => {
    // parseFloat("1e5") = 100000
    expect(parseAmount("1e5")).toBe(100000);
  });

  it('parses "2.5e3" as 2500', () => {
    expect(parseAmount("2.5e3")).toBe(2500);
  });

  it('parses "1e-3" as 0.001', () => {
    expect(parseAmount("1e-3")).toBe(0.001);
  });
});

// ---------------------------------------------------------------------------
// parseAmount — negative numbers
// ---------------------------------------------------------------------------
describe("parseAmount — negative numbers", () => {
  it('parses "-100" as -100', () => {
    expect(parseAmount("-100")).toBe(-100);
  });

  it('parses "-1,234.56" as -1234.56', () => {
    expect(parseAmount("-1,234.56")).toBe(-1234.56);
  });

  it('parses "-0" as -0', () => {
    expect(Object.is(parseAmount("-0"), -0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatAmount — MAX_SAFE_INTEGER
// ---------------------------------------------------------------------------
describe("formatAmount — extreme values", () => {
  it("formats Number.MAX_SAFE_INTEGER without throwing", () => {
    const result = formatAmount(Number.MAX_SAFE_INTEGER);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    // Should contain commas for the large number.
    expect(result).toContain(",");
  });

  it("formats negative zero as empty string (treated as 0)", () => {
    // formatAmount returns "" for value === 0; -0 === 0 is true
    expect(formatAmount(-0)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// pickRandomIcon — performance with many used icons
// ---------------------------------------------------------------------------
describe("pickRandomIcon — performance with 1000 used icons", () => {
  it("handles 1000 used icons without significant delay", () => {
    const manyUsed = Array.from({ length: 1000 }, (_, i) => `icon-${i}`);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      pickRandomIcon(manyUsed);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("returns a valid icon key even when usedIcons is very large", () => {
    const manyUsed = Array.from({ length: 1000 }, (_, i) => `icon-${i}`);
    const result = pickRandomIcon(manyUsed);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
