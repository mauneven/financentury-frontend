import React from "react";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the api module before importing the hooks. The dashboard hook calls
// budgetApi.dashboard once on mount and seeds the four sibling caches via
// setQueryData — those cache writes are what we assert on.
// ---------------------------------------------------------------------------
const dashboardMock = vi.fn();
vi.mock("@/lib/api", () => ({
  budgetApi: {
    dashboard: (...args: unknown[]) => dashboardMock(...args),
  },
}));

// auth-store is read by useLinkedExpenses (sibling in the same module).
// Provide a minimal shape so the import chain doesn't blow up.
vi.mock("@/store/auth-store", () => ({
  useAuthStore: () => undefined,
}));

import { useBudgetDashboard } from "@/hooks/use-budget-queries";
import { qk } from "@/lib/query-keys";

const BUDGET_ID = "11111111-1111-1111-1111-111111111111";

const sampleEnvelope = {
  summary: {
    budget: {
      id: BUDGET_ID,
      user_id: "u1",
      name: "Test",
      icon: "wallet",
      monthly_income: 1000,
      currency: "USD",
      billing_period_months: 1,
      billing_cutoff_day: 1,
      mode: "manual",
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
    categories: [],
    linked_categories: [],
    total_budget: 1000,
    total_spent: 0,
  },
  expenses: [
    {
      id: "e1",
      budget_id: BUDGET_ID,
      category_id: "c1",
      amount: 50,
      description: "Test",
      expense_date: "2026-05-08",
      created_by: "u1",
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
  ],
  trends: { budget_id: BUDGET_ID, categories: [] },
  resume: { budget_id: BUDGET_ID, periods: [] },
};

function withClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: true,
        gcTime: Number.POSITIVE_INFINITY,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useBudgetDashboard — cache seeding", () => {
  it("populates summary / expenses / trends / resume per-query caches", async () => {
    dashboardMock.mockResolvedValueOnce(sampleEnvelope);
    const { client, wrapper } = withClient();

    const { result } = renderHook(() => useBudgetDashboard(BUDGET_ID), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(client.getQueryData(qk.budget.summary(BUDGET_ID))).toEqual(
      sampleEnvelope.summary
    );
    expect(client.getQueryData(qk.budget.expenses(BUDGET_ID))).toEqual(
      sampleEnvelope.expenses
    );
    expect(client.getQueryData(qk.budget.trends(BUDGET_ID))).toEqual(
      sampleEnvelope.trends
    );
    expect(client.getQueryData(qk.budget.resume(BUDGET_ID))).toEqual(
      sampleEnvelope.resume
    );
  });

  it("seeded data feeds a sibling useQuery without firing its own fetch", async () => {
    dashboardMock.mockResolvedValueOnce(sampleEnvelope);
    const { client, wrapper } = withClient();

    // Mount the dashboard hook to trigger the seed.
    const { result } = renderHook(() => useBudgetDashboard(BUDGET_ID), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    // Now mount a sibling reader using the SAME query key. It should
    // observe the cached data instantly — no second network request.
    const sentinelFetch = vi.fn();
    const { result: siblingResult } = renderHook(
      () =>
        useQuery({
          queryKey: qk.budget.summary(BUDGET_ID),
          queryFn: () => {
            sentinelFetch();
            return Promise.resolve(undefined);
          },
        }),
      { wrapper }
    );

    expect(siblingResult.current.data).toEqual(sampleEnvelope.summary);
    expect(sentinelFetch).not.toHaveBeenCalled();
    expect(client.getQueryData(qk.budget.summary(BUDGET_ID))).toEqual(
      sampleEnvelope.summary
    );
  });

  it("is disabled when budgetId is undefined", async () => {
    dashboardMock.mockClear();
    const { wrapper } = withClient();

    const { result } = renderHook(() => useBudgetDashboard(undefined), {
      wrapper,
    });
    // Disabled query stays in pending without firing the fetch.
    expect(result.current.fetchStatus).toBe("idle");
    expect(dashboardMock).not.toHaveBeenCalled();
  });
});
