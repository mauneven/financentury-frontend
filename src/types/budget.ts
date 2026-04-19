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

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  allocation_value: number;
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
  };
}

export interface UserSpending {
  user_id: string;
  profile?: {
    email: string;
    full_name: string;
  };
  amount: number;
}

export interface BudgetLink {
  id: string;
  source_budget_id: string;
  target_budget_id: string;
  source_category_id: string;
  filter_mode: "all" | "mine";
  created_by: string;
  created_at: string;
}

export interface LinkedCategorySummary {
  link: BudgetLink;
  source_budget: Budget;
  category: CategorySummary;
}

export interface LinkableBudget extends Budget {
  categories: Category[];
}

export interface CreateBudgetLinkInput {
  source_budget_id: string;
  source_category_id: string;
  filter_mode: "all" | "mine";
}

export interface BudgetSummary {
  budget: Budget;
  categories: CategorySummary[];
  linked_categories?: LinkedCategorySummary[];
  total_budget: number;
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

export interface CategoryTrend {
  category_id: string;
  category_name: string;
  months: MonthlyTrend[];
}

export interface TrendsResponse {
  budget_id: string;
  categories: CategoryTrend[];
}

export interface BudgetResumePeriod {
  period_start: string;
  period_end: string;
  income: number;
  total_spent: number;
  balance: number;
}

export interface BudgetResumeResponse {
  budget_id: string;
  one_time: boolean;
  periods: BudgetResumePeriod[];
}

export interface Invite {
  id: string;
  budget_id: string;
  invite_token: string;
  created_by: string;
  used_by?: string | null;
  used_at?: string | null;
  expires_at: string;
  created_at: string;
}

export interface Session {
  id: string;
  device_type: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ip_address: string;
  is_current: boolean;
  created_at: string;
  last_active_at: string;
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

export interface CreateCategoryInput {
  name: string;
  allocation_value: number;
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

/** Maximum number of flat categories any single budget can hold. */
export const MAX_CATEGORIES_PER_BUDGET = 50;

/**
 * Flat category template used to seed a new budget. Allocation values
 * are expressed as percentages of the budget's monthly_income. Each
 * template's percentages sum to 100.
 */
export type CategoryTemplate = {
  name: string;
  icon: string;
  pct: number;
}[];

// ---------------------------------------------------------------------------
// Template seeds
//
// Each entry's `pct` is the product of the previous `section_pct *
// category_pct` expressed as a percentage of the full budget, so every
// template still sums to exactly 100.
// ---------------------------------------------------------------------------

export const BALANCED_CATEGORIES: CategoryTemplate = [
  // Necesidades (50%)
  { name: "Vivienda", icon: "home", pct: 22.5 },
  { name: "Comida", icon: "utensils", pct: 12.5 },
  { name: "Transporte", icon: "car", pct: 9 },
  { name: "Servicios", icon: "lightbulb", pct: 6 },
  // Deseos (30%)
  { name: "Salidas", icon: "party", pct: 15 },
  { name: "Entretenimiento", icon: "clapperboard", pct: 15 },
  // Deudas (10%)
  { name: "Tarjetas", icon: "credit-card", pct: 5 },
  { name: "Pr\u00e9stamos", icon: "landmark", pct: 5 },
  // Ahorro (10%)
  { name: "Fondo de emergencia", icon: "landmark", pct: 5 },
  { name: "Inversi\u00f3n", icon: "trending", pct: 5 },
];

export const DEBT_FREE_CATEGORIES: CategoryTemplate = [
  // Necesidades (50%)
  { name: "Vivienda", icon: "home", pct: 22.5 },
  { name: "Comida", icon: "utensils", pct: 12.5 },
  { name: "Transporte", icon: "car", pct: 9 },
  { name: "Servicios", icon: "lightbulb", pct: 6 },
  // Deseos (30%)
  { name: "Salidas", icon: "party", pct: 15 },
  { name: "Entretenimiento", icon: "clapperboard", pct: 15 },
  // Ahorro (20%)
  { name: "Fondo de emergencia", icon: "landmark", pct: 10 },
  { name: "Inversi\u00f3n", icon: "trending", pct: 10 },
];

export const DEBT_PAYOFF_CATEGORIES: CategoryTemplate = [
  // Necesidades (50%)
  { name: "Vivienda", icon: "home", pct: 22.5 },
  { name: "Comida", icon: "utensils", pct: 12.5 },
  { name: "Transporte", icon: "car", pct: 9 },
  { name: "Servicios", icon: "lightbulb", pct: 6 },
  // Deseos (20%)
  { name: "Salidas", icon: "party", pct: 10 },
  { name: "Entretenimiento", icon: "clapperboard", pct: 10 },
  // Deuda (30%)
  { name: "Tarjetas", icon: "credit-card", pct: 15 },
  { name: "Pr\u00e9stamos", icon: "landmark", pct: 15 },
];

export const TRAVEL_CATEGORIES: CategoryTemplate = [
  // Vuelos (30%)
  { name: "Vuelos", icon: "plane", pct: 30 },
  // Hospedaje (30%)
  { name: "Hospedaje", icon: "bed", pct: 30 },
  // Salidas (40%)
  { name: "Comida", icon: "utensils", pct: 16 },
  { name: "Actividades", icon: "map-pin", pct: 14 },
  { name: "Transporte local", icon: "car", pct: 10 },
];

export const EVENT_CATEGORIES: CategoryTemplate = [
  // Comida (50%)
  { name: "Comida", icon: "utensils", pct: 50 },
  // Bebidas (30%)
  { name: "Bebidas", icon: "wine", pct: 30 },
  // Gesti\u00f3n (20%)
  { name: "Decoraci\u00f3n", icon: "sparkles", pct: 8 },
  { name: "Log\u00edstica", icon: "truck", pct: 12 },
];
