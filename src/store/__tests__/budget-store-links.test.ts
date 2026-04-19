import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API modules before importing the store.
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
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    linkableBudgets: vi.fn(),
  },
}));

import { useBudgetStore } from "@/store/budget-store";
import { budgetApi, expenseApi, linkApi } from "@/lib/api";
import type {
  Budget,
  BudgetSummary,
  BudgetLink,
  Expense,
} from "@/types/budget";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockBudget: Budget = {
  id: "budget-1",
  user_id: "user-1",
  name: "Target Budget",
  icon: "wallet",
  monthly_income: 5000,
  currency: "USD",
  billing_period_months: 1,
  billing_cutoff_day: 1,
  mode: "balanced",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockSourceBudget: Budget = {
  id: "budget-2",
  user_id: "user-2",
  name: "Source Budget",
  icon: "coins",
  monthly_income: 3000,
  currency: "USD",
  billing_period_months: 1,
  billing_cutoff_day: 1,
  mode: "manual",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockLink: BudgetLink = {
  id: "link-1",
  source_budget_id: "budget-2",
  target_budget_id: "budget-1",
  source_category_id: "cat-2",
  filter_mode: "all",
  created_by: "user-1",
  created_at: "2024-01-01T00:00:00Z",
};

const mockLink2: BudgetLink = {
  id: "link-2",
  source_budget_id: "budget-2",
  target_budget_id: "budget-1",
  source_category_id: "cat-3",
  filter_mode: "mine",
  created_by: "user-1",
  created_at: "2024-02-01T00:00:00Z",
};

const mockSummary: BudgetSummary = {
  budget: mockBudget,
  categories: [],
  total_budget: 5000,
  total_spent: 1500,
};

const mockSummaryWithLinks: BudgetSummary = {
  budget: mockBudget,
  categories: [],
  linked_categories: [
    {
      link: mockLink,
      source_budget: mockSourceBudget,
      category: {
        category: {
          id: "cat-linked",
          budget_id: "budget-2",
          name: "Linked Category",
          allocation_value: 100,
          icon: "tag",
          sort_order: 0,
          created_at: "2024-01-01T00:00:00Z",
        },
        allocated_amount: 100,
        total_spent: 50,
        expense_count: 2,
      },
    },
  ],
  total_budget: 5000,
  total_spent: 1550,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("budget-store link actions", () => {
  beforeEach(() => {
    useBudgetStore.setState({
      budgets: [],
      activeBudgetId: null,
      summary: null,
      expenses: [],
      linkedExpenses: [],
      links: [],
      loading: false,
      summaryLoading: false,
      error: null,
    });
    vi.clearAllMocks();

    // Default mock for expenseApi.list so background fetchLinkedExpenses
    // does not blow up when it fetches from source budgets.
    vi.mocked(expenseApi.list).mockResolvedValue([]);
  });

  // -----------------------------------------------------------------------
  // createLink
  // -----------------------------------------------------------------------
  describe("createLink", () => {
    it("adds the new link to the links array", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [],
      });

      vi.mocked(linkApi.create).mockResolvedValue(mockLink);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      const result = await useBudgetStore.getState().createLink({
        source_budget_id: "budget-2",
        source_category_id: "cat-2",
        filter_mode: "all",
      });

      expect(result).toEqual(mockLink);
      expect(useBudgetStore.getState().links).toContainEqual(mockLink);
      expect(useBudgetStore.getState().links).toHaveLength(1);
    });

    it("appends to existing links", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.create).mockResolvedValue(mockLink2);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().createLink({
        source_budget_id: "budget-2",
        source_category_id: "cat-3",
        filter_mode: "mine",
      });

      const links = useBudgetStore.getState().links;
      expect(links).toHaveLength(2);
      expect(links[0].id).toBe("link-1");
      expect(links[1].id).toBe("link-2");
    });

    it("calls linkApi.create with correct arguments", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(linkApi.create).mockResolvedValue(mockLink);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().createLink({
        source_budget_id: "budget-2",
        source_category_id: "cat-2",
        filter_mode: "all",
      });

      expect(linkApi.create).toHaveBeenCalledWith("budget-1", {
        source_budget_id: "budget-2",
        source_category_id: "cat-2",
        filter_mode: "all",
      });
    });

    it("triggers refreshSummaryOnly after creation", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(linkApi.create).mockResolvedValue(mockLink);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummaryWithLinks);

      await useBudgetStore.getState().createLink({
        source_budget_id: "budget-2",
        source_category_id: "cat-2",
        filter_mode: "all",
      });

      // refreshSummaryOnly calls budgetApi.summary
      expect(budgetApi.summary).toHaveBeenCalledWith("budget-1");
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore.getState().createLink({
          source_budget_id: "budget-2",
          source_category_id: "cat-2",
          filter_mode: "all",
        })
      ).rejects.toThrow("No active budget");

      expect(linkApi.create).not.toHaveBeenCalled();
    });

    it("propagates API errors", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(linkApi.create).mockRejectedValue(
        new Error("cannot link a budget to itself")
      );

      await expect(
        useBudgetStore.getState().createLink({
          source_budget_id: "budget-1",
          source_category_id: "cat-1",
          filter_mode: "all",
        })
      ).rejects.toThrow("cannot link a budget to itself");
    });
  });

  // -----------------------------------------------------------------------
  // updateLink
  // -----------------------------------------------------------------------
  describe("updateLink", () => {
    it("updates the link in the links array", async () => {
      const updatedLink: BudgetLink = { ...mockLink, filter_mode: "mine" };

      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink, mockLink2],
      });

      vi.mocked(linkApi.update).mockResolvedValue(updatedLink);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      const result = await useBudgetStore
        .getState()
        .updateLink("link-1", { filter_mode: "mine" });

      expect(result.filter_mode).toBe("mine");

      const links = useBudgetStore.getState().links;
      expect(links).toHaveLength(2);
      expect(links[0].filter_mode).toBe("mine");
      expect(links[1].filter_mode).toBe("mine"); // link-2 was already "mine"
    });

    it("calls linkApi.update with correct arguments", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.update).mockResolvedValue({
        ...mockLink,
        filter_mode: "mine",
      });
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore
        .getState()
        .updateLink("link-1", { filter_mode: "mine" });

      expect(linkApi.update).toHaveBeenCalledWith("budget-1", "link-1", {
        filter_mode: "mine",
      });
    });

    it("triggers refreshSummaryOnly after update", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.update).mockResolvedValue({
        ...mockLink,
        filter_mode: "mine",
      });
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore
        .getState()
        .updateLink("link-1", { filter_mode: "mine" });

      expect(budgetApi.summary).toHaveBeenCalledWith("budget-1");
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore
          .getState()
          .updateLink("link-1", { filter_mode: "mine" })
      ).rejects.toThrow("No active budget");

      expect(linkApi.update).not.toHaveBeenCalled();
    });

    it("only updates the matching link, keeps others intact", async () => {
      const updatedLink: BudgetLink = { ...mockLink, filter_mode: "mine" };

      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink, mockLink2],
      });

      vi.mocked(linkApi.update).mockResolvedValue(updatedLink);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore
        .getState()
        .updateLink("link-1", { filter_mode: "mine" });

      const links = useBudgetStore.getState().links;
      expect(links[0].id).toBe("link-1");
      expect(links[1].id).toBe("link-2");
      // link-2 should be untouched
      expect(links[1].filter_mode).toBe("mine");
    });
  });

  // -----------------------------------------------------------------------
  // deleteLink
  // -----------------------------------------------------------------------
  describe("deleteLink", () => {
    it("removes the link from the links array", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink, mockLink2],
      });

      vi.mocked(linkApi.delete).mockResolvedValue(undefined);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().deleteLink("link-1");

      const links = useBudgetStore.getState().links;
      expect(links).toHaveLength(1);
      expect(links[0].id).toBe("link-2");
    });

    it("calls linkApi.delete with correct arguments", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.delete).mockResolvedValue(undefined);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().deleteLink("link-1");

      expect(linkApi.delete).toHaveBeenCalledWith("budget-1", "link-1");
    });

    it("triggers refreshSummaryOnly after deletion", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.delete).mockResolvedValue(undefined);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().deleteLink("link-1");

      expect(budgetApi.summary).toHaveBeenCalledWith("budget-1");
    });

    it("throws when no active budget", async () => {
      useBudgetStore.setState({ activeBudgetId: null });

      await expect(
        useBudgetStore.getState().deleteLink("link-1")
      ).rejects.toThrow("No active budget");

      expect(linkApi.delete).not.toHaveBeenCalled();
    });

    it("results in empty array when deleting last link", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.delete).mockResolvedValue(undefined);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().deleteLink("link-1");

      expect(useBudgetStore.getState().links).toEqual([]);
    });

    it("handles deletion of non-existent link gracefully", async () => {
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
      });

      vi.mocked(linkApi.delete).mockResolvedValue(undefined);
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);

      await useBudgetStore.getState().deleteLink("link-nonexistent");

      // Link array should be unchanged since filter didn't match.
      expect(useBudgetStore.getState().links).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // setActiveBudget — links included in initial fetch
  // -----------------------------------------------------------------------
  describe("setActiveBudget — includes links", () => {
    it("fetches links along with summary and expenses", async () => {
      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);
      vi.mocked(expenseApi.list).mockResolvedValue([mockExpense]);
      vi.mocked(linkApi.list).mockResolvedValue([mockLink, mockLink2]);

      await useBudgetStore.getState().setActiveBudget("budget-1");

      const state = useBudgetStore.getState();
      expect(state.links).toHaveLength(2);
      expect(state.links[0].id).toBe("link-1");
      expect(state.links[1].id).toBe("link-2");
      expect(linkApi.list).toHaveBeenCalledWith("budget-1");
    });

    it("clears links when switching to a different budget", async () => {
      // Start with budget-1 data.
      useBudgetStore.setState({
        activeBudgetId: "budget-1",
        links: [mockLink],
        expenses: [mockExpense],
        summary: mockSummary,
      });

      // Switch to budget-2.
      vi.mocked(budgetApi.summary).mockResolvedValue({
        ...mockSummary,
        budget: { ...mockBudget, id: "budget-2" },
      });
      vi.mocked(expenseApi.list).mockResolvedValue([]);
      vi.mocked(linkApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().setActiveBudget("budget-2");

      expect(useBudgetStore.getState().links).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // refreshSummary — linked data in summary
  // -----------------------------------------------------------------------
  describe("refreshSummary — includes linked category data", () => {
    it("stores linked_categories from summary response", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummaryWithLinks);
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().refreshSummary();

      const summary = useBudgetStore.getState().summary;
      expect(summary?.linked_categories).toHaveLength(1);
      expect(summary?.linked_categories?.[0].link.id).toBe("link-1");
      expect(summary?.linked_categories?.[0].source_budget.name).toBe(
        "Source Budget"
      );
    });

    it("handles summary without linked categories", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummary);
      vi.mocked(expenseApi.list).mockResolvedValue([]);

      await useBudgetStore.getState().refreshSummary();

      const summary = useBudgetStore.getState().summary;
      expect(summary?.linked_categories).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // refreshSummaryOnly — linked data
  // -----------------------------------------------------------------------
  describe("refreshSummaryOnly — includes linked data", () => {
    it("updates summary with linked categories", async () => {
      useBudgetStore.setState({ activeBudgetId: "budget-1" });

      vi.mocked(budgetApi.summary).mockResolvedValue(mockSummaryWithLinks);

      await useBudgetStore.getState().refreshSummaryOnly();

      const summary = useBudgetStore.getState().summary;
      expect(summary?.linked_categories).toHaveLength(1);
      expect(summary?.total_spent).toBe(1550);
    });
  });

  // -----------------------------------------------------------------------
  // link state initialization
  // -----------------------------------------------------------------------
  describe("link state initialization", () => {
    it("starts with empty links array", () => {
      const state = useBudgetStore.getState();
      expect(state.links).toEqual([]);
    });

    it("starts with empty linkedExpenses array", () => {
      const state = useBudgetStore.getState();
      expect(state.linkedExpenses).toEqual([]);
    });
  });
});
