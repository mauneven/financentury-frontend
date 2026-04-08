export interface MigratePayload {
  budgets: MigrateBudget[];
}

export interface MigrateBudget {
  name: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  mode: string;
  categories: MigrateSection[];
  expenses: MigrateExpense[];
}

export interface MigrateSection {
  name: string;
  allocation_percent: number;
  icon: string;
  sort_order: number;
  local_id: string;
  subcategories: MigrateSubcategory[];
}

export interface MigrateSubcategory {
  name: string;
  allocation_percent: number;
  icon: string;
  sort_order: number;
  local_id: string;
}

export interface MigrateExpense {
  local_subcategory_id: string;
  amount: number;
  description: string;
  expense_date: string;
}
