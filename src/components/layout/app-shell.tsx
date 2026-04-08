"use client";

import { Navbar } from "@/components/layout/navbar";
import { LocalModeBanner } from "@/components/auth/local-mode-banner";
import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  onAddExpense?: () => void;
  onAddBudget?: () => void;
}

export function AppShell({
  children,
  onAddExpense,
  onAddBudget,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <LocalModeBanner />

      <main className="flex-1 pb-16 lg:pb-0">
        {children}
      </main>

      <BottomNav
        onAddExpense={onAddExpense ?? (() => {})}
        onAddBudget={onAddBudget ?? (() => {})}
        className="lg:hidden"
      />
    </div>
  );
}
