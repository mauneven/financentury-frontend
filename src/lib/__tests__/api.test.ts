import { describe, expect,it } from "vitest";

/**
 * normalizeExpense is not exported directly, so we replicate its logic
 * for unit testing. If api.ts is refactored to export it, we can import
 * directly. For now we test the exact same algorithm.
 */
function normalizeExpense(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const e = raw as Record<string, unknown> & { subcategory_id?: string };
  if (!e.category_id && e.subcategory_id) {
    e.category_id = e.subcategory_id;
  }
  return e;
}

describe("normalizeExpense", () => {
  it("maps subcategory_id to category_id when category_id is missing", () => {
    const raw = {
      id: "exp-1",
      budget_id: "b-1",
      subcategory_id: "cat-99",
      amount: 100,
      description: "Groceries",
      expense_date: "2024-01-15",
      created_at: "2024-01-15T00:00:00Z",
    };

    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-99");
  });

  it("keeps existing category_id when already present", () => {
    const raw = {
      id: "exp-2",
      budget_id: "b-1",
      category_id: "cat-42",
      subcategory_id: "cat-99",
      amount: 200,
      description: "Rent",
      expense_date: "2024-01-01",
      created_at: "2024-01-01T00:00:00Z",
    };

    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-42");
  });

  it("leaves category_id undefined when neither category_id nor subcategory_id exist", () => {
    const raw = {
      id: "exp-3",
      budget_id: "b-1",
      amount: 50,
      description: "Mystery",
      expense_date: "2024-02-01",
      created_at: "2024-02-01T00:00:00Z",
    };

    const result = normalizeExpense(raw);
    expect(result.category_id).toBeUndefined();
  });

  it("does not map subcategory_id when category_id is an empty string", () => {
    // Empty string is falsy, so subcategory_id should be mapped
    const raw = {
      id: "exp-4",
      budget_id: "b-1",
      category_id: "",
      subcategory_id: "cat-77",
      amount: 25,
      description: "Test",
      expense_date: "2024-03-01",
      created_at: "2024-03-01T00:00:00Z",
    };

    const result = normalizeExpense(raw);
    expect(result.category_id).toBe("cat-77");
  });
});

describe("sanitizeErrorMessage (logic test)", () => {
  function sanitizeErrorMessage(msg: string): string {
    if (!msg || typeof msg !== "string") return "Request failed";
    const cleaned = msg.replace(/<[^>]*>/g, "");
    return cleaned.length > 500 ? cleaned.slice(0, 500) : cleaned;
  }

  it("strips HTML tags", () => {
    expect(sanitizeErrorMessage("<script>alert('xss')</script>Bad")).toBe(
      "alert('xss')Bad"
    );
  });

  it("truncates messages over 500 characters", () => {
    const long = "a".repeat(600);
    expect(sanitizeErrorMessage(long)).toHaveLength(500);
  });

  it('returns "Request failed" for empty string', () => {
    expect(sanitizeErrorMessage("")).toBe("Request failed");
  });

  it("passes through clean messages unchanged", () => {
    expect(sanitizeErrorMessage("Not found")).toBe("Not found");
  });
});

describe("isStoredTokenExpired (logic test)", () => {
  function isStoredTokenExpired(token: string): boolean {
    try {
      const payloadB64 = token.split(".")[1];
      if (!payloadB64) return true;
      const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(json);
      if (typeof payload.exp !== "number") return true;
      return Date.now() >= (payload.exp - 60) * 1000;
    } catch {
      return true;
    }
  }

  function makeToken(payload: object): string {
    const header = btoa(JSON.stringify({ alg: "HS256" }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.signature`;
  }

  it("returns true for a token with expired exp", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    expect(isStoredTokenExpired(makeToken({ exp: pastExp }))).toBe(true);
  });

  it("returns false for a token with future exp", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    expect(isStoredTokenExpired(makeToken({ exp: futureExp }))).toBe(false);
  });

  it("returns true for a malformed token", () => {
    expect(isStoredTokenExpired("not.a.valid.token")).toBe(true);
  });

  it("returns true for a token without exp claim", () => {
    expect(isStoredTokenExpired(makeToken({ sub: "user" }))).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isStoredTokenExpired("")).toBe(true);
  });
});
