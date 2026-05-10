import { describe, expect,it } from "vitest";

/**
 * Security-focused tests for the normalizeExpense logic and related API helpers.
 *
 * normalizeExpense is not exported, so we replicate the *production* logic
 * (including the NIL_UUID guard) exactly as it appears in api.ts.
 */

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function normalizeExpense(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const e = raw as Record<string, unknown> & { subcategory_id?: string };
  if (
    (!e.category_id || e.category_id === NIL_UUID) &&
    e.subcategory_id &&
    e.subcategory_id !== NIL_UUID
  ) {
    e.category_id = e.subcategory_id;
  }
  return e;
}

// ---------------------------------------------------------------------------
// XSS payloads
// ---------------------------------------------------------------------------
describe("normalizeExpense — XSS payloads", () => {
  it("does not alter a category_id that contains a <script> tag", () => {
    const raw = {
      id: "exp-1",
      budget_id: "b-1",
      category_id: '<script>alert("xss")</script>',
      amount: 10,
    };
    const result = normalizeExpense(raw);
    // The function is not responsible for sanitising IDs — it should simply
    // pass through the truthy category_id unchanged.
    expect(result.category_id).toBe('<script>alert("xss")</script>');
  });

  it("copies XSS-laden subcategory_id to category_id when category_id is missing", () => {
    const raw = {
      id: "exp-2",
      budget_id: "b-1",
      subcategory_id: '<img onerror="alert(1)" src=x>',
      amount: 10,
    };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe('<img onerror="alert(1)" src=x>');
  });
});

// ---------------------------------------------------------------------------
// Extremely long strings
// ---------------------------------------------------------------------------
describe("normalizeExpense — long strings", () => {
  it("handles a category_id of 10 000 characters without throwing", () => {
    const longId = "a".repeat(10_000);
    const raw = { id: "exp-3", budget_id: "b-1", category_id: longId, amount: 5 };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe(longId);
  });

  it("handles a subcategory_id of 10 000 characters when category_id is absent", () => {
    const longId = "b".repeat(10_000);
    const raw = { id: "exp-4", budget_id: "b-1", subcategory_id: longId, amount: 5 };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe(longId);
  });
});

// ---------------------------------------------------------------------------
// Null / undefined fields
// ---------------------------------------------------------------------------
describe("normalizeExpense — null / undefined fields", () => {
  it("leaves category_id undefined when both category_id and subcategory_id are undefined", () => {
    const raw = { id: "exp-5", budget_id: "b-1", amount: 1 };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBeUndefined();
  });

  it("treats null category_id as falsy and falls through to subcategory_id", () => {
    const raw = {
      id: "exp-6",
      budget_id: "b-1",
      category_id: null,
      subcategory_id: "cat-1",
      amount: 1,
    };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-1");
  });

  it("does nothing when category_id is null and subcategory_id is also null", () => {
    const raw = {
      id: "exp-7",
      budget_id: "b-1",
      category_id: null,
      subcategory_id: null,
      amount: 1,
    };
    const result = normalizeExpense(raw);
    // subcategory_id is null (falsy), so category_id stays null.
    expect(result.category_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Type coercion (numeric category_id)
// ---------------------------------------------------------------------------
describe("normalizeExpense — type coercion", () => {
  it("keeps a numeric category_id (truthy) unchanged", () => {
    const raw = { id: "exp-8", budget_id: "b-1", category_id: 42, amount: 1 } as unknown as Record<string, unknown>;
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe(42);
  });

  it("treats category_id = 0 as falsy and falls through to subcategory_id", () => {
    const raw = {
      id: "exp-9",
      budget_id: "b-1",
      category_id: 0,
      subcategory_id: "cat-fallback",
      amount: 1,
    } as unknown as Record<string, unknown>;
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-fallback");
  });
});

// ---------------------------------------------------------------------------
// NIL_UUID constant format
// ---------------------------------------------------------------------------
describe("NIL_UUID constant", () => {
  it("matches the canonical 00000000-0000-0000-0000-000000000000 format", () => {
    expect(NIL_UUID).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("has exactly 36 characters (8-4-4-4-12)", () => {
    expect(NIL_UUID).toHaveLength(36);
  });

  it("matches the UUID regex", () => {
    expect(NIL_UUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

// ---------------------------------------------------------------------------
// Precedence: category_id vs subcategory_id
// ---------------------------------------------------------------------------
describe("normalizeExpense — category_id / subcategory_id precedence", () => {
  it("preserves category_id when both category_id AND subcategory_id are set", () => {
    const raw = {
      id: "exp-10",
      budget_id: "b-1",
      category_id: "cat-primary",
      subcategory_id: "cat-secondary",
      amount: 10,
    };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-primary");
  });

  it("uses subcategory_id when category_id equals NIL_UUID", () => {
    const raw = {
      id: "exp-11",
      budget_id: "b-1",
      category_id: NIL_UUID,
      subcategory_id: "cat-real",
      amount: 10,
    };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-real");
  });

  it("keeps NIL_UUID when both category_id and subcategory_id are NIL_UUID", () => {
    const raw = {
      id: "exp-12",
      budget_id: "b-1",
      category_id: NIL_UUID,
      subcategory_id: NIL_UUID,
      amount: 10,
    };
    const result = normalizeExpense(raw);
    // subcategory_id === NIL_UUID is filtered out, so category_id stays NIL_UUID.
    expect(result.category_id).toBe(NIL_UUID);
  });

  it("keeps NIL_UUID when category_id is NIL_UUID and subcategory_id is undefined", () => {
    const raw = {
      id: "exp-13",
      budget_id: "b-1",
      category_id: NIL_UUID,
      amount: 10,
    };
    const result = normalizeExpense(raw);
    expect(result.category_id).toBe(NIL_UUID);
  });
});
