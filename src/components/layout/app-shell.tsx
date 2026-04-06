"use client";

import { BudgetSidebar } from "@/components/sidebar/budget-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  onAddExpense: () => void;
  onAddBudget: () => void;
  onSelectSubcategory?: (budgetId: string, subcategoryId: string) => void;
}

export function AppShell({
  children,
  onAddExpense,
  onAddBudget,
  onSelectSubcategory,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
          <BudgetSidebar
            onAddExpense={onAddExpense}
            onAddBudget={onAddBudget}
            onSelectSubcategory={onSelectSubcategory}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-background pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav
        onAddExpense={onAddExpense}
        onAddBudget={onAddBudget}
        className="lg:hidden"
      />
    </div>
  );
}
