"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { localBudgetStorage } from "@/lib/local-storage";
import { MigrationDialog } from "@/components/auth/migration-dialog";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn);
  const mode = useAuthStore((s) => s.mode);
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (justLoggedIn && mode === "online" && localBudgetStorage.hasData()) {
      setShowMigration(true);
    }
  }, [justLoggedIn, mode]);

  return (
    <>
      {children}
      <MigrationDialog open={showMigration} onOpenChange={setShowMigration} />
    </>
  );
}
