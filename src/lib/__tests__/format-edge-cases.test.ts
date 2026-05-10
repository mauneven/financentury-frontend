import { describe, expect,it } from "vitest";

import {
  formatCompact,
  formatCurrency,
  getPercentage,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// formatCurrency — NaN, Infinity, -Infinity
// ---------------------------------------------------------------------------
describe("formatCurrency — special numeric values", () => {
  it("returns a string for NaN (Intl behaviour)", () => {
    const result = formatCurrency(NaN, "USD");
    expect(typeof result).toBe("string");
    // Intl.NumberFormat typically returns "NaN" for NaN input.
    expect(result).toContain("NaN");
  });

  it("returns a string for Infinity", () => {
    const result = formatCurrency(Infinity, "USD");
    expect(typeof result).toBe("string");
  });

  it("returns a string for -Infinity", () => {
    const result = formatCurrency(-Infinity, "USD");
    expect(typeof result).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency — very large numbers
// ---------------------------------------------------------------------------
describe("formatCurrency — very large numbers", () => {
  it("formats 1e15 without throwing", () => {
    const result = formatCurrency(1e15, "USD");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats 1e20 without throwing", () => {
    const result = formatCurrency(1e20, "USD");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency — very small decimals
// ---------------------------------------------------------------------------
describe("formatCurrency — very small decimals", () => {
  it("formats 0.001 (rounds to 0 due to maximumFractionDigits: 0)", () => {
    const result = formatCurrency(0.001, "USD");
    expect(typeof result).toBe("string");
    // With maximumFractionDigits: 0, 0.001 rounds to $0
    expect(result).toContain("0");
  });

  it("formats 0.0001 (rounds to 0)", () => {
    const result = formatCurrency(0.0001, "USD");
    expect(typeof result).toBe("string");
    expect(result).toContain("0");
  });
});

// ---------------------------------------------------------------------------
// formatCompact — boundary values
// ---------------------------------------------------------------------------
describe("formatCompact — boundary values", () => {
  it("formats 999 without K suffix", () => {
    const result = formatCompact(999, "USD");
    expect(result).toContain("999");
    expect(result).not.toContain("K");
    expect(result).not.toContain("M");
  });

  it("formats 1000 with K suffix", () => {
    const result = formatCompact(1000, "USD");
    expect(result).toContain("K");
  });

  it("formats 999999 with K suffix (not M)", () => {
    const result = formatCompact(999999, "USD");
    expect(result).toContain("K");
    expect(result).not.toContain("M");
  });

  it("formats 1000000 with M suffix", () => {
    const result = formatCompact(1000000, "USD");
    expect(result).toContain("M");
  });
});

// ---------------------------------------------------------------------------
// formatCompact — negative boundary values
// ---------------------------------------------------------------------------
describe("formatCompact — negative boundary values", () => {
  it("formats -999 without K suffix", () => {
    const result = formatCompact(-999, "USD");
    expect(result).toContain("999");
    expect(result).not.toContain("K");
  });

  it("formats -1000 with K suffix and negative sign", () => {
    const result = formatCompact(-1000, "USD");
    expect(result).toContain("-");
    expect(result).toContain("K");
  });

  it("formats -1000000 with M suffix and negative sign", () => {
    const result = formatCompact(-1000000, "USD");
    expect(result).toContain("-");
    expect(result).toContain("M");
  });
});

// ---------------------------------------------------------------------------
// getPercentage — negative inputs
// ---------------------------------------------------------------------------
describe("getPercentage — negative inputs", () => {
  it("returns negative percentage when spent is negative", () => {
    expect(getPercentage(-50, 100)).toBe(-50);
  });

  it("returns negative percentage when budget is negative", () => {
    // -50 / -100 = 50%
    expect(getPercentage(-50, -100)).toBe(50);
  });

  it("returns negative percentage for positive spent with negative budget", () => {
    // 50 / -100 = -50%
    expect(getPercentage(50, -100)).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// getPercentage — very large numbers (overflow check)
// ---------------------------------------------------------------------------
describe("getPercentage — very large numbers", () => {
  it("handles Number.MAX_SAFE_INTEGER as spent", () => {
    const pct = getPercentage(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    expect(pct).toBe(100);
  });

  it("handles very large spent vs small budget without Infinity result", () => {
    const pct = getPercentage(1e15, 1);
    expect(Number.isFinite(pct)).toBe(true);
  });

  it("handles very small budget approaching 0 (but not 0)", () => {
    const pct = getPercentage(100, 0.0001);
    expect(Number.isFinite(pct)).toBe(true);
    expect(pct).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Performance benchmarks
// ---------------------------------------------------------------------------
describe("formatCurrency — performance", () => {
  it("completes 10 000 calls in under 500 ms", () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      formatCurrency(i * 1.23, "USD");
    }
    const elapsed = performance.now() - start;
    // Intl.NumberFormat creates a new formatter per call, so this is inherently
    // slower than simple string manipulation. 500 ms is generous but catches regressions.
    expect(elapsed).toBeLessThan(500);
  });
});

describe("formatCompact — performance", () => {
  it("completes 10 000 calls in under 100 ms", () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      formatCompact(i * 1000, "USD");
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
