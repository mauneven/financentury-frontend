import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  BILLING_PERIODS,
  BALANCED_CATEGORIES,
  DEBT_FREE_CATEGORIES,
  DEBT_PAYOFF_CATEGORIES,
  TRAVEL_CATEGORIES,
  EVENT_CATEGORIES,
  MAX_CATEGORIES_PER_BUDGET,
  type CategoryTemplate,
} from "@/types/budget";

// ---------------------------------------------------------------------------
// CURRENCIES — locale pattern validation
// ---------------------------------------------------------------------------
describe("CURRENCIES — locale validation", () => {
  it("all currencies have a locale matching the ll-CC pattern", () => {
    const localeRegex = /^[a-z]{2}-[A-Z]{2}$/;
    CURRENCIES.forEach((c) => {
      expect(c.locale).toMatch(localeRegex);
    });
  });

  it("all currency symbols are non-empty strings", () => {
    CURRENCIES.forEach((c) => {
      expect(typeof c.symbol).toBe("string");
      expect(c.symbol.length).toBeGreaterThan(0);
    });
  });

  it("all currency codes are 3-letter uppercase strings", () => {
    CURRENCIES.forEach((c) => {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
    });
  });

  it("all currency names are non-empty", () => {
    CURRENCIES.forEach((c) => {
      expect(c.name.trim().length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// BILLING_PERIODS — non-negative integers
// ---------------------------------------------------------------------------
describe("BILLING_PERIODS — value validation", () => {
  it("all values are non-negative integers", () => {
    BILLING_PERIODS.forEach((p) => {
      expect(Number.isInteger(p.value)).toBe(true);
      expect(p.value).toBeGreaterThanOrEqual(0);
    });
  });

  it("all labelKeys are non-empty strings", () => {
    BILLING_PERIODS.forEach((p) => {
      expect(typeof p.labelKey).toBe("string");
      expect(p.labelKey.trim().length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// MAX_CATEGORIES_PER_BUDGET
// ---------------------------------------------------------------------------
describe("MAX_CATEGORIES_PER_BUDGET", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(MAX_CATEGORIES_PER_BUDGET)).toBe(true);
    expect(MAX_CATEGORIES_PER_BUDGET).toBeGreaterThan(0);
  });

  it("is exactly 50", () => {
    expect(MAX_CATEGORIES_PER_BUDGET).toBe(50);
  });

  it("every seed template fits within the limit", () => {
    expect(BALANCED_CATEGORIES.length).toBeLessThanOrEqual(
      MAX_CATEGORIES_PER_BUDGET
    );
    expect(DEBT_FREE_CATEGORIES.length).toBeLessThanOrEqual(
      MAX_CATEGORIES_PER_BUDGET
    );
    expect(DEBT_PAYOFF_CATEGORIES.length).toBeLessThanOrEqual(
      MAX_CATEGORIES_PER_BUDGET
    );
    expect(TRAVEL_CATEGORIES.length).toBeLessThanOrEqual(
      MAX_CATEGORIES_PER_BUDGET
    );
    expect(EVENT_CATEGORIES.length).toBeLessThanOrEqual(
      MAX_CATEGORIES_PER_BUDGET
    );
  });
});

// ---------------------------------------------------------------------------
// Helper: validate any flat category template
// ---------------------------------------------------------------------------
function validatePreset(label: string, template: CategoryTemplate) {
  describe(`${label} — category names`, () => {
    it("all category names are non-empty strings", () => {
      template.forEach((c) => {
        expect(typeof c.name).toBe("string");
        expect(c.name.trim().length).toBeGreaterThan(0);
      });
    });

    it("category names are unique within the template", () => {
      const names = template.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe(`${label} — icons`, () => {
    it("all category icons are non-empty strings", () => {
      template.forEach((c) => {
        expect(typeof c.icon).toBe("string");
        expect(c.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe(`${label} — pct values`, () => {
    it("all pct values are between 0 and 100", () => {
      template.forEach((c) => {
        expect(c.pct).toBeGreaterThan(0);
        expect(c.pct).toBeLessThanOrEqual(100);
      });
    });

    it("pct values sum to exactly 100", () => {
      const total = template.reduce((sum, c) => sum + c.pct, 0);
      expect(total).toBe(100);
    });
  });
}

// ---------------------------------------------------------------------------
// Run validation for every preset
// ---------------------------------------------------------------------------
validatePreset("BALANCED_CATEGORIES", BALANCED_CATEGORIES);
validatePreset("DEBT_FREE_CATEGORIES", DEBT_FREE_CATEGORIES);
validatePreset("DEBT_PAYOFF_CATEGORIES", DEBT_PAYOFF_CATEGORIES);
validatePreset("TRAVEL_CATEGORIES", TRAVEL_CATEGORIES);
validatePreset("EVENT_CATEGORIES", EVENT_CATEGORIES);
