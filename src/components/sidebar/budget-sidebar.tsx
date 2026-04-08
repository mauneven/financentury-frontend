"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  Sun,
  Moon,
} from "lucide-react";
import type { Section, Category } from "@/types/budget";
import { formatCompact } from "@/lib/format";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTheme } from "next-themes";
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
  const pathname = usePathname();
  const budgets = useBudgetStore((s) => s.budgets);
  const activeBudgetId = useBudgetStore((s) => s.activeBudgetId);
  const summary = useBudgetStore((s) => s.summary);
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const mode = useAuthStore((s) => s.mode);

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

  // Auto-expand active budget when summary loads
  useEffect(() => {
    if (activeBudgetId && summary) {
      setExpandedBudgets((prev) => ({
        ...prev,
        [activeBudgetId]: true,
      }));
    }
  }, [activeBudgetId, summary]);

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

  const handleSectionClick = (budgetId: string, sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: true,
    }));
    router.push(`${budgetBasePath(budgetId)}/section/${sectionId}`);
  };

  const loading = useBudgetStore((s) => s.loading);
  const sections: Section[] = useMemo(
    () => summary?.sections.map((c) => c.section) ?? [],
    [summary]
  );
  const currency = summary?.budget.currency ?? "USD";

  return (
    <div className="flex h-full flex-col border-r-2 border-foreground">
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b-2 border-foreground">
        <div className="flex size-8 items-center justify-center bg-foreground">
          <Wallet className="size-4 text-background" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest text-foreground">
          {tApp("title")}
        </span>
      </div>

      {/* Local mode banner - placed right below branding */}
      <LocalModeBanner />

      <Separator className="!border-b !border-border" />

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
                  open={isActive && isExpanded}
                  onOpenChange={() => isActive && toggleBudget(budget.id)}
                >
                  <div className="group/budget flex items-center px-1 border-b-2 border-foreground/20">
                    {isActive ? (
                      <CollapsibleTrigger className="flex size-6 shrink-0 items-center justify-center transition-colors duration-200 hover:bg-muted">
                        <ChevronRight
                          className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </CollapsibleTrigger>
                    ) : (
                      <div className="flex size-6 shrink-0 items-center justify-center" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleBudgetClick(budget.id)}
                      className={`flex flex-1 items-center gap-2 px-2 py-2.5 text-xs uppercase tracking-wider transition-colors duration-200 hover:bg-muted ${
                        isActive
                          ? "bg-muted font-bold text-foreground"
                          : "text-foreground/70"
                      }`}
                    >
                      {isActive && isExpanded ? (
                        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate font-bold">{budget.name}</span>
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddSectionForBudget(budget.id);
                        }}
                        className="flex size-6 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/budget:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100 mr-1"
                        aria-label="Add section"
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                  </div>

                  <CollapsibleContent>
                    <div className="ml-4 border-l-2 border-foreground/30 pl-2">
                      {budgetSections.length === 0 && isActive && loading && (
                        <div className="px-2 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                          {t("loading")}
                        </div>
                      )}
                      {budgetSections.map((section) => {
                        const secExpanded =
                          expandedSections[section.id] ?? false;
                        const secSummary = summary?.sections.find(
                          (c) => c.section.id === section.id
                        );
                        const subcategories: Category[] =
                          secSummary?.categories.map((s) => s.category) ??
                          [];
                        const secSpent = secSummary?.total_spent ?? 0;
                        const secAllocated = secSummary?.allocated_amount ?? 0;
                        const secExceeded = secSpent > secAllocated;
                        const isSectionActive = pathname.includes(`/section/${section.id}`);

                        return (
                          <Collapsible
                            key={section.id}
                            open={secExpanded}
                            onOpenChange={() => toggleSection(section.id)}
                          >
                            <div className="group/cat flex items-center border-b border-foreground/15">
                              <CollapsibleTrigger className="flex size-5 shrink-0 items-center justify-center transition-colors duration-200 hover:bg-muted">
                                <ChevronRight
                                  className={`size-3 text-muted-foreground transition-transform duration-200 ${
                                    secExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              </CollapsibleTrigger>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSectionClick(budget.id, section.id)
                                }
                                className={`flex flex-1 items-center gap-2 px-2 py-2.5 text-xs transition-colors duration-200 hover:bg-muted text-left min-h-[44px] ${
                                  isSectionActive
                                    ? "bg-muted font-bold text-foreground"
                                    : ""
                                }`}
                              >
                                <span className="shrink-0 text-sm leading-none w-4 text-center">
                                  <CategoryIcon iconKey={section.icon} className="size-4" />
                                </span>
                                <span className="truncate font-medium text-foreground/80">
                                  {section.name}
                                </span>
                                <span className="ml-auto shrink-0 text-xs tabular-nums">
                                  <span
                                    className={
                                      secExceeded
                                        ? "text-red-600 font-semibold"
                                        : "text-emerald-700 dark:text-emerald-500 font-medium"
                                    }
                                  >
                                    {formatCompact(secSpent, currency)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" / "}
                                    {formatCompact(secAllocated, currency)}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSection(section);
                                }}
                                className="flex size-5 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/cat:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
                                aria-label={`Edit ${section.name}`}
                              >
                                <Pencil className="size-2.5" />
                              </button>
                            </div>

                            <CollapsibleContent>
                              <div className="ml-3 border-l-2 border-foreground/20 pl-2">
                                {subcategories.map((sub) => {
                                  const subSummary =
                                    secSummary?.categories.find(
                                      (s) => s.category.id === sub.id
                                    );
                                  const subSpent = subSummary?.total_spent ?? 0;
                                  const subAllocated = subSummary?.allocated_amount ?? 0;
                                  const subExceeded = subSpent > subAllocated;
                                  const isCategoryActive = pathname.includes(`/category/${sub.id}`);

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
                                        className={`flex flex-1 items-center gap-2 px-2 py-2.5 text-xs transition-colors duration-200 hover:bg-muted min-h-[44px] ${
                                          isCategoryActive
                                            ? "bg-muted font-bold text-foreground"
                                            : ""
                                        }`}
                                      >
                                        <span className="shrink-0 text-sm leading-none w-4 text-center">
                                          <CategoryIcon iconKey={sub.icon} className="size-3.5" />
                                        </span>
                                        <span className="truncate text-foreground/70">
                                          {sub.name}
                                        </span>
                                        <span className="ml-auto shrink-0 text-xs tabular-nums">
                                          <span
                                            className={
                                              subExceeded
                                                ? "text-red-600 font-semibold"
                                                : "text-emerald-700 dark:text-emerald-500 font-medium"
                                            }
                                          >
                                            {formatCompact(subSpent, currency)}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {" / "}
                                            {formatCompact(subAllocated, currency)}
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
                                        className="flex size-5 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 hover:bg-muted hover:text-foreground focus:opacity-100"
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
          className="w-full justify-start gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onAddBudget}
        >
          <Plus className="size-3.5" />
          {t("addBudget")}
        </Button>
      </div>

      {/* User footer */}
      <Separator />
      <div className="flex items-center justify-between px-4 py-3.5">
        <UserFooterLink />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
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
          summary?.sections
            .find((c) => c.section.id === editingSection.id)
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
        const parentSectionSummary = summary?.sections.find(
          (c) => c.section.id === editingCategory.sectionId
        );
        const parentSection: Section = parentSectionSummary?.section ?? {
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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
