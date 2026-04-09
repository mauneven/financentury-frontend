"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useBudgetStore } from "@/store/budget-store";
import { budgetWS } from "@/lib/websocket";
import type { WSMessage } from "@/lib/websocket";

/**
 * Connects to the WebSocket when a valid token is present.
 * Refreshes the summary on relevant messages.
 * Disconnects on sign-out.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const activeBudgetId = useBudgetStore((s) => s.activeBudgetId);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  // Keep mutable refs so the message handler always sees the latest values
  // without being part of the connect/disconnect effect's dependency array.
  const activeBudgetIdRef = useRef(activeBudgetId);
  const refreshSummaryRef = useRef(refreshSummary);

  useEffect(() => { activeBudgetIdRef.current = activeBudgetId; }, [activeBudgetId]);
  useEffect(() => { refreshSummaryRef.current = refreshSummary; }, [refreshSummary]);

  // Connect / disconnect only when auth state truly changes.
  useEffect(() => {
    if (!token) {
      budgetWS.disconnect();
      return;
    }

    const handleMessage = (msg: WSMessage) => {
      if (msg.budget_id && msg.budget_id !== activeBudgetIdRef.current) return;

      switch (msg.type) {
        case "budget_updated":
        case "expense_added":
        case "expense_updated":
        case "expense_deleted":
        case "section_added":
        case "section_updated":
        case "section_deleted":
        case "category_added":
        case "category_updated":
        case "category_deleted":
          refreshSummaryRef.current();
          break;
        default:
          break;
      }
    };

    budgetWS.connect(token, handleMessage);

    return () => {
      budgetWS.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return <>{children}</>;
}
