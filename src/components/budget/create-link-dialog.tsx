"use client";

import { useState, useEffect } from "react";
import { Loader2, Link2, ChevronRight, Check } from "lucide-react";
import type { LinkableBudget, Section, Category } from "@/types/budget";
import { linkApi } from "@/lib/api";
import { useBudgetStore } from "@/store/budget-store";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateLinkDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "budget" | "section" | "filter";

export function CreateLinkDialog({
  budgetId,
  open,
  onOpenChange,
}: CreateLinkDialogProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const createLink = useBudgetStore((s) => s.createLink);

  const [step, setStep] = useState<Step>("budget");
  const [linkableBudgets, setLinkableBudgets] = useState<LinkableBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected values
  const [selectedBudget, setSelectedBudget] = useState<LinkableBudget | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section & { categories: Category[] } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("budget");
      setSelectedBudget(null);
      setSelectedSection(null);
      setSelectedCategory(null);
      setFilterMode("all");
      setError(null);
      setSubmitting(false);
      setLoading(true);
      linkApi
        .linkableBudgets(budgetId)
        .then(setLinkableBudgets)
        .catch(() => setLinkableBudgets([]))
        .finally(() => setLoading(false));
    }
  }, [open, budgetId]);

  const handleSelectBudget = (b: LinkableBudget) => {
    setSelectedBudget(b);
    setSelectedSection(null);
    setSelectedCategory(null);
    setStep("section");
  };

  const handleSelectSection = (sec: Section & { categories: Category[] }, cat?: Category) => {
    setSelectedSection(sec);
    setSelectedCategory(cat || null);
    setStep("filter");
  };

  const handleCreate = async () => {
    if (!selectedBudget || !selectedSection) return;
    setSubmitting(true);
    setError(null);
    try {
      await createLink({
        source_budget_id: selectedBudget.id,
        source_section_id: selectedSection.id,
        ...(selectedCategory ? { source_category_id: selectedCategory.id } : {}),
        filter_mode: filterMode,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
      setSubmitting(false);
    }
  };

  const stepTitle = step === "budget"
    ? t("pickBudget")
    : step === "section"
      ? t("pickSection")
      : t("filterMode");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" />
            {t("linkSection")}
          </DialogTitle>
          <DialogDescription>{stepTitle}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : step === "budget" ? (
          <div className="space-y-2">
            {linkableBudgets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("noBudgetsAvailable")}
              </p>
            ) : (
              linkableBudgets.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBudget(b)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left border-2 border-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.currency} &middot; {formatCurrency(b.monthly_income, b.currency)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
              ))
            )}
          </div>
        ) : step === "section" && selectedBudget ? (
          <div className="space-y-2">
            {selectedBudget.sections.map((sec) => (
              <div key={sec.id} className="border-2 border-foreground">
                {/* Whole section option */}
                <button
                  type="button"
                  onClick={() => handleSelectSection(sec)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground hover:text-background"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon iconKey={sec.icon} className="size-5" />
                    <div>
                      <p className="font-semibold">{sec.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("entireSection")} &middot; {sec.categories.length}{" "}
                        {sec.categories.length === 1 ? "category" : "categories"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
                {/* Individual categories */}
                {sec.categories.length > 0 && (
                  <div className="border-t border-foreground/10">
                    {sec.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectSection(sec, cat)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 pl-10 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon iconKey={cat.icon} className="size-4" />
                          <span>{cat.name}</span>
                        </div>
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : step === "filter" ? (
          <div className="space-y-4">
            {/* Summary of what's being linked */}
            <div className="bg-muted/50 px-4 py-3 text-sm">
              <p className="font-medium">
                {selectedBudget?.name} &rarr; {selectedSection?.name}
                {selectedCategory ? ` / ${selectedCategory.name}` : ""}
              </p>
            </div>

            {/* Filter mode selection */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left border-2 transition-colors",
                  filterMode === "all"
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/30 hover:border-foreground"
                )}
              >
                <div className={cn(
                  "flex size-5 items-center justify-center border-2",
                  filterMode === "all" ? "border-background" : "border-foreground"
                )}>
                  {filterMode === "all" && <Check className="size-3" />}
                </div>
                <div>
                  <p className="font-semibold">{t("filterAll")}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("mine")}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left border-2 transition-colors",
                  filterMode === "mine"
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/30 hover:border-foreground"
                )}
              >
                <div className={cn(
                  "flex size-5 items-center justify-center border-2",
                  filterMode === "mine" ? "border-background" : "border-foreground"
                )}>
                  {filterMode === "mine" && <Check className="size-3" />}
                </div>
                <div>
                  <p className="font-semibold">{t("filterMine")}</p>
                </div>
              </button>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {submitting ? t("creating") : t("createLink")}
              </Button>
              <DialogClose render={<Button variant="outline" />}>
                {tc("cancel")}
              </DialogClose>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
