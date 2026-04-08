export interface Budget {
  id: string;
  user_id: string;
  name: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  mode: "guided" | "manual";
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  budget_id: string;
  name: string;
  allocation_percent: number;
  icon: string;
  sort_order: number;
  created_at: string;
  categories?: Category[];
}

export interface Category {
  id: string;
  section_id: string;
  name: string;
  allocation_percent: number;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
  created_by?: string;
}

export interface Collaborator {
  id: string;
  budget_id: string;
  user_id: string;
  role: "owner" | "collaborator";
  added_at: string;
  profile?: {
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface BudgetSummary {
  budget: Budget;
  categories: SectionSummary[];
  total_budget: number;
  total_spent: number;
}

export interface SectionSummary {
  category: Section;
  categories: CategorySummary[];
  allocated_amount: number;
  total_spent: number;
}

export interface CategorySummary {
  category: Category;
  allocated_amount: number;
  total_spent: number;
  expense_count: number;
}

export interface MonthlyTrend {
  month: string;
  total_spent: number;
}

export interface SectionTrend {
  category_id: string;
  category_name: string;
  months: MonthlyTrend[];
}

export interface TrendsResponse {
  budget_id: string;
  categories: SectionTrend[];
}

export interface CreateBudgetInput {
  name: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  mode: "guided" | "manual";
}

export interface CreateSectionInput {
  name: string;
  allocation_percent: number;
  icon?: string;
  sort_order?: number;
}

export interface CreateCategoryInput {
  name: string;
  allocation_percent: number;
  icon?: string;
  sort_order?: number;
}

export interface CreateExpenseInput {
  category_id: string;
  amount: number;
  description?: string;
  expense_date: string;
}

export const CURRENCIES = [
  { code: "COP", name: "Peso Colombiano", symbol: "$", locale: "es-CO" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "\u20ac", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "\u00a3", locale: "en-GB" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$", locale: "es-MX" },
  { code: "BRL", name: "Real Brasileiro", symbol: "R$", locale: "pt-BR" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", locale: "es-AR" },
  { code: "CLP", name: "Peso Chileno", symbol: "$", locale: "es-CL" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/", locale: "es-PE" },
] as const;

export const BILLING_PERIODS = [
  { value: 1, label: "Monthly" },
  { value: 3, label: "Quarterly" },
  { value: 6, label: "Semi-annual" },
  { value: 12, label: "Annual" },
] as const;

export const GUIDED_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 50,
    icon: "\ud83c\udfe0",
    subcategories: [
      { name: "Vivienda", allocation_percent: 28, icon: "\ud83c\udfe0" },
      { name: "Comida", allocation_percent: 12, icon: "\ud83c\udf7d\ufe0f" },
      { name: "Transporte", allocation_percent: 6, icon: "\ud83d\ude97" },
      { name: "Servicios", allocation_percent: 4, icon: "\ud83d\udca1" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 30,
    icon: "\u2728",
    subcategories: [
      { name: "Salidas", allocation_percent: 10, icon: "\ud83c\udf89" },
      { name: "Entretenimiento", allocation_percent: 5, icon: "\ud83c\udfac" },
      { name: "Ropa", allocation_percent: 7, icon: "\ud83d\udc55" },
      { name: "Viajes", allocation_percent: 8, icon: "\u2708\ufe0f" },
    ],
  },
  {
    name: "Ahorro",
    allocation_percent: 20,
    icon: "\ud83d\udcb0",
    subcategories: [
      { name: "Fondo de emergencia", allocation_percent: 8, icon: "\ud83c\udfe6" },
      { name: "Inversi\u00f3n", allocation_percent: 12, icon: "\ud83d\udcc8" },
    ],
  },
] as const;
