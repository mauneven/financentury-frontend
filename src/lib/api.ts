import type {
  Budget,
  BudgetSummary,
  Section,
  Collaborator,
  CreateBudgetInput,
  CreateSectionInput,
  CreateExpenseInput,
  CreateCategoryInput,
  Expense,
  Category,
  TrendsResponse,
} from "@/types/budget";
import type { AuthUser } from "@/store/auth-store";
interface MigratePayload {
  budgets: Array<Record<string, unknown>>;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (() => {
    if (process.env.NODE_ENV === "production") {
      console.error("NEXT_PUBLIC_API_URL is not set in production!");
    }
    return "http://localhost:8080/api";
  })();

/**
 * Checks whether the stored token's exp claim is still in the future.
 * Returns true if the token is expired or malformed.
 */
function isStoredTokenExpired(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return true;
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number") return true;
    return Date.now() >= (payload.exp - 60) * 1000;
  } catch {
    return true;
  }
}

/**
 * Sanitizes error message text to prevent XSS when rendered in the UI.
 * Strips any HTML tags and limits length.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg || typeof msg !== "string") return "Request failed";
  // Strip HTML tags to prevent XSS if message is rendered in innerHTML.
  const cleaned = msg.replace(/<[^>]*>/g, "");
  // Limit length to prevent abuse.
  return cleaned.length > 500 ? cleaned.slice(0, 500) : cleaned;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("financentury_token");
    if (stored) {
      // Check token expiry before sending to avoid unnecessary requests.
      if (isStoredTokenExpired(stored)) {
        localStorage.removeItem("financentury_token");
      } else {
        token = stored;
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("financentury_token");
      // Redirect to login
      window.location.href = "/login";
    }
    const error = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    throw new Error(
      sanitizeErrorMessage(
        error.error || error.message || `Request failed: ${res.status}`
      )
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  googleLogin: (code: string, redirectUri: string) =>
    request<{ token: string; user: AuthUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    }),
  me: () => request<AuthUser>("/auth/me"),
  migrate: (data: MigratePayload) =>
    request<{ budgets: Budget[] }>("/migrate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; full_name: string; avatar_url: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; full_name: string; avatar_url: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

// Sections (was Categories)
export const sectionApi = {
  list: (budgetId: string) =>
    request<Section[]>(`/budgets/${budgetId}/sections`),

  create: (budgetId: string, data: CreateSectionInput) =>
    request<Section>(`/budgets/${budgetId}/sections`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    budgetId: string,
    sectionId: string,
    data: Partial<CreateSectionInput>
  ) =>
    request<Section>(`/budgets/${budgetId}/sections/${sectionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (budgetId: string, sectionId: string) =>
    request<void>(`/budgets/${budgetId}/sections/${sectionId}`, {
      method: "DELETE",
    }),
};

// Categories (was Subcategories)
export const categoryApi = {
  create: (
    budgetId: string,
    sectionId: string,
    data: CreateCategoryInput
  ) =>
    request<Category>(
      `/budgets/${budgetId}/sections/${sectionId}/categories`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  update: (
    budgetId: string,
    sectionId: string,
    catId: string,
    data: Partial<CreateCategoryInput>
  ) =>
    request<Category>(
      `/budgets/${budgetId}/sections/${sectionId}/categories/${catId}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  delete: (budgetId: string, sectionId: string, catId: string) =>
    request<void>(
      `/budgets/${budgetId}/sections/${sectionId}/categories/${catId}`,
      { method: "DELETE" }
    ),
};

// Invites
export const inviteApi = {
  create: (budgetId: string) =>
    request<{ invite_token: string; invite_url: string; expires_at: string }>(
      `/budgets/${budgetId}/invite`,
      { method: "POST" }
    ),
  getInfo: (token: string) =>
    request<{
      budget_name: string;
      inviter_name: string;
      expires_at: string;
      is_expired: boolean;
      is_used: boolean;
    }>(`/invites/${token}`),
  accept: (token: string) =>
    request<Budget>(`/invites/${token}/accept`, { method: "POST" }),
};

// Collaborators
export const collaboratorApi = {
  list: (budgetId: string) =>
    request<Collaborator[]>(`/budgets/${budgetId}/collaborators`),
  remove: (budgetId: string, userId: string) =>
    request<void>(`/budgets/${budgetId}/collaborators/${userId}`, {
      method: "DELETE",
    }),
};

/**
 * Normalizes an expense object from the API so that category_id is always
 * populated. The backend stores expenses with column name subcategory_id and
 * serializes using that JSON key. We remap it here to the canonical category_id
 * field used everywhere else in the frontend.
 */
function normalizeExpense(e: Record<string, unknown>): Expense {
  return {
    ...e,
    category_id:
      (e.category_id as string | undefined) ||
      (e.subcategory_id as string | undefined) ||
      "",
  } as Expense;
}

// Expenses
export const expenseApi = {
  list: (budgetId: string) =>
    request<Record<string, unknown>[]>(`/budgets/${budgetId}/expenses`).then(
      (expenses) => expenses.map(normalizeExpense)
    ),

  create: (budgetId: string, data: CreateExpenseInput) =>
    request<Record<string, unknown>>(`/budgets/${budgetId}/expenses`, {
      method: "POST",
      body: JSON.stringify({
        subcategory_id: data.category_id,
        amount: data.amount,
        description: data.description,
        expense_date: data.expense_date,
      }),
    }).then(normalizeExpense),

  update: (
    budgetId: string,
    expId: string,
    data: Partial<CreateExpenseInput>
  ) =>
    request<Record<string, unknown>>(`/budgets/${budgetId}/expenses/${expId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...(data.category_id && { subcategory_id: data.category_id }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.expense_date && { expense_date: data.expense_date }),
      }),
    }).then(normalizeExpense),

  delete: (budgetId: string, expId: string) =>
    request<void>(`/budgets/${budgetId}/expenses/${expId}`, {
      method: "DELETE",
    }),
};
