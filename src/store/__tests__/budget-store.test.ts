import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API modules before importing the store
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
  name: "Test Budget",
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
  total_spent: 1500,
};

const mockExpense: Expense = {
  id: "exp-1",
  budget_id: "budget-1",
  category_id: "cat-1",
  amount: 100,
  description: "Test expense",
  expense_date: "2024-01-15",
  created_at: "2024-01-15T00:00:00Z",
};

describe("useBudgetStore", () => {
  beforeEach(() => {
    // Reset the store to initial state
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

  describe("initialization", () => {
    it("starts with empty budgets array", () => {
      const state = useBudgetStore.getState();
      expect(state.budgets).toEqual([]);
    });

    it("starts with null activeBudgetId", () => {
      const state = useBudgetStore.getState();
      expect(state.activeBudgetId).toBeNull();
    });

    it("starts with null summary", () => {
      const state = useBudgetStore.getState();
      expect(state.summary).toBeNull();
    });

    it("starts with empty expenses array", () => {
      const state = useBudgetStore.getState();
      expect(state.expenses).toEqual([]);
    });

    it("starts with loading false", () => {
      const state = useBudgetStore.getState();
      expect(state.loading).toBe(false);
    });

    it("starts with null error", () => {
      const state = useBudgetStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("fetchBudgets", () => {
    it("sets loading while fetching", async () => {
      vi.mocked(budgetApi.list).mockResolvedValue([mockBudget]);

      const promise = useBudgetStore.getState().fetchBudgets();
      // Loading should be set immediately
      expect(useBudgetStore.getState().loading).toBe(true);
      await promise;
    });

    it("stores fetched budgets", async () => {
      vi.mocked(budgetApi.list).mockResolvedValue([mockBudget]);

      await useBudgetStore.getState().fetchBudgets();

      const state = useBudgetStore.getState();
      expect(state.budgets).toEqual([mockBudget]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets error on failure", async () => {
      vi.mocked(budgetApi.list).mockRejectedValue(new Error("Network error"));

      await useBudgetStore.getState().fetchBudgets();

      const state = useBudgetStore.getState();
      expect(state.error).toBe("Network error");
      expect(state.loading).toBe(false);
    });
  });

  describe("setActiveBudget", () => {
    it("sets activeBudgetId and fetches summary + expenses", async () => {
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);
      vi.mocked(expenseApi.list).mockResolvedValue([mockExpense]);

      await useBudgetStore.getState().setActiveBudget("budget-1");

      const state = useBudgetStore.getState();
      expect(state.activeBudgetId).toBe("budget-1");
      expect(state.summary).toEqual(mockSummary);
      expect(state.expenses).toEqual([mockExpense]);
      expect(state.loading).toBe(false);
    });

    it("sets error when API call fails", async () => {
      vi.mocked(budgetApi.summary).mockRejectedValue(
        new Error("Budget not found")
      );
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().setActiveBudget("bad-id");

      const state = useBudgetStore.getState();
      expect(state.error).toBe("Budget not found");
      expect(state.loading).toBe(false);
    });
  });

  describe("addExpense", () => {
    it("throws when no active budget", async () => {
      await expect(
        useBudgetStore.getState().addExpense({
          category_id: "cat-1",
          amount: 100,
          description: "Test",
          expense_date: "2024-01-15",
        })
      ).rejects.toThrow("No active budget");
    });

    it("adds expense to state and returns it", async () => {
      // Set up active budget
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [],
      });

      vi.mocked(expenseApi.create).mockResolvedValue(mockExpense);

      const result = await useBudgetStore.getState().addExpense({
        category_id: "cat-1",
        amount: 100,
        description: "Test expense",
        expense_date: "2024-01-15",
      });

      expect(result).toEqual(mockExpense);
      expect(useBudgetStore.getState().expenses).toContainEqual(mockExpense);
    });

    it("appends to existing expenses", async () => {
      const existingExpense: Expense = {
        ...mockExpense,
        id: "exp-0",
        description: "Existing",
      };

      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [existingExpense],
      });

      const newExpense: Expense = {
        ...mockExpense,
        id: "exp-2",
        description: "New expense",
      };

      vi.mocked(expenseApi.create).mockResolvedValue(newExpense);

      await useBudgetStore.getState().addExpense({
        category_id: "cat-1",
        amount: 200,
        description: "New expense",
        expense_date: "2024-01-16",
      });

      const expenses = useBudgetStore.getState().expenses;
      expect(expenses).toHaveLength(2);
      expect(expenses[0].id).toBe("exp-0");
      expect(expenses[1].id).toBe("exp-2");
    });
  });

  describe("deleteExpense", () => {
    it("removes expense from state", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [mockExpense],
      });

      vi.mocked(expenseApi.delete).mockResolvedValue(undefined);

      await useBudgetStore.getState().deleteExpense("exp-1");

      expect(useBudgetStore.getState().expenses).toHaveLength(0);
    });

    it("throws when no active budget", async () => {
      await expect(
        useBudgetStore.getState().deleteExpense("exp-1")
      ).rejects.toThrow("No active budget");
    });
  });

  describe("deleteBudget", () => {
    it("removes budget from list", async () => {
      useBudgetStore.setState({
        budgets: [mockBudget],
        activeBudgetId: null,
      });

      vi.mocked(budgetApi.delete).mockResolvedValue(undefined);

      await useBudgetStore.getState().deleteBudget("budget-1");

      expect(useBudgetStore.getState().budgets).toHaveLength(0);
    });

    it("clears activeBudgetId if deleting active budget", async () => {
      useBudgetStore.setState({
        budgets: [mockBudget],
        activeBudgetId: "budget-1",
        summary: mockSummary,
      });

      vi.mocked(budgetApi.delete).mockResolvedValue(undefined);

      await useBudgetStore.getState().deleteBudget("budget-1");

      const state = useBudgetStore.getState();
      expect(state.activeBudgetId).toBeNull();
      expect(state.summary).toBeNull();
    });

    it("keeps activeBudgetId if deleting a different budget", async () => {
      const otherBudget: Budget = { ...mockBudget, id: "budget-2" };
      useBudgetStore.setState({
        budgets: [mockBudget, otherBudget],
        activeBudgetId: "budget-1",
        summary: mockSummary,
      });

      vi.mocked(budgetApi.delete).mockResolvedValue(undefined);

      await useBudgetStore.getState().deleteBudget("budget-2");

      const state = useBudgetStore.getState();
      expect(state.activeBudgetId).toBe("budget-1");
      expect(state.summary).toEqual(mockSummary);
      expect(state.budgets).toHaveLength(1);
    });
  });

  describe("createBudget", () => {
    it("adds new budget to list", async () => {
      vi.mocked(budgetApi.create).mockResolvedValue(mockBudget);

      const result = await useBudgetStore.getState().createBudget({
        name: "Test Budget",
        monthly_income: 5000,
        currency: "USD",
        billing_period_months: 1,
        mode: "balanced",
      });

      expect(result).toEqual(mockBudget);
      expect(useBudgetStore.getState().budgets).toContainEqual(mockBudget);
    });

    it("sets error and rethrows on failure", async () => {
      vi.mocked(budgetApi.create).mockRejectedValue(
        new Error("Creation failed")
      );

      await expect(
        useBudgetStore.getState().createBudget({
          name: "Bad",
          monthly_income: 0,
          currency: "USD",
          billing_period_months: 1,
          mode: "balanced",
        })
      ).rejects.toThrow("Creation failed");

      expect(useBudgetStore.getState().error).toBe("Creation failed");
    });
  });
});
