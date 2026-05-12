"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  budgetApi,
  categoryApi,
  collaboratorApi,
  expenseApi,
  inviteApi,
  linkApi,
} from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth-store";
import type {
  BudgetResumeResponse,
  BudgetSummary,
  CreateBudgetInput,
  CreateBudgetLinkInput,
  CreateCategoryInput,
  CreateExpenseInput,
  Expense,
  TrendsResponse,
} from "@/types/budget";

// ---- Reads -----------------------------------------------------------------

export function useBudgets(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.budget.list(),
    queryFn: () => budgetApi.list(),
    enabled: opts.enabled ?? true,
  });
}

export function useBudgetSummary(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.summary(budgetId ?? ""),
    queryFn: () => budgetApi.summary(budgetId!),
    enabled: !!budgetId,
  });
}

/**
 * useBudgetDashboard — single round-trip variant of the dashboard mount
 * fetch.
 *
 * PERF: backed by the aggregate `/budgets/:id/dashboard` endpoint, this
 * hook fetches summary + expenses + trends + resume in ONE request and
 * seeds the four per-query caches via `setQueryData`. Existing readers
 * (`useBudgetSummary`, `useBudgetExpenses`, `useBudgetTrends`,
 * `useBudgetResume`) keep working unchanged — they hit the seeded cache
 * without firing their own fetch on first paint.
 *
 * Net effect on a cold dashboard mount: 4 GETs become 1 GET. Sub-fields
 * also stay invalidatable independently because each is a separate
 * cache key.
 */
export function useBudgetDashboard(budgetId: string | undefined) {
  const qc = useQueryClient();
  return useQuery<{
    summary: BudgetSummary;
    expenses: Expense[];
    trends: TrendsResponse;
    resume: BudgetResumeResponse;
  }>({
    queryKey: qk.budget.dashboard(budgetId ?? ""),
    queryFn: async () => {
      const env = await budgetApi.dashboard(budgetId!);
      // Seed the per-query caches so siblings on the page (which still
      // call useBudgetSummary / useBudgetExpenses / etc.) read straight
      // from the cache without firing duplicate network requests.
      qc.setQueryData(qk.budget.summary(budgetId!), env.summary);
      qc.setQueryData(qk.budget.expenses(budgetId!), env.expenses);
      qc.setQueryData(qk.budget.trends(budgetId!), env.trends);
      qc.setQueryData(qk.budget.resume(budgetId!), env.resume);
      return env;
    },
    enabled: !!budgetId,
  });
}

export function useBudgetExpenses(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.expenses(budgetId ?? ""),
    queryFn: () => expenseApi.list(budgetId!),
    enabled: !!budgetId,
  });
}

/**
 * Fetches expenses from each source budget referenced by the summary's
 * `linked_categories`, filtered to the categories actually linked and to
 * the viewer when filter_mode === "mine". Returns [] when the summary has
 * no linked categories.
 *
 * Implemented as a single composite query so all source-budget fetches are
 * de-duplicated via Promise.all and the cache key tracks the set of source
 * budget IDs (not the individual fetches).
 */
export function useLinkedExpenses(summary: BudgetSummary | undefined) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const linkedCategories = summary?.linked_categories ?? [];

  // Stable cache key from the linked categories' link IDs + filter modes
  // and the viewer (filter_mode=mine narrows by viewer).
  const linkSignature = linkedCategories
    .map((lc) => `${lc.link.id}:${lc.link.filter_mode}`)
    .sort()
    .join("|");

  return useQuery<Expense[]>({
    queryKey: ["budget", "linked-expenses", linkSignature, currentUserId ?? ""],
    queryFn: async () => {
      if (linkedCategories.length === 0) return [];
      const filterByCategory = new Map<string, "all" | "mine">();
      const sourceBudgetIds = new Set<string>();
      for (const lc of linkedCategories) {
        sourceBudgetIds.add(lc.link.source_budget_id);
        filterByCategory.set(lc.category.category.id, lc.link.filter_mode);
      }
      const lists = await Promise.all(
        Array.from(sourceBudgetIds).map(async (bid) => {
          try {
            return await expenseApi.list(bid);
          } catch {
            return [] as Expense[];
          }
        })
      );
      return lists.flat().filter((exp) => {
        const mode = filterByCategory.get(exp.category_id);
        if (!mode) return false;
        if (
          mode === "mine" &&
          currentUserId &&
          exp.created_by !== currentUserId
        )
          return false;
        return true;
      });
    },
    enabled: !!summary,
  });
}

export function useBudgetTrends(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.trends(budgetId ?? ""),
    queryFn: () => budgetApi.trends(budgetId!),
    enabled: !!budgetId,
  });
}

export function useBudgetResume(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.resume(budgetId ?? ""),
    queryFn: () => budgetApi.budgetResume(budgetId!),
    enabled: !!budgetId,
  });
}

export function useBudgetLinks(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.links(budgetId ?? ""),
    queryFn: () => linkApi.list(budgetId!),
    enabled: !!budgetId,
  });
}

export function useLinkableBudgets(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.linkable(budgetId ?? ""),
    queryFn: () => linkApi.linkableBudgets(budgetId!),
    enabled: !!budgetId,
  });
}

export function useBudgetInvites(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.invites(budgetId ?? ""),
    queryFn: () => inviteApi.list(budgetId!),
    enabled: !!budgetId,
  });
}

export function useBudgetCollaborators(budgetId: string | undefined) {
  return useQuery({
    queryKey: qk.budget.collaborators(budgetId ?? ""),
    queryFn: () => collaboratorApi.list(budgetId!),
    enabled: !!budgetId,
  });
}

// ---- Mutations -------------------------------------------------------------
//
// Every mutation invalidates the keys whose data it affects. Granular
// invalidation here means components only re-fetch what changed.

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetInput) => budgetApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.list() });
    },
  });
}

export function useUpdateBudget(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateBudgetInput>) =>
      budgetApi.update(budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.detail(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.list() });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetApi.delete(id),
    onSuccess: (_void, id) => {
      qc.removeQueries({ queryKey: qk.budget.detail(id) });
      qc.invalidateQueries({ queryKey: qk.budget.list() });
    },
  });
}

export function useCreateCategory(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) =>
      categoryApi.create(budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.trends(budgetId) });
    },
  });
}

export function useUpdateCategory(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      catId,
      data,
    }: {
      catId: string;
      data: Partial<CreateCategoryInput>;
    }) => categoryApi.update(budgetId, catId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
    },
  });
}

export function useDeleteCategory(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (catId: string) => categoryApi.delete(budgetId, catId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.expenses(budgetId) });
    },
  });
}

export function useCreateExpense(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      expenseApi.create(budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.expenses(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.trends(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.resume(budgetId) });
    },
  });
}

export function useUpdateExpense(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      expId,
      data,
    }: {
      expId: string;
      data: Partial<CreateExpenseInput>;
    }) => expenseApi.update(budgetId, expId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.expenses(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.trends(budgetId) });
    },
  });
}

export function useDeleteExpense(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expId: string) => expenseApi.delete(budgetId, expId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.expenses(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.trends(budgetId) });
    },
  });
}

export function useCreateLink(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetLinkInput) =>
      linkApi.create(budgetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.links(budgetId) });
    },
  });
}

export function useDeleteLink(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => linkApi.delete(budgetId, linkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.links(budgetId) });
    },
  });
}

export function useUpdateLink(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      linkId,
      filterMode,
    }: {
      linkId: string;
      filterMode: string;
    }) => linkApi.update(budgetId, linkId, { filter_mode: filterMode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.links(budgetId) });
    },
  });
}

export function useCreateInvite(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => inviteApi.create(budgetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.invites(budgetId) });
    },
  });
}

export function useRemoveCollaborator(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      collaboratorApi.remove(budgetId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.budget.collaborators(budgetId) });
      qc.invalidateQueries({ queryKey: qk.budget.summary(budgetId) });
    },
  });
}
