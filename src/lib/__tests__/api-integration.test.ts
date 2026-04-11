import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Integration-style tests for the api.ts module.
 * We mock `fetch` globally and test the actual exported API functions
 * to cover the `request` helper, token handling, error sanitization,
 * `normalizeExpense`, and `isStoredTokenExpired`.
 */

// We need to mock auth-store to avoid circular dependencies
vi.mock("@/store/auth-store", () => ({
  useAuthStore: {
    getState: () => ({ token: null }),
  },
}));

// Mock websocket to avoid side effects
vi.mock("@/lib/websocket", () => ({
  budgetWS: { disconnect: vi.fn() },
}));

// Helper to make a valid JWT
function makeJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function makeFutureToken(): string {
  return makeJWT({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
}

function makeExpiredToken(): string {
  return makeJWT({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 3600 });
}

describe("api.ts — exported API modules", () => {
  let budgetApi: typeof import("@/lib/api").budgetApi;
  let expenseApi: typeof import("@/lib/api").expenseApi;
  let authApi: typeof import("@/lib/api").authApi;
  let sectionApi: typeof import("@/lib/api").sectionApi;
  let categoryApi: typeof import("@/lib/api").categoryApi;
  let inviteApi: typeof import("@/lib/api").inviteApi;
  let collaboratorApi: typeof import("@/lib/api").collaboratorApi;

  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Import the actual api module (not mocked)
    const api = await import("@/lib/api");
    budgetApi = api.budgetApi;
    expenseApi = api.expenseApi;
    authApi = api.authApi;
    sectionApi = api.sectionApi;
    categoryApi = api.categoryApi;
    inviteApi = api.inviteApi;
    collaboratorApi = api.collaboratorApi;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // request helper — token handling
  // -----------------------------------------------------------------------
  describe("request helper — token handling", () => {
    it("includes Authorization header when valid token is in localStorage", async () => {
      const token = makeFutureToken();
      localStorage.setItem("financentury_token", token);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.list();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBe(`Bearer ${token}`);
    });

    it("does not include Authorization header when no token", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.list();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });

    it("removes expired token from localStorage and does not send it", async () => {
      const expired = makeExpiredToken();
      localStorage.setItem("financentury_token", expired);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.list();

      expect(localStorage.getItem("financentury_token")).toBeNull();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // request helper — error handling
  // -----------------------------------------------------------------------
  describe("request helper — error handling", () => {
    it("throws sanitized error for non-ok response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: "Invalid input" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(budgetApi.list()).rejects.toThrow("Invalid input");
    });

    it("strips HTML from error messages (XSS prevention)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: () =>
          Promise.resolve({
            error: '<script>alert("xss")</script>Server error',
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(budgetApi.list()).rejects.toThrow(
        'alert("xss")Server error'
      );
    });

    it("truncates very long error messages", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: () =>
          Promise.resolve({
            error: "x".repeat(600),
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      try {
        await budgetApi.list();
      } catch (e: unknown) {
        expect((e as Error).message.length).toBeLessThanOrEqual(500);
      }
    });

    it("uses statusText when JSON parsing fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.reject(new Error("not json")),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(budgetApi.list()).rejects.toThrow("Bad Gateway");
    });

    it("returns undefined for 204 No Content", async () => {
      const token = makeFutureToken();
      localStorage.setItem("financentury_token", token);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error("no body")),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await budgetApi.delete("budget-1");
      expect(result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // budgetApi
  // -----------------------------------------------------------------------
  describe("budgetApi", () => {
    it("budgetApi.list calls GET /budgets", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.list();

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets");
    });

    it("budgetApi.get calls GET /budgets/:id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.get("budget-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/budget-1");
    });

    it("budgetApi.create calls POST /budgets", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.create({
        name: "Test",
        monthly_income: 5000,
        currency: "USD",
        billing_period_months: 1,
        mode: "balanced",
      });

      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("budgetApi.summary calls GET /budgets/:id/summary", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.summary("budget-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/budget-1/summary");
    });

    it("budgetApi.trends calls GET /budgets/:id/trends", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.trends("budget-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/budget-1/trends");
    });

    it("budgetApi.update calls PUT /budgets/:id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await budgetApi.update("budget-1", { name: "Updated" });

      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/budget-1");
    });
  });

  // -----------------------------------------------------------------------
  // expenseApi — normalizeExpense
  // -----------------------------------------------------------------------
  describe("expenseApi — normalizeExpense", () => {
    it("normalizes subcategory_id to category_id in expense list", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: "exp-1",
              budget_id: "b-1",
              subcategory_id: "cat-99",
              amount: 100,
              description: "Test",
              expense_date: "2024-01-15",
              created_at: "2024-01-15T00:00:00Z",
            },
          ]),
      });
      vi.stubGlobal("fetch", mockFetch);

      const expenses = await expenseApi.list("b-1");

      expect(expenses[0].category_id).toBe("cat-99");
    });

    it("keeps category_id when already present", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: "exp-1",
              budget_id: "b-1",
              category_id: "cat-42",
              subcategory_id: "cat-99",
              amount: 100,
              description: "Test",
              expense_date: "2024-01-15",
              created_at: "2024-01-15T00:00:00Z",
            },
          ]),
      });
      vi.stubGlobal("fetch", mockFetch);

      const expenses = await expenseApi.list("b-1");

      expect(expenses[0].category_id).toBe("cat-42");
    });

    it("handles null response (returns empty array)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
      });
      vi.stubGlobal("fetch", mockFetch);

      const expenses = await expenseApi.list("b-1");

      expect(expenses).toEqual([]);
    });

    it("normalizes NIL_UUID category_id to subcategory_id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              id: "exp-1",
              budget_id: "b-1",
              category_id: "00000000-0000-0000-0000-000000000000",
              subcategory_id: "cat-real",
              amount: 100,
              description: "Test",
              expense_date: "2024-01-15",
              created_at: "2024-01-15T00:00:00Z",
            },
          ]),
      });
      vi.stubGlobal("fetch", mockFetch);

      const expenses = await expenseApi.list("b-1");

      expect(expenses[0].category_id).toBe("cat-real");
    });
  });

  // -----------------------------------------------------------------------
  // expenseApi.create — sends both category_id and subcategory_id
  // -----------------------------------------------------------------------
  describe("expenseApi.create", () => {
    it("sends both category_id and subcategory_id for backward compatibility", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "exp-new",
            budget_id: "b-1",
            category_id: "cat-1",
            amount: 100,
            description: "New",
            expense_date: "2024-01-15",
            created_at: "2024-01-15T00:00:00Z",
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expenseApi.create("b-1", {
        category_id: "cat-1",
        amount: 100,
        description: "New",
        expense_date: "2024-01-15",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.category_id).toBe("cat-1");
      expect(body.subcategory_id).toBe("cat-1");
    });
  });

  // -----------------------------------------------------------------------
  // expenseApi.update — sends subcategory_id when category_id provided
  // -----------------------------------------------------------------------
  describe("expenseApi.update", () => {
    it("includes subcategory_id when updating category_id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "exp-1",
            budget_id: "b-1",
            category_id: "cat-2",
            amount: 100,
            description: "Test",
            expense_date: "2024-01-15",
            created_at: "2024-01-15T00:00:00Z",
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expenseApi.update("b-1", "exp-1", { category_id: "cat-2" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subcategory_id).toBe("cat-2");
    });
  });

  // -----------------------------------------------------------------------
  // sectionApi
  // -----------------------------------------------------------------------
  describe("sectionApi", () => {
    it("sectionApi.list calls GET /budgets/:id/sections", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await sectionApi.list("budget-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/budget-1/sections");
    });

    it("sectionApi.create calls POST", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await sectionApi.create("b-1", { name: "Needs", allocation_percent: 50 });

      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("sectionApi.update calls PUT", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await sectionApi.update("b-1", "s-1", { name: "Updated" });

      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
    });

    it("sectionApi.delete calls DELETE", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      vi.stubGlobal("fetch", mockFetch);

      await sectionApi.delete("b-1", "s-1");

      expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
    });
  });

  // -----------------------------------------------------------------------
  // categoryApi
  // -----------------------------------------------------------------------
  describe("categoryApi", () => {
    it("categoryApi.create calls POST with correct path", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await categoryApi.create("b-1", "s-1", {
        name: "Housing",
        allocation_percent: 45,
      });

      expect(mockFetch.mock.calls[0][0]).toContain(
        "/budgets/b-1/sections/s-1/categories"
      );
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("categoryApi.update calls PUT", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await categoryApi.update("b-1", "s-1", "c-1", { name: "Rent" });

      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
    });

    it("categoryApi.delete calls DELETE", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      vi.stubGlobal("fetch", mockFetch);

      await categoryApi.delete("b-1", "s-1", "c-1");

      expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
    });
  });

  // -----------------------------------------------------------------------
  // authApi
  // -----------------------------------------------------------------------
  describe("authApi", () => {
    it("authApi.login calls POST /auth/login", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            token: makeFutureToken(),
            user: { id: "u1", email: "test@test.com", full_name: "Test", avatar_url: "" },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await authApi.login("test@test.com", "password");

      expect(mockFetch.mock.calls[0][0]).toContain("/auth/login");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("authApi.register calls POST /auth/register", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            token: makeFutureToken(),
            user: { id: "u1", email: "test@test.com", full_name: "Test", avatar_url: "" },
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await authApi.register("Test", "test@test.com", "password");

      expect(mockFetch.mock.calls[0][0]).toContain("/auth/register");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("authApi.me calls GET /auth/me", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "u1",
            email: "test@test.com",
            full_name: "Test",
            avatar_url: "",
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await authApi.me();

      expect(mockFetch.mock.calls[0][0]).toContain("/auth/me");
    });
  });

  // -----------------------------------------------------------------------
  // inviteApi
  // -----------------------------------------------------------------------
  describe("inviteApi", () => {
    it("inviteApi.create calls POST /budgets/:id/invite", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            invite_token: "tok",
            invite_url: "http://example.com",
            expires_at: "2024-12-31",
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await inviteApi.create("b-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/b-1/invite");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("inviteApi.getInfo calls GET /invites/:token", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            budget_name: "Budget",
            inviter_name: "User",
            expires_at: "2024-12-31",
            is_expired: false,
            is_used: false,
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await inviteApi.getInfo("invite-tok");

      expect(mockFetch.mock.calls[0][0]).toContain("/invites/invite-tok");
    });

    it("inviteApi.accept calls POST /invites/:token/accept", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      await inviteApi.accept("invite-tok");

      expect(mockFetch.mock.calls[0][0]).toContain("/invites/invite-tok/accept");
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });
  });

  // -----------------------------------------------------------------------
  // collaboratorApi
  // -----------------------------------------------------------------------
  describe("collaboratorApi", () => {
    it("collaboratorApi.list calls GET /budgets/:id/collaborators", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await collaboratorApi.list("b-1");

      expect(mockFetch.mock.calls[0][0]).toContain("/budgets/b-1/collaborators");
    });

    it("collaboratorApi.remove calls DELETE", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      vi.stubGlobal("fetch", mockFetch);

      await collaboratorApi.remove("b-1", "user-1");

      expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
      expect(mockFetch.mock.calls[0][0]).toContain(
        "/budgets/b-1/collaborators/user-1"
      );
    });
  });

  // -----------------------------------------------------------------------
  // 401 handling — removes token and redirects
  // -----------------------------------------------------------------------
  describe("request — 401 handling", () => {
    it("removes token from localStorage on 401", async () => {
      const token = makeFutureToken();
      localStorage.setItem("financentury_token", token);

      // We need to mock window.location.href setter to prevent navigation
      const originalHref = window.location.href;
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: originalHref },
        writable: true,
        configurable: true,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      try {
        await budgetApi.list();
      } catch {
        // Expected to throw
      }

      expect(localStorage.getItem("financentury_token")).toBeNull();
    });
  });
});
