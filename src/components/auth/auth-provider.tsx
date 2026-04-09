"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { WebSocketProvider } from "@/components/ws-provider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <WebSocketProvider>{children}</WebSocketProvider>;
}
