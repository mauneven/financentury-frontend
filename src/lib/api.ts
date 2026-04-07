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
  TrendsResponse,
} from "@/types/budget";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (() => {
  if (process.env.NODE_ENV === "production") {
    console.error("NEXT_PUBLIC_API_URL is not set in production!");
  }
  return "http://localhost:8080/api";
})();

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.error || error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; first_name: string; last_name?: string }) =>
    request<{ token: string; user: { id: string; email: string; first_name: string; last_name: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string; first_name: string; last_name: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Budgets
export const budgetApi = {
  list: () => request<Budget[]>("/budgets"),

  get: (id: string) => request<Budget>(`/budgets/${id}`),

  create: (data: CreateBudgetInput) =>
    request<Budget>("/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateBudgetInput>) =>
    request<Budget>(`/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/budgets/${id}`, { method: "DELETE" }),

  summary: (id: string) =>
    request<BudgetSummary>(`/budgets/${id}/summary`),

  trends: (id: string) =>
    request<TrendsResponse>(`/budgets/${id}/trends`),
};

// Categories
export const categoryApi = {
  list: (budgetId: string) =>
    request<Category[]>(`/budgets/${budgetId}/categories`),

  create: (budgetId: string, data: CreateCategoryInput) =>
    request<Category>(`/budgets/${budgetId}/categories`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (budgetId: string, catId: string, data: Partial<CreateCategoryInput>) =>
    request<Category>(`/budgets/${budgetId}/categories/${catId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (budgetId: string, catId: string) =>
    request<void>(`/budgets/${budgetId}/categories/${catId}`, {
      method: "DELETE",
    }),
};

// Subcategories
export const subcategoryApi = {
  create: (budgetId: string, catId: string, data: CreateSubcategoryInput) =>
    request<Subcategory>(
      `/budgets/${budgetId}/categories/${catId}/subcategories`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  update: (
    budgetId: string,
    catId: string,
    subId: string,
    data: Partial<CreateSubcategoryInput>
  ) =>
    request<Subcategory>(
      `/budgets/${budgetId}/categories/${catId}/subcategories/${subId}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  delete: (budgetId: string, catId: string, subId: string) =>
    request<void>(
      `/budgets/${budgetId}/categories/${catId}/subcategories/${subId}`,
      { method: "DELETE" }
    ),
};

// Expenses
export const expenseApi = {
  list: (budgetId: string) =>
    request<Expense[]>(`/budgets/${budgetId}/expenses`),

  create: (budgetId: string, data: CreateExpenseInput) =>
    request<Expense>(`/budgets/${budgetId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (budgetId: string, expId: string, data: Partial<CreateExpenseInput>) =>
    request<Expense>(`/budgets/${budgetId}/expenses/${expId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (budgetId: string, expId: string) =>
    request<void>(`/budgets/${budgetId}/expenses/${expId}`, {
      method: "DELETE",
    }),
};
