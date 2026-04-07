import type {
  Budget,
  BudgetSummary,
  Category,
  CategorySummary,
  CreateBudgetInput,
  CreateCategoryInput,
  CreateExpenseInput,
  CreateSubcategoryInput,
  Expense,
  Subcategory,
  SubcategorySummary,
} from "@/types/budget";
import { GUIDED_CATEGORIES } from "@/types/budget";
import type { MigratePayload } from "@/types/migrate";

const KEYS = {
  budgets: "financentury_budgets",
  categories: "financentury_categories",
  subcategories: "financentury_subcategories",
  expenses: "financentury_expenses",
} as const;

function getItem<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function setItem(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export const localBudgetStorage = {
  // ── Helpers ──────────────────────────────────────────────────────────
  getItem,
  setItem,

  // ── Budgets ──────────────────────────────────────────────────────────
  getBudgets(): Budget[] {
    return getItem<Budget>(KEYS.budgets);
  },

  getBudget(id: string): Budget | undefined {
    return this.getBudgets().find((b) => b.id === id);
  },

  saveBudget(data: CreateBudgetInput): Budget {
    const now = new Date().toISOString();
    const budget: Budget = {
      id: crypto.randomUUID(),
      user_id: "local",
      name: data.name,
      monthly_income: data.monthly_income,
      currency: data.currency,
      billing_period_months: data.billing_period_months,
      mode: data.mode,
      created_at: now,
      updated_at: now,
    };

    const budgets = this.getBudgets();
    budgets.push(budget);
    setItem(KEYS.budgets, budgets);

    // If guided mode, create the default categories and subcategories
    if (data.mode === "guided") {
      let catSortOrder = 0;
      for (const gc of GUIDED_CATEGORIES) {
        const category = this.saveCategory(budget.id, {
          name: gc.name,
          allocation_percent: gc.allocation_percent,
          icon: gc.icon,
          sort_order: catSortOrder++,
        });

        let subSortOrder = 0;
        for (const gs of gc.subcategories) {
          this.saveSubcategory(category.id, {
            name: gs.name,
            allocation_percent: gs.allocation_percent,
            icon: gs.icon,
            sort_order: subSortOrder++,
          });
        }
      }
    }

    return budget;
  },

  updateBudget(id: string, data: Partial<CreateBudgetInput>): Budget {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error(`Budget not found: ${id}`);

    const updated: Budget = {
      ...budgets[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    budgets[idx] = updated;
    setItem(KEYS.budgets, budgets);
    return updated;
  },

  deleteBudget(id: string): void {
    // Cascade: delete categories, subcategories, and expenses for this budget
    const categories = this.getCategories(id);
    for (const cat of categories) {
      const subcategories = this.getSubcategories(cat.id);
      const allSubcategories = getItem<Subcategory>(KEYS.subcategories).filter(
        (s) => !subcategories.some((sc) => sc.id === s.id)
      );
      setItem(KEYS.subcategories, allSubcategories);
    }

    // Remove categories for this budget
    const allCategories = getItem<Category>(KEYS.categories).filter(
      (c) => c.budget_id !== id
    );
    setItem(KEYS.categories, allCategories);

    // Remove expenses for this budget
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => e.budget_id !== id
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove the budget itself
    const budgets = this.getBudgets().filter((b) => b.id !== id);
    setItem(KEYS.budgets, budgets);
  },

  // ── Categories ───────────────────────────────────────────────────────
  getCategories(budgetId: string): Category[] {
    return getItem<Category>(KEYS.categories).filter(
      (c) => c.budget_id === budgetId
    );
  },

  saveCategory(budgetId: string, data: CreateCategoryInput): Category {
    const now = new Date().toISOString();
    const category: Category = {
      id: crypto.randomUUID(),
      budget_id: budgetId,
      name: data.name,
      allocation_percent: data.allocation_percent,
      icon: data.icon ?? "",
      sort_order: data.sort_order ?? 0,
      created_at: now,
    };

    const categories = getItem<Category>(KEYS.categories);
    categories.push(category);
    setItem(KEYS.categories, categories);
    return category;
  },

  updateCategory(id: string, data: Partial<CreateCategoryInput>): Category {
    const categories = getItem<Category>(KEYS.categories);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category not found: ${id}`);

    const updated: Category = { ...categories[idx], ...data };
    categories[idx] = updated;
    setItem(KEYS.categories, categories);
    return updated;
  },

  deleteCategory(id: string): void {
    // Cascade: delete subcategories and their expenses
    const subcategories = this.getSubcategories(id);
    const subcategoryIds = new Set(subcategories.map((s) => s.id));

    // Remove expenses that belong to these subcategories
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => !subcategoryIds.has(e.subcategory_id)
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove subcategories for this category
    const allSubcategories = getItem<Subcategory>(KEYS.subcategories).filter(
      (s) => s.category_id !== id
    );
    setItem(KEYS.subcategories, allSubcategories);

    // Remove the category itself
    const categories = getItem<Category>(KEYS.categories).filter(
      (c) => c.id !== id
    );
    setItem(KEYS.categories, categories);
  },

  // ── Subcategories ────────────────────────────────────────────────────
  getSubcategories(categoryId: string): Subcategory[] {
    return getItem<Subcategory>(KEYS.subcategories).filter(
      (s) => s.category_id === categoryId
    );
  },

  saveSubcategory(
    categoryId: string,
    data: CreateSubcategoryInput
  ): Subcategory {
    const now = new Date().toISOString();
    const subcategory: Subcategory = {
      id: crypto.randomUUID(),
      category_id: categoryId,
      name: data.name,
      allocation_percent: data.allocation_percent,
      icon: data.icon ?? "",
      sort_order: data.sort_order ?? 0,
      created_at: now,
    };

    const subcategories = getItem<Subcategory>(KEYS.subcategories);
    subcategories.push(subcategory);
    setItem(KEYS.subcategories, subcategories);
    return subcategory;
  },

  updateSubcategory(
    id: string,
    data: Partial<CreateSubcategoryInput>
  ): Subcategory {
    const subcategories = getItem<Subcategory>(KEYS.subcategories);
    const idx = subcategories.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Subcategory not found: ${id}`);

    const updated: Subcategory = { ...subcategories[idx], ...data };
    subcategories[idx] = updated;
    setItem(KEYS.subcategories, subcategories);
    return updated;
  },

  deleteSubcategory(id: string): void {
    // Cascade: delete expenses with this subcategory_id
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => e.subcategory_id !== id
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove the subcategory itself
    const subcategories = getItem<Subcategory>(KEYS.subcategories).filter(
      (s) => s.id !== id
    );
    setItem(KEYS.subcategories, subcategories);
  },

  // ── Expenses ─────────────────────────────────────────────────────────
  getExpenses(budgetId: string): Expense[] {
    return getItem<Expense>(KEYS.expenses).filter(
      (e) => e.budget_id === budgetId
    );
  },

  saveExpense(budgetId: string, data: CreateExpenseInput): Expense {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: crypto.randomUUID(),
      budget_id: budgetId,
      subcategory_id: data.subcategory_id,
      amount: data.amount,
      description: data.description ?? "",
      expense_date: data.expense_date,
      created_at: now,
    };

    const expenses = getItem<Expense>(KEYS.expenses);
    expenses.push(expense);
    setItem(KEYS.expenses, expenses);
    return expense;
  },

  updateExpense(id: string, data: Partial<CreateExpenseInput>): Expense {
    const expenses = getItem<Expense>(KEYS.expenses);
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Expense not found: ${id}`);

    const updated: Expense = { ...expenses[idx], ...data };
    expenses[idx] = updated;
    setItem(KEYS.expenses, expenses);
    return updated;
  },

  deleteExpense(id: string): void {
    const expenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => e.id !== id
    );
    setItem(KEYS.expenses, expenses);
  },

  // ── Summary ──────────────────────────────────────────────────────────
  computeSummary(budgetId: string): BudgetSummary | null {
    const budget = this.getBudget(budgetId);
    if (!budget) return null;

    const categories = this.getCategories(budgetId);
    const allExpenses = this.getExpenses(budgetId);

    // BUG FIX 1: Scale budget by billing_period_months instead of using
    // a single month's income, and filter expenses to the current period.
    const periodMonths = budget.billing_period_months;
    const totalBudget = budget.monthly_income * periodMonths;

    // Filter expenses to the current billing period window
    const now = new Date();
    const periodStart = new Date(
      now.getFullYear(),
      now.getMonth() - (periodMonths - 1),
      1
    );
    const periodExpenses = allExpenses.filter(
      (e) => new Date(e.expense_date) >= periodStart
    );

    let totalSpent = 0;

    const categorySummaries: CategorySummary[] = categories.map((category) => {
      const allocatedAmount =
        (totalBudget * category.allocation_percent) / 100;

      const subcategories = this.getSubcategories(category.id);

      let categorySpent = 0;

      const subcategorySummaries: SubcategorySummary[] = subcategories.map(
        (subcategory) => {
          // BUG FIX 2: Subcategory allocation_percent is a percentage of
          // total income, NOT of the parent category. Use totalBudget directly.
          const subAllocated =
            (totalBudget * subcategory.allocation_percent) / 100;

          const subExpenses = periodExpenses.filter(
            (e) => e.subcategory_id === subcategory.id
          );
          const subSpent = subExpenses.reduce((sum, e) => sum + e.amount, 0);
          categorySpent += subSpent;

          return {
            subcategory,
            allocated_amount: subAllocated,
            total_spent: subSpent,
            expense_count: subExpenses.length,
          } satisfies SubcategorySummary;
        }
      );

      totalSpent += categorySpent;

      return {
        category,
        subcategories: subcategorySummaries,
        allocated_amount: allocatedAmount,
        total_spent: categorySpent,
      } satisfies CategorySummary;
    });

    return {
      budget,
      categories: categorySummaries,
      total_budget: totalBudget,
      total_spent: totalSpent,
    } satisfies BudgetSummary;
  },

  // ── Migration ────────────────────────────────────────────────────────
  getMigrationPayload(): MigratePayload {
    const budgets = this.getBudgets();

    return {
      budgets: budgets.map((budget) => {
        const categories = this.getCategories(budget.id);
        const expenses = this.getExpenses(budget.id);

        return {
          name: budget.name,
          monthly_income: budget.monthly_income,
          currency: budget.currency,
          billing_period_months: budget.billing_period_months,
          mode: budget.mode,
          categories: categories.map((cat) => {
            const subcategories = this.getSubcategories(cat.id);
            return {
              name: cat.name,
              allocation_percent: cat.allocation_percent,
              icon: cat.icon,
              sort_order: cat.sort_order,
              local_id: cat.id,
              subcategories: subcategories.map((sub) => ({
                name: sub.name,
                allocation_percent: sub.allocation_percent,
                icon: sub.icon,
                sort_order: sub.sort_order,
                local_id: sub.id,
              })),
            };
          }),
          expenses: expenses.map((exp) => ({
            local_subcategory_id: exp.subcategory_id,
            amount: exp.amount,
            description: exp.description,
            expense_date: exp.expense_date,
          })),
        };
      }),
    };
  },

  hasData(): boolean {
    return this.getBudgets().length > 0;
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEYS.budgets);
    localStorage.removeItem(KEYS.categories);
    localStorage.removeItem(KEYS.subcategories);
    localStorage.removeItem(KEYS.expenses);
  },
};
