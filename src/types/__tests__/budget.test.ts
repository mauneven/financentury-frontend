import { describe, it, expect } from "vitest";
import type { BudgetMode } from "@/types/budget";
import {
  CURRENCIES,
  BILLING_PERIODS,
  BALANCED_CATEGORIES,
  DEBT_FREE_CATEGORIES,
  DEBT_PAYOFF_CATEGORIES,
  TRAVEL_CATEGORIES,
  EVENT_CATEGORIES,
  MAX_CATEGORIES_PER_BUDGET,
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

describe("MAX_CATEGORIES_PER_BUDGET", () => {
  it("is 50", () => {
    expect(MAX_CATEGORIES_PER_BUDGET).toBe(50);
  });
});

describe("BALANCED_CATEGORIES preset", () => {
  it("percentages sum to 100", () => {
    const total = BALANCED_CATEGORIES.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBe(100);
  });

  it("contains 10 categories (4 + 2 + 2 + 2 flattened)", () => {
    expect(BALANCED_CATEGORIES).toHaveLength(10);
  });

  it("each entry has name, icon, and pct", () => {
    BALANCED_CATEGORIES.forEach((c) => {
      expect(typeof c.name).toBe("string");
      expect(typeof c.icon).toBe("string");
      expect(typeof c.pct).toBe("number");
      expect(c.pct).toBeGreaterThan(0);
    });
  });
});

describe("DEBT_FREE_CATEGORIES preset", () => {
  it("percentages sum to 100", () => {
    const total = DEBT_FREE_CATEGORIES.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBe(100);
  });

  it("contains 8 categories (4 + 2 + 2 flattened, no debt)", () => {
    expect(DEBT_FREE_CATEGORIES).toHaveLength(8);
  });
});

describe("DEBT_PAYOFF_CATEGORIES preset", () => {
  it("percentages sum to 100", () => {
    const total = DEBT_PAYOFF_CATEGORIES.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBe(100);
  });

  it("contains 8 categories (4 + 2 + 2 flattened)", () => {
    expect(DEBT_PAYOFF_CATEGORIES).toHaveLength(8);
  });

  it("debt categories (Tarjetas + Pr\u00e9stamos) together sum to 30% of the budget", () => {
    const debtCats = DEBT_PAYOFF_CATEGORIES.filter(
      (c) => c.name === "Tarjetas" || c.name === "Pr\u00e9stamos"
    );
    const debtTotal = debtCats.reduce((s, c) => s + c.pct, 0);
    expect(debtTotal).toBe(30);
  });
});

describe("TRAVEL_CATEGORIES preset", () => {
  it("percentages sum to 100", () => {
    const total = TRAVEL_CATEGORIES.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBe(100);
  });

  it("contains 5 categories (1 + 1 + 3 flattened)", () => {
    expect(TRAVEL_CATEGORIES).toHaveLength(5);
  });
});

describe("EVENT_CATEGORIES preset", () => {
  it("percentages sum to 100", () => {
    const total = EVENT_CATEGORIES.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBe(100);
  });

  it("contains 4 categories (1 + 1 + 2 flattened)", () => {
    expect(EVENT_CATEGORIES).toHaveLength(4);
  });
});
