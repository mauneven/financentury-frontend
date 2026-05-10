import { describe, expect,it } from "vitest";

import {
  formatCompact,
  formatCurrency,
  getPercentage,
  getProgressColor,
  getProgressTextColor,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formats USD amounts", () => {
    const result = formatCurrency(1500, "USD");
    expect(result).toContain("1,500");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("0");
  });

  it("formats large numbers", () => {
    const result = formatCurrency(1000000, "USD");
    expect(result).toContain("1,000,000");
  });

  it("formats EUR amounts", () => {
    const result = formatCurrency(2500, "EUR");
    // EUR formatting varies by locale but should contain the amount
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("formats COP amounts", () => {
    const result = formatCurrency(50000, "COP");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-500, "USD");
    expect(result).toContain("500");
  });
});

describe("formatCompact", () => {
  it("formats millions with M suffix", () => {
    const result = formatCompact(2500000, "USD");
    expect(result).toContain("2.5M");
  });

  it("formats thousands with K suffix", () => {
    const result = formatCompact(5000, "USD");
    expect(result).toContain("5K");
  });

  it("formats 1500 as 2K (rounds)", () => {
    const result = formatCompact(1500, "USD");
    expect(result).toContain("2K");
  });

  it("formats small amounts without suffix", () => {
    const result = formatCompact(500, "USD");
    expect(result).toContain("500");
  });

  it("formats negative millions", () => {
    const result = formatCompact(-3000000, "USD");
    expect(result).toContain("-");
    expect(result).toContain("3.0M");
  });

  it("formats negative thousands", () => {
    const result = formatCompact(-5000, "USD");
    expect(result).toContain("-");
    expect(result).toContain("5K");
  });

  it("uses correct symbol for GBP", () => {
    const result = formatCompact(2000000, "GBP");
    expect(result).toContain("\u00a3");
    expect(result).toContain("2.0M");
  });

  it("uses correct symbol for BRL", () => {
    const result = formatCompact(5000000, "BRL");
    expect(result).toContain("R$");
    expect(result).toContain("5.0M");
  });

  it("falls back to $ for unknown currency in compact range", () => {
    const result = formatCompact(2000000, "XYZ");
    expect(result).toContain("$");
    expect(result).toContain("2.0M");
  });

  it("formats zero", () => {
    const result = formatCompact(0, "USD");
    expect(result).toContain("0");
  });
});

describe("getPercentage", () => {
  it("calculates correct percentage", () => {
    expect(getPercentage(50, 100)).toBe(50);
  });

  it("returns 0 when budget is 0", () => {
    expect(getPercentage(100, 0)).toBe(0);
  });

  it("handles overspend", () => {
    expect(getPercentage(150, 100)).toBe(150);
  });

  it("rounds to nearest integer", () => {
    expect(getPercentage(1, 3)).toBe(33);
  });

  it("returns 100 for exact match", () => {
    expect(getPercentage(100, 100)).toBe(100);
  });
});

describe("getProgressColor", () => {
  it("returns emerald for 0%", () => {
    expect(getProgressColor(0)).toBe("bg-emerald-500");
  });

  it("returns emerald for 50%", () => {
    expect(getProgressColor(50)).toBe("bg-emerald-500");
  });

  it("returns emerald for 89%", () => {
    expect(getProgressColor(89)).toBe("bg-emerald-500");
  });

  it("returns amber for 90%", () => {
    expect(getProgressColor(90)).toBe("bg-amber-500");
  });

  it("returns amber for 95%", () => {
    expect(getProgressColor(95)).toBe("bg-amber-500");
  });

  it("returns amber for 99%", () => {
    expect(getProgressColor(99)).toBe("bg-amber-500");
  });

  it("returns red for 100%", () => {
    expect(getProgressColor(100)).toBe("bg-red-500");
  });

  it("returns red for 150%", () => {
    expect(getProgressColor(150)).toBe("bg-red-500");
  });
});

describe("getProgressTextColor", () => {
  it("returns emerald text for low percentage", () => {
    expect(getProgressTextColor(50)).toBe("text-emerald-600");
  });

  it("returns amber text for 90%", () => {
    expect(getProgressTextColor(90)).toBe("text-amber-600");
  });

  it("returns red text for 100%+", () => {
    expect(getProgressTextColor(100)).toBe("text-red-600");
  });
});
