"use client";

import { create } from "zustand";
import type {
  Budget,
  BudgetSummary,
  Category,
  CreateBudgetInput,
  CreateCategoryInput,
  CreateExpenseInput,
  CreateSubcategoryInput,
  Expense,
  Subcategory,
} from "@/types/budget";
import { budgetApi, categoryApi, expenseApi, subcategoryApi } from "@/lib/api";
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
  addExpense: (data: CreateExpenseInput) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addCategory: (data: CreateCategoryInput) => Promise<Category>;
  updateCategory: (categoryId: string, data: Partial<CreateCategoryInput>) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addSubcategory: (categoryId: string, data: CreateSubcategoryInput) => Promise<Subcategory>;
  updateSubcategory: (categoryId: string, subcategoryId: string, data: Partial<CreateSubcategoryInput>) => Promise<Subcategory>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
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
      get().refreshSummary();
      return expense;
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
      get().refreshSummary();
    }
  },

  addCategory: async (data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const category = localBudgetStorage.saveCategory(activeBudgetId, data);
      // Refresh summary to include the new category
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return category;
    } else {
      const category = await categoryApi.create(activeBudgetId, data);
      get().refreshSummary();
      return category;
    }
  },

  updateCategory: async (categoryId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const category = localBudgetStorage.updateCategory(categoryId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return category;
    } else {
      const category = await categoryApi.update(activeBudgetId, categoryId, data);
      get().refreshSummary();
      return category;
    }
  },

  deleteCategory: async (categoryId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      localBudgetStorage.deleteCategory(categoryId);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      const expenses = localBudgetStorage.getExpenses(activeBudgetId);
      set({ summary, expenses });
    } else {
      await categoryApi.delete(activeBudgetId, categoryId);
      get().refreshSummary();
    }
  },

  addSubcategory: async (categoryId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const subcategory = localBudgetStorage.saveSubcategory(categoryId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return subcategory;
    } else {
      const subcategory = await subcategoryApi.create(activeBudgetId, categoryId, data);
      get().refreshSummary();
      return subcategory;
    }
  },

  updateSubcategory: async (categoryId, subcategoryId, data) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      const subcategory = localBudgetStorage.updateSubcategory(subcategoryId, data);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      set({ summary });
      return subcategory;
    } else {
      const subcategory = await subcategoryApi.update(activeBudgetId, categoryId, subcategoryId, data);
      get().refreshSummary();
      return subcategory;
    }
  },

  deleteSubcategory: async (categoryId, subcategoryId) => {
    const { activeBudgetId } = get();
    if (!activeBudgetId) throw new Error("No active budget");

    const { mode } = useAuthStore.getState();
    if (mode === "local") {
      localBudgetStorage.deleteSubcategory(subcategoryId);
      const summary = localBudgetStorage.computeSummary(activeBudgetId);
      const expenses = localBudgetStorage.getExpenses(activeBudgetId);
      set({ summary, expenses });
    } else {
      await subcategoryApi.delete(activeBudgetId, categoryId, subcategoryId);
      get().refreshSummary();
    }
  },
}));
