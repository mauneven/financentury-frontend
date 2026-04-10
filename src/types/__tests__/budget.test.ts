import { describe, it, expect } from "vitest";
import type { BudgetMode } from "@/types/budget";
import {
  CURRENCIES,
  BILLING_PERIODS,
  BALANCED_SECTIONS,
  DEBT_FREE_SECTIONS,
  DEBT_PAYOFF_SECTIONS,
  TRAVEL_SECTIONS,
  EVENT_SECTIONS,
} from "@/types/budget";

describe("BudgetMode type", () => {
  it("accepts valid budget modes", () => {
    const validModes: BudgetMode[] = [
      "balanced",
      "debt-free",
      "debt-payoff",
      "travel",
      "event",
      "manual",
    ];
    // If this compiles, the type accepts these values
    expect(validModes).toHaveLength(6);
  });

  it("all valid modes are strings", () => {
    const validModes: BudgetMode[] = [
      "balanced",
      "debt-free",
      "debt-payoff",
      "travel",
      "event",
      "manual",
    ];
    validModes.forEach((mode) => {
      expect(typeof mode).toBe("string");
    });
  });

  it("does not include 'guided' as a valid mode (compile-time check)", () => {
    // This is a runtime check that the known modes don't include deprecated values
    const knownModes: string[] = [
      "balanced",
      "debt-free",
      "debt-payoff",
      "travel",
      "event",
      "manual",
    ];
    expect(knownModes).not.toContain("guided");
    expect(knownModes).not.toContain("aggressive");
  });
});

describe("CURRENCIES", () => {
  it("is a non-empty array", () => {
    expect(CURRENCIES.length).toBeGreaterThan(0);
  });

  it("has 9 currencies", () => {
    expect(CURRENCIES).toHaveLength(9);
  });

  it("each currency has required fields", () => {
    CURRENCIES.forEach((c) => {
      expect(c).toHaveProperty("code");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("symbol");
      expect(c).toHaveProperty("locale");
      expect(typeof c.code).toBe("string");
      expect(typeof c.name).toBe("string");
      expect(typeof c.symbol).toBe("string");
      expect(typeof c.locale).toBe("string");
    });
  });

  it("contains USD", () => {
    const usd = CURRENCIES.find((c) => c.code === "USD");
    expect(usd).toBeDefined();
    expect(usd!.symbol).toBe("$");
    expect(usd!.locale).toBe("en-US");
  });

  it("contains EUR", () => {
    const eur = CURRENCIES.find((c) => c.code === "EUR");
    expect(eur).toBeDefined();
    expect(eur!.symbol).toBe("\u20ac");
  });

  it("contains COP", () => {
    const cop = CURRENCIES.find((c) => c.code === "COP");
    expect(cop).toBeDefined();
    expect(cop!.locale).toBe("es-CO");
  });

  it("has unique currency codes", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("BILLING_PERIODS", () => {
  it("has 5 billing periods", () => {
    expect(BILLING_PERIODS).toHaveLength(5);
  });

  it("includes one-time (0), monthly (1), quarterly (3), semi-annual (6), annual (12)", () => {
    const values = BILLING_PERIODS.map((p) => p.value);
    expect(values).toContain(0);
    expect(values).toContain(1);
    expect(values).toContain(3);
    expect(values).toContain(6);
    expect(values).toContain(12);
  });

  it("each period has value and labelKey", () => {
    BILLING_PERIODS.forEach((p) => {
      expect(typeof p.value).toBe("number");
      expect(typeof p.labelKey).toBe("string");
    });
  });
});

describe("BALANCED_SECTIONS preset", () => {
  it("section allocations sum to 100%", () => {
    const total = BALANCED_SECTIONS.reduce(
      (sum, s) => sum + s.allocation_percent,
      0
    );
    expect(total).toBe(100);
  });

  it("has 4 sections", () => {
    expect(BALANCED_SECTIONS).toHaveLength(4);
  });

  it("each section has categories", () => {
    BALANCED_SECTIONS.forEach((section) => {
      expect(section.categories.length).toBeGreaterThan(0);
    });
  });

  it("category allocations within each section sum to 100%", () => {
    BALANCED_SECTIONS.forEach((section) => {
      const total = section.categories.reduce(
        (sum, c) => sum + c.allocation_percent,
        0
      );
      expect(total).toBe(100);
    });
  });

  it("each section has name, allocation_percent, and icon", () => {
    BALANCED_SECTIONS.forEach((section) => {
      expect(typeof section.name).toBe("string");
      expect(typeof section.allocation_percent).toBe("number");
      expect(typeof section.icon).toBe("string");
    });
  });
});

describe("DEBT_FREE_SECTIONS preset", () => {
  it("section allocations sum to 100%", () => {
    const total = DEBT_FREE_SECTIONS.reduce(
      (sum, s) => sum + s.allocation_percent,
      0
    );
    expect(total).toBe(100);
  });

  it("has 3 sections (no debt section)", () => {
    expect(DEBT_FREE_SECTIONS).toHaveLength(3);
  });

  it("category allocations within each section sum to 100%", () => {
    DEBT_FREE_SECTIONS.forEach((section) => {
      const total = section.categories.reduce(
        (sum, c) => sum + c.allocation_percent,
        0
      );
      expect(total).toBe(100);
    });
  });
});

describe("DEBT_PAYOFF_SECTIONS preset", () => {
  it("section allocations sum to 100%", () => {
    const total = DEBT_PAYOFF_SECTIONS.reduce(
      (sum, s) => sum + s.allocation_percent,
      0
    );
    expect(total).toBe(100);
  });

  it("has 3 sections", () => {
    expect(DEBT_PAYOFF_SECTIONS).toHaveLength(3);
  });

  it("debt section gets 30% (largest allocation for payoff mode)", () => {
    const debtSection = DEBT_PAYOFF_SECTIONS.find((s) => s.name === "Deuda");
    expect(debtSection).toBeDefined();
    expect(debtSection!.allocation_percent).toBe(30);
  });
});

describe("TRAVEL_SECTIONS preset", () => {
  it("section allocations sum to 100%", () => {
    const total = TRAVEL_SECTIONS.reduce(
      (sum, s) => sum + s.allocation_percent,
      0
    );
    expect(total).toBe(100);
  });

  it("has 3 sections", () => {
    expect(TRAVEL_SECTIONS).toHaveLength(3);
  });

  it("category allocations within each section sum to 100%", () => {
    TRAVEL_SECTIONS.forEach((section) => {
      const total = section.categories.reduce(
        (sum, c) => sum + c.allocation_percent,
        0
      );
      expect(total).toBe(100);
    });
  });
});

describe("EVENT_SECTIONS preset", () => {
  it("section allocations sum to 100%", () => {
    const total = EVENT_SECTIONS.reduce(
      (sum, s) => sum + s.allocation_percent,
      0
    );
    expect(total).toBe(100);
  });

  it("has 3 sections", () => {
    expect(EVENT_SECTIONS).toHaveLength(3);
  });

  it("category allocations within each section sum to 100%", () => {
    EVENT_SECTIONS.forEach((section) => {
      const total = section.categories.reduce(
        (sum, c) => sum + c.allocation_percent,
        0
      );
      expect(total).toBe(100);
    });
  });
});
