"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useBudgetStore } from "@/store/budget-store";
import { budgetWS } from "@/lib/websocket";
import type { WSMessage } from "@/lib/websocket";

/**
 * Connects to the WebSocket when in online mode with a valid token
 * and an active budget. Refreshes the summary on relevant messages.
 * Disconnects on sign-out or when switching to local mode.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const mode = useAuthStore((s) => s.mode);
  const token = useAuthStore((s) => s.token);
  const activeBudgetId = useBudgetStore((s) => s.activeBudgetId);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  useEffect(() => {
    if (mode !== "online" || !token || !activeBudgetId) {
      budgetWS.disconnect();
      return;
    }

    const handleMessage = (msg: WSMessage) => {
      // Only refresh if the message is relevant to the active budget,
      // or if no budget_id is specified (broadcast).
      if (msg.budget_id && msg.budget_id !== activeBudgetId) return;

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
          refreshSummary();
          break;
        default:
          // Unknown message type -- ignore.
          break;
      }
    };

    budgetWS.connect(token, handleMessage);

    return () => {
      budgetWS.disconnect();
    };
  }, [mode, token, activeBudgetId, refreshSummary]);

  return <>{children}</>;
}
