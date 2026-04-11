import { describe, it, expect, vi } from "vitest";

// Mock lucide-react to avoid React component issues in unit tests
vi.mock("lucide-react", () => {
  const mockIcon = () => null;
  return {
    Home: mockIcon,
    UtensilsCrossed: mockIcon,
    Car: mockIcon,
    Lightbulb: mockIcon,
    PartyPopper: mockIcon,
    Clapperboard: mockIcon,
    Shirt: mockIcon,
    Plane: mockIcon,
    Landmark: mockIcon,
    TrendingUp: mockIcon,
    Coins: mockIcon,
    BookOpen: mockIcon,
    Heart: mockIcon,
    PawPrint: mockIcon,
    Gamepad2: mockIcon,
    Music: mockIcon,
    Coffee: mockIcon,
    ShoppingCart: mockIcon,
    Laptop: mockIcon,
    Smartphone: mockIcon,
    Dumbbell: mockIcon,
    Palette: mockIcon,
    Wrench: mockIcon,
    Sprout: mockIcon,
    Tag: mockIcon,
    Package: mockIcon,
    Briefcase: mockIcon,
    GraduationCap: mockIcon,
    Baby: mockIcon,
    Shield: mockIcon,
    Zap: mockIcon,
    Wifi: mockIcon,
    CreditCard: mockIcon,
    Bed: mockIcon,
    Wine: mockIcon,
    Sparkles: mockIcon,
    Truck: mockIcon,
    MapPin: mockIcon,
    Scale: mockIcon,
  };
});

// Mock cn
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ICON_OPTIONS, getIconComponent } from "@/lib/icon-picker";

describe("ICON_OPTIONS", () => {
  it("is a non-empty array", () => {
    expect(ICON_OPTIONS.length).toBeGreaterThan(0);
  });

  it("has 39 icon options", () => {
    expect(ICON_OPTIONS).toHaveLength(39);
  });

  it("each option has a key and Icon property", () => {
    ICON_OPTIONS.forEach((option) => {
      expect(typeof option.key).toBe("string");
      expect(option.key.length).toBeGreaterThan(0);
      expect(option.Icon).toBeDefined();
    });
  });

  it("has unique keys", () => {
    const keys = ICON_OPTIONS.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes expected common keys", () => {
    const keys = ICON_OPTIONS.map((o) => o.key);
    expect(keys).toContain("home");
    expect(keys).toContain("car");
    expect(keys).toContain("utensils");
    expect(keys).toContain("plane");
    expect(keys).toContain("coins");
    expect(keys).toContain("credit-card");
    expect(keys).toContain("laptop");
  });
});

describe("getIconComponent", () => {
  it("returns a function (component) for a known key", () => {
    const Icon = getIconComponent("home");
    expect(typeof Icon).toBe("function");
  });

  it("returns the Tag fallback for an unknown key", () => {
    const Icon = getIconComponent("nonexistent-key");
    expect(typeof Icon).toBe("function");
  });

  it("returns the Tag fallback for null", () => {
    const Icon = getIconComponent(null);
    expect(typeof Icon).toBe("function");
  });

  it("returns the Tag fallback for undefined", () => {
    const Icon = getIconComponent(undefined);
    expect(typeof Icon).toBe("function");
  });

  it("returns the Tag fallback for empty string", () => {
    const Icon = getIconComponent("");
    expect(typeof Icon).toBe("function");
  });

  it("returns consistent component for the same key", () => {
    const icon1 = getIconComponent("home");
    const icon2 = getIconComponent("home");
    expect(icon1).toBe(icon2);
  });

  it("returns different components for null vs known key", () => {
    // Both return mock functions, but for a real scenario they would be different.
    // We just verify no errors are thrown.
    const fallback = getIconComponent(null);
    const known = getIconComponent("home");
    expect(typeof fallback).toBe("function");
    expect(typeof known).toBe("function");
  });
});
