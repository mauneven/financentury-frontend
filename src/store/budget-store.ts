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
import { useAuthStore } from "@/store/auth-store";
import { localBudgetStorage } from "@/lib/local-storage";

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
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        const budgets = localBudgetStorage.getBudgets();
        set({ budgets, loading: false });
      } else {
        const budgets = await budgetApi.list();
        set({ budgets, loading: false });
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setActiveBudget: async (id: string) => {
    set({ activeBudgetId: id, loading: true, error: null });
    try {
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        const summary = localBudgetStorage.computeSummary(id);
        const expenses = localBudgetStorage.getExpenses(id);
        set({ summary, expenses, loading: false });
      } else {
        const [summary, expenses] = await Promise.all([
          budgetApi.summary(id),
          expenseApi.list(id),
        ]);
        set({ summary, expenses, loading: false });
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createBudget: async (data) => {
    set({ loading: true, error: null });
    try {
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        const budget = localBudgetStorage.saveBudget(data);
        set((state) => ({
          budgets: [...state.budgets, budget],
          loading: false,
        }));
        return budget;
      } else {
        const budget = await budgetApi.create(data);
        set((state) => ({
          budgets: [...state.budgets, budget],
          loading: false,
        }));
        return budget;
      }
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
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        localBudgetStorage.deleteBudget(id);
      } else {
        await budgetApi.delete(id);
      }
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
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        const summary = localBudgetStorage.computeSummary(activeBudgetId);
        const expenses = localBudgetStorage.getExpenses(activeBudgetId);
        set({ summary, expenses, error: null });
      } else {
        const [summary, expenses] = await Promise.all([
          budgetApi.summary(activeBudgetId),
          expenseApi.list(activeBudgetId),
        ]);
        set({ summary, expenses, error: null });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshSummaryOnly: async () => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) return;
    try {
      const { mode } = useAuthStore.getState();
      if (mode === "local") {
        const summary = localBudgetStorage.computeSummary(activeBudgetId);
        set({ summary, error: null });
      } else {
        const summary = await budgetApi.summary(activeBudgetId);
        set({ summary, error: null });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addExpense: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const expense = localBudgetStorage.saveExpense(activeBudgetId, data);
      set((state) => ({ expenses: [...state.expenses, expense] }));
      // Refresh summary to update totals
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return expense;
    } else {
      const expense = await expenseApi.create(activeBudgetId, data);
      set((state) => ({ expenses: [...state.expenses, expense] }));
      // Refresh summary to update totals
      get().refreshSummaryOnly();
      return expense;
    }
  },

  updateExpense: async (budgetId: string, expenseId: string, data: Partial<CreateExpenseInput>) => {
    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const updated = localBudgetStorage.updateExpense(expenseId, data);
      const summary = localBudgetStorage.computeSummary(budgetId);
      const expenses = localBudgetStorage.getExpenses(budgetId);
      set({ summary, expenses, error: null });
      return updated;
    } else {
      const updated = await expenseApi.update(budgetId, expenseId, data);
      set((state) => ({
        expenses: state.expenses.map((e) => e.id === expenseId ? updated : e),
      }));
      await get().refreshSummary();
      return updated;
    }
  },

  deleteExpense: async (expenseId: string) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      localBudgetStorage.deleteExpense(expenseId);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== expenseId),
      }));
      // Refresh summary to update totals
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
    } else {
      await expenseApi.delete(activeBudgetId, expenseId);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== expenseId),
      }));
      get().refreshSummaryOnly();
    }
  },

  addSection: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const section = localBudgetStorage.saveSection(activeBudgetId, data);
      // Refresh summary to include the new section
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return section;
    } else {
      const section = await sectionApi.create(activeBudgetId, data);
      get().refreshSummaryOnly();
      return section;
    }
  },

  updateSection: async (sectionId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const section = localBudgetStorage.updateSection(sectionId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return section;
    } else {
      const section = await sectionApi.update(activeBudgetId, sectionId, data);
      get().refreshSummaryOnly();
      return section;
    }
  },

  deleteSection: async (sectionId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      localBudgetStorage.deleteSection(sectionId);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      const expenses = localBudgetStorage.getExpenses(activeBudgetId);
      set({ summary, expenses });
    } else {
      await sectionApi.delete(activeBudgetId, sectionId);
      get().refreshSummaryOnly();
    }
  },

  addCategory: async (sectionId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const category = localBudgetStorage.saveCategory(sectionId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return category;
    } else {
      const category = await categoryApi.create(activeBudgetId, sectionId, data);
      get().refreshSummaryOnly();
      return category;
    }
  },

  updateCategory: async (sectionId, categoryId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const category = localBudgetStorage.updateCategory(categoryId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return category;
    } else {
      const category = await categoryApi.update(activeBudgetId, sectionId, categoryId, data);
      get().refreshSummaryOnly();
      return category;
    }
  },

  deleteCategory: async (sectionId, categoryId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      localBudgetStorage.deleteCategory(categoryId);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      const expenses = localBudgetStorage.getExpenses(activeBudgetId);
      set({ summary, expenses });
    } else {
      await categoryApi.delete(activeBudgetId, sectionId, categoryId);
      get().refreshSummaryOnly();
    }
  },
}));
