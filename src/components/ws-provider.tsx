"use client";

import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { qk } from "@/lib/query-keys";
import type { WSMessage } from "@/lib/websocket";
import { budgetWS } from "@/lib/websocket";
import { useActiveBudgetStore } from "@/store/active-budget-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Connects to the WebSocket when a valid token is present and translates
 * incoming events into react-query invalidations. Disconnects on sign-out.
 *
 * Mutation events relevant to the active budget invalidate that budget's
 * summary / expenses / trends / resume keys; react-query then refetches
 * automatically and the dashboard updates.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const activeBudgetId = useActiveBudgetStore((s) => s.activeBudgetId);
  const queryClient = useQueryClient();

  // Mutable ref so the connection effect doesn't tear down + reconnect the
  // socket every time the active budget changes.
  const activeBudgetIdRef = useRef(activeBudgetId);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    activeBudgetIdRef.current = activeBudgetId;
  }, [activeBudgetId]);

  useEffect(() => {
    if (!token) {
      budgetWS.disconnect();
      return;
    }

    const handleMessage = (msg: WSMessage) => {
      if (msg.budget_id && msg.budget_id !== activeBudgetIdRef.current) return;

      switch (msg.type) {
        case "budget_updated":
        case "expense_created":
        case "expense_updated":
        case "expense_deleted":
        case "category_created":
        case "category_updated":
        case "category_deleted":
        case "link_created":
        case "link_updated":
        case "link_deleted": {
          // Debounce: coalesce rapid WS events into a single invalidate pass.
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            const id = activeBudgetIdRef.current;
            if (!id) return;
            // Invalidate the whole detail subtree (summary, expenses,
            // trends, resume, links). React-query refetches anything
            // that's mounted; unmounted entries become stale and refetch
            // on next mount.
            queryClient.invalidateQueries({ queryKey: qk.budget.detail(id) });
          }, 500);
          break;
        }
        default:
          break;
      }
    };

    budgetWS.connect(token, handleMessage);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      budgetWS.disconnect();
    };
  }, [token, queryClient]);

  return <>{children}</>;
}
