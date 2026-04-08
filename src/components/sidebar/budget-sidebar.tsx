"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Wallet,
  LogIn,
  Pencil,
  Settings,
} from "lucide-react";
import type { Section, Category } from "@/types/budget";
import { useTranslations } from "@/i18n/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useAuthStore } from "@/store/auth-store";
import { LocalModeBanner } from "@/components/auth/local-mode-banner";
import Link from "next/link";
import { EditSectionDialog } from "@/components/budget/edit-section-dialog";
import { EditCategoryDialog } from "@/components/budget/edit-category-dialog";
import { AddSectionDialog } from "@/components/budget/add-section-dialog";

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
  const router = useRouter();
  const { budgets, activeBudgetId, summary, setActiveBudget } =
    useBudgetStore();
  const { mode } = useAuthStore();

  const budgetBasePath = (budgetId: string) =>
    `/${mode === "local" ? "localBudget" : "budget"}/${budgetId}`;
  const [expandedBudgets, setExpandedBudgets] = useState<
    Record<string, boolean>
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingCategory, setEditingCategory] = useState<{
    sectionId: string;
    category: Category;
  } | null>(null);
  const [addSectionForBudget, setAddSectionForBudget] = useState<string | null>(null);

  const toggleBudget = (budgetId: string) => {
    setExpandedBudgets((prev) => ({
      ...prev,
      [budgetId]: !prev[budgetId],
    }));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleBudgetClick = (budgetId: string) => {
    setActiveBudget(budgetId);
    setExpandedBudgets((prev) => ({
      ...prev,
      [budgetId]: true,
    }));
    router.push(budgetBasePath(budgetId));
  };

  const sections: Section[] = summary?.categories.map((c) => c.category) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
          <Wallet className="size-4 text-background" />
        </div>
        <span className="text-base font-semibold tracking-tight text-foreground">
          {tApp("title")}
        </span>
      </div>

      <Separator />

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
      <div className="px-3 pt-3.5 pb-2.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-sm font-medium shadow-sm"
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
              const budgetSections = isActive ? sections : [];

              return (
                <Collapsible
                  key={budget.id}
                  open={isExpanded}
                  onOpenChange={() => toggleBudget(budget.id)}
                >
                  <div className="group/budget flex items-center px-1">
                    <CollapsibleTrigger className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-200 hover:bg-accent">
                      <ChevronRight
                        className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      onClick={() => handleBudgetClick(budget.id)}
                      className={`flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-base transition-colors duration-200 hover:bg-accent ${
                        isActive
                          ? "bg-accent/80 font-semibold text-foreground"
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddSectionForBudget(budget.id);
                      }}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/budget:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                      aria-label="Add section"
                    >
                      <Plus className="size-3" />
                    </button>
                    <Link
                      href={`${budgetBasePath(budget.id)}/settings`}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/budget:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                      aria-label="Budget settings"
                    >
                      <Settings className="size-3" />
                    </Link>
                  </div>

                  <CollapsibleContent>
                    <div className="ml-4 border-l border-border pl-2">
                      {budgetSections.length === 0 && isActive && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          {t("loading")}
                        </div>
                      )}
                      {budgetSections.map((section) => {
                        const secExpanded =
                          expandedSections[section.id] ?? false;
                        const secSummary = summary?.categories.find(
                          (c) => c.category.id === section.id
                        );
                        const subcategories: Category[] =
                          secSummary?.categories.map((s) => s.category) ??
                          [];
                        const totalBudget = summary?.total_budget ?? 0;
                        const secSpentPercent =
                          totalBudget > 0 && secSummary
                            ? Math.round(
                                (secSummary.total_spent / totalBudget) * 100
                              )
                            : 0;
                        const secAllocatedPercent = section.allocation_percent;
                        const secExceeded = secSummary
                          ? secSummary.total_spent > secSummary.allocated_amount
                          : false;

                        return (
                          <Collapsible
                            key={section.id}
                            open={secExpanded}
                            onOpenChange={() => toggleSection(section.id)}
                          >
                            <div className="group/cat flex items-center">
                              <CollapsibleTrigger className="flex size-5 shrink-0 items-center justify-center rounded-md transition-colors duration-200 hover:bg-accent">
                                <ChevronRight
                                  className={`size-3 text-muted-foreground transition-transform duration-200 ${
                                    secExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              </CollapsibleTrigger>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `${budgetBasePath(budget.id)}/section/${section.id}`
                                  )
                                }
                                className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors duration-200 hover:bg-accent text-left min-h-[44px]"
                              >
                                <span className="shrink-0 text-sm leading-none w-4 text-center">
                                  {section.icon || ""}
                                </span>
                                <span className="truncate font-medium text-foreground/80">
                                  {section.name}
                                </span>
                                <span className="ml-auto shrink-0 text-xs tabular-nums">
                                  <span
                                    className={
                                      secExceeded
                                        ? "text-red-500"
                                        : "text-emerald-600"
                                    }
                                  >
                                    {secSpentPercent}%
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" / "}
                                    {secAllocatedPercent}%
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddExpense();
                                }}
                                className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/cat:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                                aria-label="Add expense"
                              >
                                <Plus className="size-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSection(section);
                                }}
                                className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/cat:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                                aria-label={`Edit ${section.name}`}
                              >
                                <Pencil className="size-2.5" />
                              </button>
                            </div>

                            <CollapsibleContent>
                              <div className="ml-3 border-l border-border pl-2">
                                {subcategories.map((sub) => {
                                  const subSummary =
                                    secSummary?.categories.find(
                                      (s) => s.category.id === sub.id
                                    );
                                  const subSpentPercent =
                                    totalBudget > 0 && subSummary
                                      ? Math.round(
                                          (subSummary.total_spent /
                                            totalBudget) *
                                            100
                                        )
                                      : 0;
                                  const subExceeded = subSummary
                                    ? subSummary.total_spent >
                                      subSummary.allocated_amount
                                    : false;

                                  return (
                                    <div
                                      key={sub.id}
                                      className="group/sub flex items-center"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSelectSubcategory?.(budget.id, sub.id);
                                          router.push(
                                            `${budgetBasePath(budget.id)}/section/${section.id}/category/${sub.id}`
                                          );
                                        }}
                                        className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors duration-200 hover:bg-accent min-h-[44px]"
                                      >
                                        <span className="shrink-0 text-sm leading-none w-4 text-center">
                                          {sub.icon || "·"}
                                        </span>
                                        <span className="truncate text-foreground/70">
                                          {sub.name}
                                        </span>
                                        <span className="ml-auto shrink-0 text-xs tabular-nums">
                                          <span
                                            className={
                                              subExceeded
                                                ? "text-red-500"
                                                : "text-emerald-600"
                                            }
                                          >
                                            {subSpentPercent}%
                                          </span>
                                          <span className="text-muted-foreground">
                                            {" of "}
                                            {secAllocatedPercent}%
                                          </span>
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCategory({
                                            sectionId: section.id,
                                            category: sub,
                                          });
                                        }}
                                        className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                                        aria-label={`Edit ${sub.name}`}
                                      >
                                        <Pencil className="size-2.5" />
                                      </button>
                                    </div>
                                  );
                                })}
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
      <div className="px-3 py-3.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onAddBudget}
        >
          <Plus className="size-3.5" />
          {t("addBudget")}
        </Button>
      </div>

      {/* Local mode banner */}
      <LocalModeBanner />

      {/* User footer */}
      <Separator />
      <div className="flex items-center justify-between px-4 py-3.5">
        <UserFooterLink />
        <LanguageSwitcher />
      </div>

      {/* Add section dialog */}
      {addSectionForBudget && (
        <AddSectionDialog
          budgetId={addSectionForBudget}
          open={!!addSectionForBudget}
          onOpenChange={(open) => {
            if (!open) setAddSectionForBudget(null);
          }}
        />
      )}

      {/* Edit dialogs */}
      {editingSection && (() => {
        const editingSecSubcategories =
          summary?.categories
            .find((c) => c.category.id === editingSection.id)
            ?.categories.map((s) => s.category) ?? [];
        return (
          <EditSectionDialog
            section={editingSection}
            categories={editingSecSubcategories}
            open={!!editingSection}
            onOpenChange={(open) => {
              if (!open) setEditingSection(null);
            }}
          />
        );
      })()}
      {editingCategory && (() => {
        const parentSectionSummary = summary?.categories.find(
          (c) => c.category.id === editingCategory.sectionId
        );
        const parentSection: Section = parentSectionSummary?.category ?? {
          id: editingCategory.sectionId,
          budget_id: "",
          name: "",
          allocation_percent: 0,
          icon: "",
          sort_order: 0,
          created_at: "",
        };
        const allSiblings: Category[] =
          parentSectionSummary?.categories.map((s) => s.category) ?? [];
        return (
          <EditCategoryDialog
            sectionId={editingCategory.sectionId}
            category={editingCategory.category}
            parentSection={parentSection}
            siblingCategories={allSiblings}
            open={!!editingCategory}
            onOpenChange={(open) => {
              if (!open) setEditingCategory(null);
            }}
          />
        );
      })()}
    </div>
  );
}

function UserFooterLink() {
  const { user, mode, signInWithGoogle } = useAuthStore();
  const t = useTranslations("localMode");

  if (mode === "local") {
    return (
      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogIn className="size-3.5" />
        <span>{t("signIn")}</span>
      </button>
    );
  }

  const displayName = user?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 rounded-md transition-colors hover:opacity-80"
    >
      <Avatar size="sm">
        {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground truncate max-w-[140px]">
        {displayName}
      </span>
    </Link>
  );
}
