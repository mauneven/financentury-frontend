import type {
  Budget,
  BudgetSummary,
  Section,
  SectionSummary,
  CreateBudgetInput,
  CreateSectionInput,
  CreateExpenseInput,
  CreateCategoryInput,
  Expense,
  Category,
  CategorySummary,
} from "@/types/budget";
import { GUIDED_SECTIONS } from "@/types/budget";
import type { MigratePayload } from "@/types/migrate";

const KEYS = {
  budgets: "financentury_budgets",
  sections: "financentury_categories",
  categories: "financentury_subcategories",
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
      billing_cutoff_day: data.billing_cutoff_day ?? 1,
      mode: data.mode,
      created_at: now,
      updated_at: now,
    };

    const budgets = this.getBudgets();
    budgets.push(budget);
    setItem(KEYS.budgets, budgets);

    // If guided mode, create the default sections and categories
    if (data.mode === "guided") {
      let secSortOrder = 0;
      for (const gc of GUIDED_SECTIONS) {
        const section = this.saveSection(budget.id, {
          name: gc.name,
          allocation_percent: gc.allocation_percent,
          icon: gc.icon,
          sort_order: secSortOrder++,
        });

        let catSortOrder = 0;
        for (const gs of gc.subcategories) {
          this.saveCategory(section.id, {
            name: gs.name,
            allocation_percent: gs.allocation_percent,
            icon: gs.icon,
            sort_order: catSortOrder++,
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
    // Cascade: delete sections, categories, and expenses for this budget
    const sections = this.getSections(id);
    for (const sec of sections) {
      const categories = this.getCategories(sec.id);
      const allCategories = getItem<Category>(KEYS.categories).filter(
        (c) => !categories.some((cat) => cat.id === c.id)
      );
      setItem(KEYS.categories, allCategories);
    }

    // Remove sections for this budget
    const allSections = getItem<Section>(KEYS.sections).filter(
      (c) => c.budget_id !== id
    );
    setItem(KEYS.sections, allSections);

    // Remove expenses for this budget
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => e.budget_id !== id
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove the budget itself
    const budgets = this.getBudgets().filter((b) => b.id !== id);
    setItem(KEYS.budgets, budgets);
  },

  // ── Sections ─────────────────────────────────────────────────────────
  getSections(budgetId: string): Section[] {
    return getItem<Section>(KEYS.sections).filter(
      (c) => c.budget_id === budgetId
    );
  },

  saveSection(budgetId: string, data: CreateSectionInput): Section {
    const now = new Date().toISOString();
    const section: Section = {
      id: crypto.randomUUID(),
      budget_id: budgetId,
      name: data.name,
      allocation_percent: data.allocation_percent,
      icon: data.icon ?? "",
      sort_order: data.sort_order ?? 0,
      created_at: now,
    };

    const sections = getItem<Section>(KEYS.sections);
    sections.push(section);
    setItem(KEYS.sections, sections);
    return section;
  },

  updateSection(id: string, data: Partial<CreateSectionInput>): Section {
    const sections = getItem<Section>(KEYS.sections);
    const idx = sections.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Section not found: ${id}`);

    const updated: Section = { ...sections[idx], ...data };
    sections[idx] = updated;
    setItem(KEYS.sections, sections);
    return updated;
  },

  deleteSection(id: string): void {
    // Cascade: delete categories and their expenses
    const categories = this.getCategories(id);
    const categoryIds = new Set(categories.map((c) => c.id));

    // Remove expenses that belong to these categories
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => !categoryIds.has(e.category_id)
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove categories for this section
    const remainingCategories = getItem<Category>(KEYS.categories).filter(
      (c) => c.section_id !== id
    );
    setItem(KEYS.categories, remainingCategories);

    // Remove the section itself
    const sections = getItem<Section>(KEYS.sections).filter(
      (c) => c.id !== id
    );
    setItem(KEYS.sections, sections);
  },

  // ── Categories (was Subcategories) ───────────────────────────────────
  getCategories(sectionId: string): Category[] {
    return getItem<Category>(KEYS.categories).filter(
      (c) => c.section_id === sectionId
    );
  },

  saveCategory(
    sectionId: string,
    data: CreateCategoryInput
  ): Category {
    const now = new Date().toISOString();
    const category: Category = {
      id: crypto.randomUUID(),
      section_id: sectionId,
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

  updateCategory(
    id: string,
    data: Partial<CreateCategoryInput>
  ): Category {
    const categories = getItem<Category>(KEYS.categories);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category not found: ${id}`);

    const updated: Category = { ...categories[idx], ...data };
    categories[idx] = updated;
    setItem(KEYS.categories, categories);
    return updated;
  },

  deleteCategory(id: string): void {
    // Cascade: delete expenses with this category_id
    const allExpenses = getItem<Expense>(KEYS.expenses).filter(
      (e) => e.category_id !== id
    );
    setItem(KEYS.expenses, allExpenses);

    // Remove the category itself
    const categories = getItem<Category>(KEYS.categories).filter(
      (c) => c.id !== id
    );
    setItem(KEYS.categories, categories);
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
      category_id: data.category_id,
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

    const sections = this.getSections(budgetId);
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

    const sectionSummaries: SectionSummary[] = sections.map((section) => {
      const allocatedAmount =
        (totalBudget * section.allocation_percent) / 100;

      const categories = this.getCategories(section.id);

      let sectionSpent = 0;

      const categorySummaries: CategorySummary[] = categories.map(
        (cat) => {
          // Category allocation_percent is a percentage of
          // total income, NOT of the parent section. Use totalBudget directly.
          const catAllocated =
            (totalBudget * cat.allocation_percent) / 100;

          const catExpenses = periodExpenses.filter(
            (e) => e.category_id === cat.id
          );
          const catSpent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
          sectionSpent += catSpent;

          return {
            category: cat,
            allocated_amount: catAllocated,
            total_spent: catSpent,
            expense_count: catExpenses.length,
          } satisfies CategorySummary;
        }
      );

      totalSpent += sectionSpent;

      return {
        section: section,
        categories: categorySummaries,
        allocated_amount: allocatedAmount,
        total_spent: sectionSpent,
      } satisfies SectionSummary;
    });

    return {
      budget,
      sections: sectionSummaries,
      total_budget: totalBudget,
      total_spent: totalSpent,
    } satisfies BudgetSummary;
  },

  // ── Migration ────────────────────────────────────────────────────────
  getMigrationPayload(): MigratePayload {
    const budgets = this.getBudgets();

    return {
      budgets: budgets.map((budget) => {
        const sections = this.getSections(budget.id);
        const expenses = this.getExpenses(budget.id);

        return {
          name: budget.name,
          monthly_income: budget.monthly_income,
          currency: budget.currency,
          billing_period_months: budget.billing_period_months,
          mode: budget.mode,
          categories: sections.map((sec) => {
            const categories = this.getCategories(sec.id);
            return {
              name: sec.name,
              allocation_percent: sec.allocation_percent,
              icon: sec.icon,
              sort_order: sec.sort_order,
              local_id: sec.id,
              subcategories: categories.map((cat) => ({
                name: cat.name,
                allocation_percent: cat.allocation_percent,
                icon: cat.icon,
                sort_order: cat.sort_order,
                local_id: cat.id,
              })),
            };
          }),
          expenses: expenses.map((exp) => ({
            local_subcategory_id: exp.category_id,
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
    localStorage.removeItem(KEYS.sections);
    localStorage.removeItem(KEYS.categories);
    localStorage.removeItem(KEYS.expenses);
  },
};
