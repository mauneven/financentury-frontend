export interface Budget {
  id: string;
  user_id: string;
  name: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  billing_cutoff_day: number;
  mode: "guided" | "aggressive" | "debt-payoff" | "manual";
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
  updated_at?: string;
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
  sections: SectionSummary[];
  total_budget: number;
  total_spent: number;
}

export interface SectionSummary {
  section: Section;
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
  billing_cutoff_day?: number;
  mode: "guided" | "aggressive" | "debt-payoff" | "manual";
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
  { value: 0, labelKey: "oneTime" },
  { value: 1, labelKey: "monthly" },
  { value: 3, labelKey: "quarterly" },
  { value: 6, labelKey: "semiAnnual" },
  { value: 12, labelKey: "annual" },
] as const;

export const GUIDED_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 50,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 56, icon: "home" },
      { name: "Comida", allocation_percent: 24, icon: "utensils" },
      { name: "Transporte", allocation_percent: 12, icon: "car" },
      { name: "Servicios", allocation_percent: 8, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 30,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_percent: 33, icon: "party" },
      { name: "Entretenimiento", allocation_percent: 17, icon: "clapperboard" },
      { name: "Ropa", allocation_percent: 23, icon: "shirt" },
      { name: "Viajes", allocation_percent: 27, icon: "plane" },
    ],
  },
  {
    name: "Ahorro",
    allocation_percent: 20,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_percent: 40, icon: "landmark" },
      { name: "Inversi\u00f3n", allocation_percent: 60, icon: "trending" },
    ],
  },
] as const;

export const AGGRESSIVE_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 70,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 45, icon: "home" },
      { name: "Comida", allocation_percent: 25, icon: "utensils" },
      { name: "Transporte", allocation_percent: 18, icon: "car" },
      { name: "Servicios", allocation_percent: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Ahorro",
    allocation_percent: 20,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_percent: 50, icon: "landmark" },
      { name: "Inversi\u00f3n", allocation_percent: 50, icon: "trending" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 10,
    icon: "party",
    categories: [
      { name: "Entretenimiento", allocation_percent: 50, icon: "clapperboard" },
      { name: "Salidas", allocation_percent: 50, icon: "party" },
    ],
  },
] as const;

export const DEBT_PAYOFF_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 60,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 45, icon: "home" },
      { name: "Comida", allocation_percent: 25, icon: "utensils" },
      { name: "Transporte", allocation_percent: 18, icon: "car" },
      { name: "Servicios", allocation_percent: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deudas",
    allocation_percent: 20,
    icon: "credit-card",
    categories: [
      { name: "Tarjetas de cr\u00e9dito", allocation_percent: 50, icon: "credit-card" },
      { name: "Pr\u00e9stamos", allocation_percent: 50, icon: "landmark" },
    ],
  },
  {
    name: "Ahorro/Deseos",
    allocation_percent: 20,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_percent: 40, icon: "landmark" },
      { name: "Entretenimiento", allocation_percent: 30, icon: "clapperboard" },
      { name: "Salidas", allocation_percent: 30, icon: "party" },
    ],
  },
] as const;
