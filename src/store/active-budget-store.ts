"use client";

import { create } from "zustand";

/**
 * Holds the budget the user is currently viewing. This is *client* state
 * (UI navigation) so it lives in zustand, not react-query. Server-state
 * about the budget itself flows through `useBudgetSummary` etc.
 *
 * The WebSocket handler reads this to decide whether an incoming server
 * event is relevant to the visible page (and therefore triggers a query
 * invalidation).
 */
interface ActiveBudgetState {
  activeBudgetId: string | null;
  setActiveBudgetId: (id: string | null) => void;
}

export const useActiveBudgetStore = create<ActiveBudgetState>((set) => ({
  activeBudgetId: null,
  setActiveBudgetId: (id) => set({ activeBudgetId: id }),
}));
