import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  BILLING_PERIODS,
  BALANCED_SECTIONS,
  DEBT_FREE_SECTIONS,
  DEBT_PAYOFF_SECTIONS,
  TRAVEL_SECTIONS,
  EVENT_SECTIONS,
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
// Helper: validate any preset section array
// ---------------------------------------------------------------------------
type PresetSection = {
  readonly name: string;
  readonly allocation_percent: number;
  readonly icon: string;
  readonly categories: ReadonlyArray<{
    readonly name: string;
    readonly allocation_percent: number;
    readonly icon: string;
  }>;
};

function validatePreset(label: string, sections: readonly PresetSection[]) {
  describe(`${label} — section names`, () => {
    it("all section names are non-empty strings", () => {
      sections.forEach((s) => {
        expect(typeof s.name).toBe("string");
        expect(s.name.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe(`${label} — category names`, () => {
    it("all category names within sections are non-empty strings", () => {
      sections.forEach((s) => {
        s.categories.forEach((c) => {
          expect(typeof c.name).toBe("string");
          expect(c.name.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe(`${label} — no duplicate category names within a section`, () => {
    it("category names are unique per section", () => {
      sections.forEach((s) => {
        const names = s.categories.map((c) => c.name);
        expect(new Set(names).size).toBe(names.length);
      });
    });
  });

  describe(`${label} — icons`, () => {
    it("all section icons are non-empty strings", () => {
      sections.forEach((s) => {
        expect(typeof s.icon).toBe("string");
        expect(s.icon.length).toBeGreaterThan(0);
      });
    });

    it("all category icons are non-empty strings", () => {
      sections.forEach((s) => {
        s.categories.forEach((c) => {
          expect(typeof c.icon).toBe("string");
          expect(c.icon.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe(`${label} — allocation_percent values`, () => {
    it("all category allocation_percent values are between 0 and 100", () => {
      sections.forEach((s) => {
        s.categories.forEach((c) => {
          expect(c.allocation_percent).toBeGreaterThanOrEqual(0);
          expect(c.allocation_percent).toBeLessThanOrEqual(100);
        });
      });
    });

    it("all section allocation_percent values are between 0 and 100", () => {
      sections.forEach((s) => {
        expect(s.allocation_percent).toBeGreaterThanOrEqual(0);
        expect(s.allocation_percent).toBeLessThanOrEqual(100);
      });
    });

    it("section allocations sum to exactly 100", () => {
      const total = sections.reduce(
        (sum, s) => sum + s.allocation_percent,
        0
      );
      expect(total).toBe(100);
    });

    it("category allocations within each section sum to exactly 100", () => {
      sections.forEach((s) => {
        const total = s.categories.reduce(
          (sum, c) => sum + c.allocation_percent,
          0
        );
        expect(total).toBe(100);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Run validation for every preset
// ---------------------------------------------------------------------------
validatePreset("BALANCED_SECTIONS", BALANCED_SECTIONS);
validatePreset("DEBT_FREE_SECTIONS", DEBT_FREE_SECTIONS);
validatePreset("DEBT_PAYOFF_SECTIONS", DEBT_PAYOFF_SECTIONS);
validatePreset("TRAVEL_SECTIONS", TRAVEL_SECTIONS);
validatePreset("EVENT_SECTIONS", EVENT_SECTIONS);
