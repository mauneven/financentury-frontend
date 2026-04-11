"use client";

import { create } from "zustand";
import type {
  Budget,
  BudgetSummary,
  Section,
  CreateBudgetInput,
  CreateSectionInput,
  CreateExpenseInput,
  CreateCategoryInput,
  Expense,
  Category,
} from "@/types/budget";
import { budgetApi, sectionApi, expenseApi, categoryApi } from "@/lib/api";

interface BudgetState {
  budgets: Budget[];
  activeBudgetId: string | null;
  summary: BudgetSummary | null;
  expenses: Expense[];
  loading: boolean;
  /** True only while setActiveBudget is fetching (distinct from general loading). */
  summaryLoading: boolean;
  error: string | null;

  // Actions
  fetchBudgets: () => Promise<void>;
  setActiveBudget: (id: string) => Promise<void>;
  createBudget: (data: CreateBudgetInput) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshSummaryOnly: () => Promise<void>;
  addExpense: (data: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (budgetId: string, expenseId: string, data: Partial<CreateExpenseInput>) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addSection: (data: CreateSectionInput) => Promise<Section>;
  updateSection: (sectionId: string, data: Partial<CreateSectionInput>) => Promise<Section>;
  deleteSection: (sectionId: string) => Promise<void>;
  addCategory: (sectionId: string, data: CreateCategoryInput) => Promise<Category>;
  updateCategory: (sectionId: string, categoryId: string, data: Partial<CreateCategoryInput>) => Promise<Category>;
  deleteCategory: (sectionId: string, categoryId: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  activeBudgetId: null,
  summary: null,
  expenses: [],
  loading: false,
  summaryLoading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const budgets = await budgetApi.list();
      set({ budgets, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  setActiveBudget: async (id: string) => {
    const prev = get().activeBudgetId;
    // Clear stale data when switching to a different budget so old content
    // doesn't flash while the new budget loads.
    const clearStale = prev !== id;
    set({
      activeBudgetId: id,
      loading: true,
      summaryLoading: true,
      error: null,
      ...(clearStale ? { summary: null, expenses: [] } : {}),
    });
    try {
      const [summary, expenses] = await Promise.all([
        budgetApi.summary(id),
        expenseApi.list(id),
      ]);
      // Only apply if this budget is still the active one (guard against
      // rapid navigation where a slower request resolves after a newer one).
      if (get().activeBudgetId === id) {
        set({ summary, expenses, loading: false, summaryLoading: false });
      }
    } catch (e) {
      if (get().activeBudgetId === id) {
        set({
          error: e instanceof Error ? e.message : String(e),
          loading: false,
          summaryLoading: false,
        });
      }
    }
  },

  createBudget: async (data) => {
    set({ loading: true, error: null });
    try {
      const budget = await budgetApi.create(data);
      set((state) => ({
        budgets: [...state.budgets, budget],
        loading: false,
      }));
      return budget;
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        loading: false,
      });
      throw e;
    }
  },

  deleteBudget: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await budgetApi.delete(id);
      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
        activeBudgetId:
          state.activeBudgetId === id ? null : state.activeBudgetId,
        summary: state.activeBudgetId === id ? null : state.summary,
        loading: false,
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        loading: false,
      });
      throw e;
    }
  },

  refreshSummary: async () => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) return;
    try {
      const [summary, expenses] = await Promise.all([
        budgetApi.summary(activeBudgetId),
        expenseApi.list(activeBudgetId),
      ]);
      set({ summary, expenses, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshSummaryOnly: async () => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) return;
    try {
      const summary = await budgetApi.summary(activeBudgetId);
      set({ summary, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  addExpense: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const expense = await expenseApi.create(activeBudgetId, data);
    set((state) => ({ expenses: [...state.expenses, expense] }));
    get().refreshSummaryOnly();
    return expense;
  },

  updateExpense: async (budgetId: string, expenseId: string, data: Partial<CreateExpenseInput>) => {
    const updated = await expenseApi.update(budgetId, expenseId, data);
    set((state) => ({
      expenses: state.expenses.map((e) => e.id === expenseId ? updated : e),
    }));
    get().refreshSummaryOnly();
    return updated;
  },

  deleteExpense: async (expenseId: string) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    await expenseApi.delete(activeBudgetId, expenseId);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== expenseId),
    }));
    get().refreshSummaryOnly();
  },

  addSection: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const section = await sectionApi.create(activeBudgetId, data);
    // WS broadcast will trigger refreshSummary via ws-provider
    return section;
  },

  updateSection: async (sectionId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const section = await sectionApi.update(activeBudgetId, sectionId, data);
    // WS broadcast will trigger refreshSummary via ws-provider
    return section;
  },

  deleteSection: async (sectionId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    await sectionApi.delete(activeBudgetId, sectionId);
    // WS broadcast will trigger refreshSummary via ws-provider
  },

  addCategory: async (sectionId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const category = await categoryApi.create(activeBudgetId, sectionId, data);
    // WS broadcast will trigger refreshSummary via ws-provider
    return category;
  },

  updateCategory: async (sectionId, categoryId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const category = await categoryApi.update(activeBudgetId, sectionId, categoryId, data);
    // WS broadcast will trigger refreshSummary via ws-provider
    return category;
  },

  deleteCategory: async (sectionId, categoryId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    await categoryApi.delete(activeBudgetId, sectionId, categoryId);
    // WS broadcast will trigger refreshSummary via ws-provider
  },
}));
