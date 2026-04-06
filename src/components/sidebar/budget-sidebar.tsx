"use client";

import { useState } from "react";
import { useBudgetStore } from "@/store/budget-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  Plus,
  FolderOpen,
  Folder,
  FileText,
  Wallet,
} from "lucide-react";
import type { Category, Subcategory } from "@/types/budget";
import { useTranslations } from "@/i18n/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface BudgetSidebarProps {
  onAddExpense: () => void;
  onAddBudget: () => void;
  onSelectSubcategory?: (budgetId: string, subcategoryId: string) => void;
}

export function BudgetSidebar({
  onAddExpense,
  onAddBudget,
  onSelectSubcategory,
}: BudgetSidebarProps) {
  const t = useTranslations("sidebar");
  const tApp = useTranslations("app");
  const { budgets, activeBudgetId, summary, setActiveBudget } =
    useBudgetStore();
  const [expandedBudgets, setExpandedBudgets] = useState<
    Record<string, boolean>
  >({});
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const toggleBudget = (budgetId: string) => {
    setExpandedBudgets((prev) => ({
      ...prev,
      [budgetId]: !prev[budgetId],
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleBudgetClick = (budgetId: string) => {
    setActiveBudget(budgetId);
    setExpandedBudgets((prev) => ({
      ...prev,
      [budgetId]: true,
    }));
  };

  const categories: Category[] = summary?.categories.map((c) => c.category) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground">
          <Wallet className="size-3.5 text-background" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {tApp("title")}
        </span>
      </div>

      <Separator />

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("myBudgets")}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onAddExpense}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          <span className="sr-only">{t("addExpense")}</span>
        </Button>
      </div>

      <Separator />

      {/* Add Expense button */}
      <div className="px-3 pt-3 pb-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={onAddExpense}
        >
          <Plus className="size-3.5" />
          {t("addExpense")}
        </Button>
      </div>

      {/* Tree view */}
      <ScrollArea className="flex-1 px-1">
        <div className="py-2">
          {budgets.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Wallet className="mx-auto mb-2 size-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {t("noBudgets")}
              </p>
            </div>
          ) : (
            budgets.map((budget) => {
              const isActive = budget.id === activeBudgetId;
              const isExpanded = expandedBudgets[budget.id] ?? false;
              const budgetCategories = isActive ? categories : [];

              return (
                <Collapsible
                  key={budget.id}
                  open={isExpanded}
                  onOpenChange={() => toggleBudget(budget.id)}
                >
                  <div className="group flex items-center">
                    <CollapsibleTrigger className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-200 hover:bg-accent">
                      <ChevronRight
                        className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    <button
                      onClick={() => handleBudgetClick(budget.id)}
                      className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors duration-200 hover:bg-accent ${
                        isActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-foreground/80"
                      }`}
                    >
                      {isExpanded ? (
                        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{budget.name}</span>
                    </button>
                  </div>

                  <CollapsibleContent>
                    <div className="ml-3 border-l border-border pl-2">
                      {budgetCategories.length === 0 && isActive && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          {t("loading")}
                        </div>
                      )}
                      {budgetCategories.map((category) => {
                        const catExpanded =
                          expandedCategories[category.id] ?? false;
                        const subcategories: Subcategory[] =
                          summary?.categories.find(
                            (c) => c.category.id === category.id
                          )?.subcategories.map((s) => s.subcategory) ?? [];

                        return (
                          <Collapsible
                            key={category.id}
                            open={catExpanded}
                            onOpenChange={() => toggleCategory(category.id)}
                          >
                            <div className="group flex items-center">
                              <CollapsibleTrigger className="flex size-5 shrink-0 items-center justify-center rounded-md transition-colors duration-200 hover:bg-accent">
                                <ChevronRight
                                  className={`size-3 text-muted-foreground transition-transform duration-200 ${
                                    catExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              </CollapsibleTrigger>
                              <div className="flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors duration-200 hover:bg-accent">
                                <span className="shrink-0 text-sm leading-none">
                                  {category.icon || ""}
                                </span>
                                <span className="truncate text-foreground/80">
                                  {category.name}
                                </span>
                                <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                  {category.allocation_percent}%
                                </span>
                              </div>
                            </div>

                            <CollapsibleContent>
                              <div className="ml-2.5 border-l border-border pl-2">
                                {subcategories.map((sub) => (
                                  <button
                                    key={sub.id}
                                    onClick={() =>
                                      onSelectSubcategory?.(budget.id, sub.id)
                                    }
                                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors duration-200 hover:bg-accent"
                                  >
                                    <FileText className="size-3 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-foreground/70">
                                      {sub.icon ? `${sub.icon} ` : ""}
                                      {sub.name}
                                    </span>
                                    <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                      {sub.allocation_percent}%
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Add Budget */}
      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onAddBudget}
        >
          <Plus className="size-3.5" />
          {t("addBudget")}
        </Button>
      </div>

      {/* User footer */}
      <Separator />
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">User</span>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
