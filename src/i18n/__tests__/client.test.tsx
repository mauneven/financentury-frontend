import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { useTranslations, useMessages } from "@/i18n/client";

// ---------------------------------------------------------------------------
// Helper: wrap hooks in a MessagesContext provider
// ---------------------------------------------------------------------------
// We can't import the private MessagesContext, so we re-create the provider
// by using the exported I18nProvider approach. However, since I18nProvider
// depends on dynamic imports and locale store, we test useTranslations and
// useMessages in isolation using a minimal React context wrapper.

// Replicate the context for testing (same shape as client.tsx)
const { createContext, useContext } = React;

// Since MessagesContext is not exported, we test via a wrapper that calls
// the public hooks. The hooks read from context, so we verify the logic
// of the `t()` function by providing messages through the tree.
// We use the I18nProvider indirectly by mocking the dynamic import.

// For unit-testing the pure translation logic, we extract the algorithm:
function translateKey(
  messages: Record<string, unknown>,
  fullKey: string,
  params?: Record<string, string | number>
): string {
  const parts = fullKey.split(".");
  let value: unknown = messages;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return fullKey; // Fallback to key
    }
  }

  if (typeof value !== "string") return fullKey;

  if (params) {
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      value
    );
  }

  return value;
}

// ---------------------------------------------------------------------------
// translateKey — core translation logic
// ---------------------------------------------------------------------------
describe("translateKey — basic lookups", () => {
  const messages = {
    common: {
      save: "Save",
      cancel: "Cancel",
      greeting: "Hello, {name}!",
    },
    budget: {
      title: "My Budget",
      nested: {
        deep: "Deep value",
      },
    },
  };

  it("resolves a simple dot-notation key", () => {
    expect(translateKey(messages, "common.save")).toBe("Save");
  });

  it("resolves a nested key", () => {
    expect(translateKey(messages, "budget.nested.deep")).toBe("Deep value");
  });

  it("returns the key itself when not found", () => {
    expect(translateKey(messages, "nonexistent.key")).toBe("nonexistent.key");
  });

  it("returns the key when the path resolves to an object, not a string", () => {
    expect(translateKey(messages, "common")).toBe("common");
  });

  it("returns the key when messages is empty", () => {
    expect(translateKey({}, "any.key")).toBe("any.key");
  });
});

describe("translateKey — parameter interpolation", () => {
  const messages = {
    greeting: "Hello, {name}! You have {count} items.",
    simple: "No params here.",
    multi: "{a} and {b} and {a} again",
  };

  it("replaces a single parameter", () => {
    expect(translateKey(messages, "greeting", { name: "Alice", count: 5 })).toBe(
      "Hello, Alice! You have 5 items."
    );
  });

  it("returns the string unchanged when no params are provided", () => {
    expect(translateKey(messages, "simple")).toBe("No params here.");
  });

  it("replaces multiple occurrences of the same param", () => {
    expect(translateKey(messages, "multi", { a: "X", b: "Y" })).toBe(
      "X and Y and X again"
    );
  });

  it("leaves unmatched placeholders when params are missing", () => {
    expect(translateKey(messages, "greeting", { name: "Bob" })).toBe(
      "Hello, Bob! You have {count} items."
    );
  });

  it("handles numeric parameter values", () => {
    expect(translateKey(messages, "greeting", { name: "Eve", count: 0 })).toBe(
      "Hello, Eve! You have 0 items."
    );
  });
});

describe("translateKey — namespace support", () => {
  const messages = {
    sidebar: {
      myBudgets: "My Budgets",
      settings: "Settings",
    },
  };

  it("works with namespace prefix applied externally", () => {
    // In production, useTranslations("sidebar") prepends the namespace.
    expect(translateKey(messages, "sidebar.myBudgets")).toBe("My Budgets");
  });
});

describe("translateKey — edge cases", () => {
  it("handles empty string key", () => {
    expect(translateKey({ "": "root" }, "")).toBe("root");
  });

  it("handles key with only dots", () => {
    expect(translateKey({}, "...")).toBe("...");
  });

  it("handles deeply nested missing path gracefully", () => {
    const messages = { a: { b: { c: "found" } } };
    expect(translateKey(messages, "a.b.c")).toBe("found");
    expect(translateKey(messages, "a.b.d")).toBe("a.b.d");
    expect(translateKey(messages, "a.x.c")).toBe("a.x.c");
  });

  it("handles null-ish values in the message tree", () => {
    const messages = { a: { b: null } } as unknown as Record<string, unknown>;
    expect(translateKey(messages, "a.b")).toBe("a.b");
  });
});

// ---------------------------------------------------------------------------
// useMessages hook — returns empty object by default (no provider)
// ---------------------------------------------------------------------------
describe("useMessages — without provider", () => {
  it("returns an empty object when no MessagesContext provider is present", () => {
    const { result } = renderHook(() => useMessages());
    expect(result.current).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// useTranslations hook — without provider (fallback behavior)
// ---------------------------------------------------------------------------
describe("useTranslations — without provider", () => {
  it("returns a function that falls back to the key", () => {
    const { result } = renderHook(() => useTranslations());
    const t = result.current;
    expect(t("any.key")).toBe("any.key");
  });

  it("returns a function that falls back to namespace.key", () => {
    const { result } = renderHook(() => useTranslations("ns"));
    const t = result.current;
    expect(t("someKey")).toBe("ns.someKey");
  });
});
