import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API modules (same pattern as budget-store.test.ts)
vi.mock("@/lib/api", () => ({
  budgetApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    summary: vi.fn(),
    trends: vi.fn(),
  },
  sectionApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  expenseApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  categoryApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useBudgetStore } from "@/store/budget-store";
import { budgetApi, expenseApi } from "@/lib/api";
import type { Budget, BudgetSummary, Expense } from "@/types/budget";

const mockBudget: Budget = {
  id: "budget-1",
  user_id: "user-1",
  name: "Edge Case Budget",
  icon: "wallet",
  monthly_income: 5000,
  currency: "USD",
  billing_period_months: 1,
  billing_cutoff_day: 1,
  mode: "balanced",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockSummary: BudgetSummary = {
  budget: mockBudget,
  sections: [],
  total_budget: 5000,
  total_spent: 0,
};

const mockExpense: Expense = {
  id: "exp-1",
  budget_id: "budget-1",
  category_id: "cat-1",
  amount: 100,
  description: "Test",
  expense_date: "2024-01-15",
  created_at: "2024-01-15T00:00:00Z",
};

describe("budget-store edge cases", () => {
  beforeEach(() => {
    useBudgetStore.setState({
      budgets: [],
      activeBudgetId: null,
      summary: null,
      expenses: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // addExpense edge cases
  // -----------------------------------------------------------------------
  describe("addExpense — zero amount", () => {
    it("sends zero-amount expense to the API without throwing", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1", expenses: [] });

      const zeroExpense: Expense = { ...mockExpense, amount: 0 };
      vi.mocked(expenseApi.create).mockResolvedValue(zeroExpense);

      const result = await useBudgetStore.getState().addExpense({
        category_id: "cat-1",
        amount: 0,
        description: "Free item",
        expense_date: "2024-01-15",
      });

      expect(result.amount).toBe(0);
      expect(useBudgetStore.getState().expenses).toContainEqual(zeroExpense);
    });
  });

  describe("addExpense — negative amount", () => {
    it("sends negative-amount expense to the API (refund scenario)", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1", expenses: [] });

      const negExpense: Expense = { ...mockExpense, amount: -50 };
      vi.mocked(expenseApi.create).mockResolvedValue(negExpense);

      const result = await useBudgetStore.getState().addExpense({
        category_id: "cat-1",
        amount: -50,
        description: "Refund",
        expense_date: "2024-01-15",
      });

      expect(result.amount).toBe(-50);
    });
  });

  describe("addExpense — extremely long description", () => {
    it("passes a 10 000-character description to the API", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1", expenses: [] });

      const longDesc = "x".repeat(10_000);
      const longExpense: Expense = { ...mockExpense, description: longDesc };
      vi.mocked(expenseApi.create).mockResolvedValue(longExpense);

      const result = await useBudgetStore.getState().addExpense({
        category_id: "cat-1",
        amount: 10,
        description: longDesc,
        expense_date: "2024-01-15",
      });

      expect(result.description).toHaveLength(10_000);
    });
  });

  // -----------------------------------------------------------------------
  // deleteExpense — non-existent ID
  // -----------------------------------------------------------------------
  describe("deleteExpense — non-existent ID", () => {
    it("does not throw when deleting an ID not in the local state", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [mockExpense],
      });

      vi.mocked(expenseApi.delete).mockResolvedValue(undefined);

      // "exp-nonexistent" is not in the expenses array, but the API call succeeds.
      await expect(
        useBudgetStore.getState().deleteExpense("exp-nonexistent")
      ).resolves.not.toThrow();

      // The existing expense should still be there.
      expect(useBudgetStore.getState().expenses).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // setActiveBudget — empty string ID
  // -----------------------------------------------------------------------
  describe("setActiveBudget — empty string ID", () => {
    it("sets activeBudgetId to empty string (API will likely fail)", async () => {
      vi.mocked(budgetApi.summary).mockRejectedValue(
        new Error("Budget not found")
      );
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().setActiveBudget("");

      const state = useBudgetStore.getState();
      // activeBudgetId is set before the API call.
      expect(state.activeBudgetId).toBe("");
      expect(state.error).toBe("Budget not found");
    });
  });

  // -----------------------------------------------------------------------
  // refreshSummary — no active budget
  // -----------------------------------------------------------------------
  describe("refreshSummary — no active budget", () => {
    it("is a no-op when activeBudgetId is null", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await useBudgetStore.getState().refreshSummary();

      // No API calls should have been made.
      expect(budgetApi.summary).not.toHaveBeenCalled();
      expect(expenseApi.list).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent addExpense calls (race condition test)
  // -----------------------------------------------------------------------
  describe("concurrent addExpense calls", () => {
    it("both expenses appear in state when two addExpense calls run in parallel", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1", expenses: [] });

      const exp1: Expense = { ...mockExpense, id: "exp-A", description: "First" };
      const exp2: Expense = { ...mockExpense, id: "exp-B", description: "Second" };

      vi.mocked(expenseApi.create)
        .mockResolvedValueOnce(exp1)
        .mockResolvedValueOnce(exp2);

      const [r1, r2] = await Promise.all([
        useBudgetStore.getState().addExpense({
          category_id: "cat-1",
          amount: 10,
          description: "First",
          expense_date: "2024-01-15",
        }),
        useBudgetStore.getState().addExpense({
          category_id: "cat-1",
          amount: 20,
          description: "Second",
          expense_date: "2024-01-15",
        }),
      ]);

      expect(r1.id).toBe("exp-A");
      expect(r2.id).toBe("exp-B");

      const expenses = useBudgetStore.getState().expenses;
      expect(expenses).toHaveLength(2);
      expect(expenses.map((e) => e.id)).toContain("exp-A");
      expect(expenses.map((e) => e.id)).toContain("exp-B");
    });
  });

  // -----------------------------------------------------------------------
  // Store state isolation between tests
  // -----------------------------------------------------------------------
  describe("store state isolation", () => {
    it("starts clean after beforeEach reset (first test)", () => {
      const state = useBudgetStore.getState();
      expect(state.budgets).toEqual([]);
      expect(state.activeBudgetId).toBeNull();
      expect(state.expenses).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("mutating state in one test does not leak into the next (setup)", () => {
      useBudgetStore.setState({
        budgets: [mockBudget],
        activeBudgetId: "budget-1",
        expenses: [mockExpense],
        error: "some error",
      });
      expect(useBudgetStore.getState().budgets).toHaveLength(1);
    });

    it("state is clean again after beforeEach (verification)", () => {
      // This test runs after the previous one that mutated state.
      // beforeEach should have reset it.
      const state = useBudgetStore.getState();
      expect(state.budgets).toEqual([]);
      expect(state.activeBudgetId).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
