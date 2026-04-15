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
  allocation_value: number;
  icon: string;
  sort_order: number;
  created_at: string;
  categories?: Category[];
}

export interface Category {
  id: string;
  section_id: string;
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
  source_section_id: string;
  source_category_id?: string | null;
  target_section_id?: string | null;
  filter_mode: "all" | "mine";
  created_by: string;
  created_at: string;
}

export interface LinkedSectionSummary {
  link: BudgetLink;
  source_budget: Budget;
  section: Section;
  categories: CategorySummary[];
  total_spent: number;
  spending_by_user?: UserSpending[];
}

export interface LinkableBudget extends Budget {
  sections: (Section & { categories: Category[] })[];
}

export interface CreateBudgetLinkInput {
  source_budget_id: string;
  source_section_id: string;
  source_category_id?: string;
  target_section_id?: string;
  filter_mode: "all" | "mine";
}

export interface BudgetSummary {
  budget: Budget;
  sections: SectionSummary[];
  linked_sections?: LinkedSectionSummary[];
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

export interface CreateSectionInput {
  name: string;
  allocation_value: number;
  icon?: string;
  sort_order?: number;
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

export const BALANCED_SECTIONS = [
  {
    name: "Necesidades",
    allocation_value: 50,
    icon: "sprout",
    categories: [
      { name: "Vivienda", allocation_value: 45, icon: "home" },
      { name: "Comida", allocation_value: 25, icon: "utensils" },
      { name: "Transporte", allocation_value: 18, icon: "car" },
      { name: "Servicios", allocation_value: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_value: 30,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_value: 50, icon: "party" },
      { name: "Entretenimiento", allocation_value: 50, icon: "clapperboard" },
    ],
  },
  {
    name: "Deudas",
    allocation_value: 10,
    icon: "credit-card",
    categories: [
      { name: "Tarjetas", allocation_value: 50, icon: "credit-card" },
      { name: "Pr\u00e9stamos", allocation_value: 50, icon: "landmark" },
    ],
  },
  {
    name: "Ahorro",
    allocation_value: 10,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_value: 50, icon: "landmark" },
      { name: "Inversi\u00f3n", allocation_value: 50, icon: "trending" },
    ],
  },
] as const;

export const DEBT_FREE_SECTIONS = [
  {
    name: "Necesidades",
    allocation_value: 50,
    icon: "sprout",
    categories: [
      { name: "Vivienda", allocation_value: 45, icon: "home" },
      { name: "Comida", allocation_value: 25, icon: "utensils" },
      { name: "Transporte", allocation_value: 18, icon: "car" },
      { name: "Servicios", allocation_value: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_value: 30,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_value: 50, icon: "party" },
      { name: "Entretenimiento", allocation_value: 50, icon: "clapperboard" },
    ],
  },
  {
    name: "Ahorro",
    allocation_value: 20,
    icon: "coins",
    categories: [
      { name: "Fondo de emergencia", allocation_value: 50, icon: "landmark" },
      { name: "Inversi\u00f3n", allocation_value: 50, icon: "trending" },
    ],
  },
] as const;

export const DEBT_PAYOFF_SECTIONS = [
  {
    name: "Necesidades",
    allocation_value: 50,
    icon: "sprout",
    categories: [
      { name: "Vivienda", allocation_value: 45, icon: "home" },
      { name: "Comida", allocation_value: 25, icon: "utensils" },
      { name: "Transporte", allocation_value: 18, icon: "car" },
      { name: "Servicios", allocation_value: 12, icon: "lightbulb" },
    ],
  },
  {
    name: "Deseos",
    allocation_value: 20,
    icon: "party",
    categories: [
      { name: "Salidas", allocation_value: 50, icon: "party" },
      { name: "Entretenimiento", allocation_value: 50, icon: "clapperboard" },
    ],
  },
  {
    name: "Deuda",
    allocation_value: 30,
    icon: "credit-card",
    categories: [
      { name: "Tarjetas", allocation_value: 50, icon: "credit-card" },
      { name: "Pr\u00e9stamos", allocation_value: 50, icon: "landmark" },
    ],
  },
] as const;

export const TRAVEL_SECTIONS = [
  {
    name: "Vuelos",
    allocation_value: 30,
    icon: "plane",
    categories: [
      { name: "Vuelos", allocation_value: 100, icon: "plane" },
    ],
  },
  {
    name: "Hospedaje",
    allocation_value: 30,
    icon: "bed",
    categories: [
      { name: "Hospedaje", allocation_value: 100, icon: "bed" },
    ],
  },
  {
    name: "Salidas",
    allocation_value: 40,
    icon: "party",
    categories: [
      { name: "Comida", allocation_value: 40, icon: "utensils" },
      { name: "Actividades", allocation_value: 35, icon: "map-pin" },
      { name: "Transporte local", allocation_value: 25, icon: "car" },
    ],
  },
] as const;

export const EVENT_SECTIONS = [
  {
    name: "Comida",
    allocation_value: 50,
    icon: "utensils",
    categories: [
      { name: "Comida", allocation_value: 100, icon: "utensils" },
    ],
  },
  {
    name: "Bebidas",
    allocation_value: 30,
    icon: "wine",
    categories: [
      { name: "Bebidas", allocation_value: 100, icon: "wine" },
    ],
  },
  {
    name: "Gesti\u00f3n",
    allocation_value: 20,
    icon: "settings",
    categories: [
      { name: "Decoraci\u00f3n", allocation_value: 40, icon: "sparkles" },
      { name: "Log\u00edstica", allocation_value: 60, icon: "truck" },
    ],
  },
] as const;
