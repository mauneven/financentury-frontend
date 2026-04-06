"use client";

import { create } from "zustand";
import type {
  Budget,
  BudgetSummary,
  Category,
  Expense,
} from "@/types/budget";
import { budgetApi, categoryApi, expenseApi } from "@/lib/api";

interface BudgetState {
  budgets: Budget[];
  activeBudgetId: string | null;
  summary: BudgetSummary | null;
  expenses: Expense[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchBudgets: () => Promise<void>;
  setActiveBudget: (id: string) => Promise<void>;
  createBudget: (data: Parameters<typeof budgetApi.create>[0]) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  refreshSummary: () => Promise<void>;
  addExpense: (data: Parameters<typeof expenseApi.create>[1]) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addCategory: (data: Parameters<typeof categoryApi.create>[1]) => Promise<Category>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  activeBudgetId: null,
  summary: null,
  expenses: [],
  loading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const budgets = await budgetApi.list();
      set({ budgets, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setActiveBudget: async (id: string) => {
    set({ activeBudgetId: id, loading: true, error: null });
    try {
      const [summary, expenses] = await Promise.all([
        budgetApi.summary(id),
        expenseApi.list(id),
      ]);
      set({ summary, expenses, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createBudget: async (data) => {
    const budget = await budgetApi.create(data);
    set((state) => ({ budgets: [...state.budgets, budget] }));
    return budget;
  },

  deleteBudget: async (id: string) => {
    await budgetApi.delete(id);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
      activeBudgetId: state.activeBudgetId === id ? null : state.activeBudgetId,
      summary: state.activeBudgetId === id ? null : state.summary,
    }));
  },

  refreshSummary: async () => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) return;
    try {
      const [summary, expenses] = await Promise.all([
        budgetApi.summary(activeBudgetId),
        expenseApi.list(activeBudgetId),
      ]);
      set({ summary, expenses });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addExpense: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");
    const expense = await expenseApi.create(activeBudgetId, data);
    set((state) => ({ expenses: [...state.expenses, expense] }));
    // Refresh summary to update totals
    get().refreshSummary();
    return expense;
  },

  deleteExpense: async (expenseId: string) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");
    await expenseApi.delete(activeBudgetId, expenseId);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== expenseId),
    }));
    get().refreshSummary();
  },

  addCategory: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");
    const category = await categoryApi.create(activeBudgetId, data);
    get().refreshSummary();
    return category;
  },
}));
