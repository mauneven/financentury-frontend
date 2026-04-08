"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BudgetSidebar } from "@/components/sidebar/budget-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 280;

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
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(SIDEBAR_DEFAULT);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className="hidden shrink-0 border-r-2 border-foreground bg-card lg:flex lg:flex-col relative"
          style={{ width: sidebarWidth }}
        >
          <BudgetSidebar
            onAddExpense={onAddExpense}
            onAddBudget={onAddBudget}
            onSelectSubcategory={onSelectSubcategory}
          />
          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-accent transition-colors z-10"
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
