import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API modules
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
  linkApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    linkableBudgets: vi.fn(),
  },
}));

import { useBudgetStore } from "@/store/budget-store";
import { budgetApi, expenseApi, categoryApi } from "@/lib/api";
import type { Budget, BudgetSummary, Expense, Category } from "@/types/budget";

const mockBudget: Budget = {
  id: "budget-1",
  user_id: "user-1",
  name: "Test Budget",
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
  categories: [],
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

const mockCategory: Category = {
  id: "cat-1",
  budget_id: "budget-1",
  name: "Housing",
  allocation_value: 45,
  icon: "home",
  sort_order: 0,
  created_at: "2024-01-01T00:00:00Z",
};

describe("budget-store additional actions", () => {
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
  // updateExpense
  // -----------------------------------------------------------------------
  describe("updateExpense", () => {
    it("updates expense in state", async () => {
      const updated: Expense = { ...mockExpense, amount: 200, description: "Updated" };
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [mockExpense],
      });

      vi.mocked(expenseApi.update).mockResolvedValue(updated);

      const result = await useBudgetStore
        .getState()
        .updateExpense("budget-1", "exp-1", { amount: 200, description: "Updated" });

      expect(result).toEqual(updated);
      expect(useBudgetStore.getState().expenses[0].amount).toBe(200);
      expect(useBudgetStore.getState().expenses[0].description).toBe("Updated");
    });

    it("only updates the matching expense, keeps others", async () => {
      const exp2: Expense = { ...mockExpense, id: "exp-2", amount: 50 };
      const updatedExp1: Expense = { ...mockExpense, amount: 999 };

      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        expenses: [mockExpense, exp2],
      });

      vi.mocked(expenseApi.update).mockResolvedValue(updatedExp1);

      await useBudgetStore
        .getState()
        .updateExpense("budget-1", "exp-1", { amount: 999 });

      const expenses = useBudgetStore.getState().expenses;
      expect(expenses).toHaveLength(2);
      expect(expenses[0].amount).toBe(999);
      expect(expenses[1].amount).toBe(50);
    });
  });

  // -----------------------------------------------------------------------
  // addCategory
  // -----------------------------------------------------------------------
  describe("addCategory", () => {
    it("calls categoryApi.create and returns the category", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(categoryApi.create).mockResolvedValue(mockCategory);

      const result = await useBudgetStore.getState().addCategory({
        name: "Housing",
        allocation_value: 45,
        icon: "home",
      });

      expect(result).toEqual(mockCategory);
      expect(categoryApi.create).toHaveBeenCalledWith("budget-1", {
        name: "Housing",
        allocation_value: 45,
        icon: "home",
      });
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore.getState().addCategory({
          name: "Housing",
          allocation_value: 45,
        })
      ).rejects.toThrow("No active budget");
    });
  });

  // -----------------------------------------------------------------------
  // updateCategory
  // -----------------------------------------------------------------------
  describe("updateCategory", () => {
    it("calls categoryApi.update and returns updated category", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      const updated: Category = { ...mockCategory, name: "Rent" };
      vi.mocked(categoryApi.update).mockResolvedValue(updated);

      const result = await useBudgetStore
        .getState()
        .updateCategory("cat-1", { name: "Rent" });

      expect(result.name).toBe("Rent");
      expect(categoryApi.update).toHaveBeenCalledWith(
        "budget-1",
        "cat-1",
        { name: "Rent" }
      );
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore.getState().updateCategory("cat-1", { name: "x" })
      ).rejects.toThrow("No active budget");
    });
  });

  // -----------------------------------------------------------------------
  // deleteCategory
  // -----------------------------------------------------------------------
  describe("deleteCategory", () => {
    it("calls categoryApi.delete", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(categoryApi.delete).mockResolvedValue(undefined);

      await useBudgetStore.getState().deleteCategory("cat-1");

      expect(categoryApi.delete).toHaveBeenCalledWith("budget-1", "cat-1");
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore.getState().deleteCategory("cat-1")
      ).rejects.toThrow("No active budget");
    });
  });

  // -----------------------------------------------------------------------
  // refreshSummary — with active budget
  // -----------------------------------------------------------------------
  describe("refreshSummary — with active budget", () => {
    it("fetches summary and expenses when activeBudgetId is set", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);
      vi.mocked(expenseApi.list).mockResolvedValue([mockExpense]);

      await useBudgetStore.getState().refreshSummary();

      const state = useBudgetStore.getState();
      expect(state.summary).toEqual(mockSummary);
      expect(state.expenses).toEqual([mockExpense]);
      expect(state.error).toBeNull();
    });

    it("sets error when refreshSummary fails", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockRejectedValue(new Error("Network error"));
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().refreshSummary();

      expect(useBudgetStore.getState().error).toBe("Network error");
    });
  });

  // -----------------------------------------------------------------------
  // refreshSummaryOnly
  // -----------------------------------------------------------------------
  describe("refreshSummaryOnly", () => {
    it("is a no-op when activeBudgetId is null", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await useBudgetStore.getState().refreshSummaryOnly();

      expect(budgetApi.summary).not.toHaveBeenCalled();
    });

    it("fetches only summary (not expenses) when active", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().refreshSummaryOnly();

      const state = useBudgetStore.getState();
      expect(state.summary).toEqual(mockSummary);
      expect(state.error).toBeNull();
      expect(budgetApi.summary).toHaveBeenCalledWith("budget-1");
      expect(expenseApi.list).not.toHaveBeenCalled();
    });

    it("sets error when refreshSummaryOnly fails", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockRejectedValue(new Error("Timeout"));

      await useBudgetStore.getState().refreshSummaryOnly();

      expect(useBudgetStore.getState().error).toBe("Timeout");
    });
  });

  // -----------------------------------------------------------------------
  // deleteBudget — error case
  // -----------------------------------------------------------------------
  describe("deleteBudget — error handling", () => {
    it("sets error and rethrows on failure", async () => {
      useBudgetStore.setState({
        budgets: [mockBudget],
        activeBudgetId: "budget-1",
      });

      vi.mocked(budgetApi.delete).mockRejectedValue(new Error("Server error"));

      await expect(
        useBudgetStore.getState().deleteBudget("budget-1")
      ).rejects.toThrow("Server error");

      expect(useBudgetStore.getState().error).toBe("Server error");
    });
  });

  // -----------------------------------------------------------------------
  // fetchBudgets — error with non-Error thrown
  // -----------------------------------------------------------------------
  describe("fetchBudgets — non-Error thrown", () => {
    it("converts non-Error to string", async () => {
      vi.mocked(budgetApi.list).mockRejectedValue("string error");

      await useBudgetStore.getState().fetchBudgets();

      expect(useBudgetStore.getState().error).toBe("string error");
    });
  });

  // -----------------------------------------------------------------------
  // setActiveBudget — non-Error thrown
  // -----------------------------------------------------------------------
  describe("setActiveBudget — non-Error thrown", () => {
    it("converts non-Error to string", async () => {
      vi.mocked(budgetApi.summary).mockRejectedValue(42);
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().setActiveBudget("budget-1");

      expect(useBudgetStore.getState().error).toBe("42");
    });
  });
});
