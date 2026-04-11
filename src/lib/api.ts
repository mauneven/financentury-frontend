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
      // Redirect to landing page (auth is now a modal there)
      window.location.href = "/";
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

// Categories
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

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Normalizes an expense from the API to ensure category_id is always set.
 * Handles both old backend (subcategory_id) and new backend (category_id).
 * Also handles the case where category_id is a zero UUID (deserialization bug).
 */
function normalizeExpense(raw: Record<string, unknown>): Expense {
  const e = raw as unknown as Expense & { subcategory_id?: string };
  if ((!e.category_id || e.category_id === NIL_UUID) && e.subcategory_id && e.subcategory_id !== NIL_UUID) {
    e.category_id = e.subcategory_id;
  }
  return e as Expense;
}

// Expenses
export const expenseApi = {
  list: (budgetId: string) =>
    request<Record<string, unknown>[]>(`/budgets/${budgetId}/expenses`).then(
      (expenses) => (expenses || []).map(normalizeExpense)
    ),

  create: (budgetId: string, data: CreateExpenseInput) =>
    request<Record<string, unknown>>(`/budgets/${budgetId}/expenses`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        // Send both keys for backward compatibility with old backend
        subcategory_id: data.category_id,
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
        ...data,
        ...(data.category_id && { subcategory_id: data.category_id }),
      }),
    }).then(normalizeExpense),

  delete: (budgetId: string, expId: string) =>
    request<void>(`/budgets/${budgetId}/expenses/${expId}`, {
      method: "DELETE",
    }),
};
