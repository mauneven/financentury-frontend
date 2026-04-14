export type BudgetMode =
  | "balanced"
  | "debt-free"
  | "debt-payoff"
  | "travel"
  | "event"
  | "manual";

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  billing_cutoff_day: number;
  mode: BudgetMode;
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

export interface UserSpending {
  user_id: string;
  profile?: {
    email: string;
    full_name: string;
    avatar_url: string;
  };
  amount: number;
}

export interface BudgetSummary {
  budget: Budget;
  sections: SectionSummary[];
  total_budget: number;
  total_spent: number;
  spending_by_user?: UserSpending[];
}

export interface SectionSummary {
  section: Section;
  categories: CategorySummary[];
  allocated_amount: number;
  total_spent: number;
  spending_by_user?: UserSpending[];
}

export interface CategorySummary {
  category: Category;
  allocated_amount: number;
  total_spent: number;
  expense_count: number;
  spending_by_user?: UserSpending[];
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
  icon?: string;
  monthly_income: number;
  currency: string;
  billing_period_months: number;
  billing_cutoff_day?: number;
  mode: BudgetMode;
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

export const BALANCED_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 50,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 45, icon: "home" },
      { name: "Comida", allocation_percent: 25, icon: "utensils" },
      { name: "Transporte", allocation_percent: 18, icon: "car" },
      { name: "Servicios", allocation_percent: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 30,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_percent: 50, icon: "party" },
      { name: "Entretenimiento", allocation_percent: 50, icon: "clapperboard" },
    ],
  },
  {
    name: "Deudas",
    allocation_percent: 10,
    icon: "credit-card",
    categories: [
      { name: "Tarjetas", allocation_percent: 50, icon: "credit-card" },
      { name: "Pr\u00e9stamos", allocation_percent: 50, icon: "landmark" },
    ],
  },
  {
    name: "Ahorro",
    allocation_percent: 10,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_percent: 50, icon: "landmark" },
      { name: "Inversi\u00f3n", allocation_percent: 50, icon: "trending" },
    ],
  },
] as const;

export const DEBT_FREE_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 50,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 45, icon: "home" },
      { name: "Comida", allocation_percent: 25, icon: "utensils" },
      { name: "Transporte", allocation_percent: 18, icon: "car" },
      { name: "Servicios", allocation_percent: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 30,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_percent: 50, icon: "party" },
      { name: "Entretenimiento", allocation_percent: 50, icon: "clapperboard" },
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
] as const;

export const DEBT_PAYOFF_SECTIONS = [
  {
    name: "Necesidades",
    allocation_percent: 50,
    icon: "home",
    categories: [
      { name: "Vivienda", allocation_percent: 45, icon: "home" },
      { name: "Comida", allocation_percent: 25, icon: "utensils" },
      { name: "Transporte", allocation_percent: 18, icon: "car" },
      { name: "Servicios", allocation_percent: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_percent: 20,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_percent: 50, icon: "party" },
      { name: "Entretenimiento", allocation_percent: 50, icon: "clapperboard" },
    ],
  },
  {
    name: "Deuda",
    allocation_percent: 30,
    icon: "credit-card",
    categories: [
      { name: "Tarjetas", allocation_percent: 50, icon: "credit-card" },
      { name: "Pr\u00e9stamos", allocation_percent: 50, icon: "landmark" },
    ],
  },
] as const;

export const TRAVEL_SECTIONS = [
  {
    name: "Vuelos",
    allocation_percent: 30,
    icon: "plane",
    categories: [
      { name: "Vuelos", allocation_percent: 100, icon: "plane" },
    ],
  },
  {
    name: "Hospedaje",
    allocation_percent: 30,
    icon: "bed",
    categories: [
      { name: "Hospedaje", allocation_percent: 100, icon: "bed" },
    ],
  },
  {
    name: "Salidas",
    allocation_percent: 40,
    icon: "party",
    categories: [
      { name: "Comida", allocation_percent: 40, icon: "utensils" },
      { name: "Actividades", allocation_percent: 35, icon: "map-pin" },
      { name: "Transporte local", allocation_percent: 25, icon: "car" },
    ],
  },
] as const;

export const EVENT_SECTIONS = [
  {
    name: "Comida",
    allocation_percent: 50,
    icon: "utensils",
    categories: [
      { name: "Comida", allocation_percent: 100, icon: "utensils" },
    ],
  },
  {
    name: "Bebidas",
    allocation_percent: 30,
    icon: "wine",
    categories: [
      { name: "Bebidas", allocation_percent: 100, icon: "wine" },
    ],
  },
  {
    name: "Gesti\u00f3n",
    allocation_percent: 20,
    icon: "settings",
    categories: [
      { name: "Decoraci\u00f3n", allocation_percent: 40, icon: "sparkles" },
      { name: "Log\u00edstica", allocation_percent: 60, icon: "truck" },
    ],
  },
] as const;
