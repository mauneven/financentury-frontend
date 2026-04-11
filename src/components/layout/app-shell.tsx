"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
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

      <main className="flex-1 pb-16 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>

      <Footer />

      <BottomNav
        onAddExpense={onAddExpense ?? (() => {})}
        onAddBudget={onAddBudget ?? (() => {})}
        className="lg:hidden"
      />
    </div>
  );
}
