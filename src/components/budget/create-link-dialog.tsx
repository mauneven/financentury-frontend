"use client";

import { useState, useEffect } from "react";
import { Loader2, Link2, ChevronRight, Check } from "lucide-react";
import type { LinkableBudget, Category } from "@/types/budget";
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

type Step = "budget" | "category" | "filter";

export function CreateLinkDialog({
  budgetId,
  open,
  onOpenChange,
}: CreateLinkDialogProps) {
  // Mount the inner component only when open — state is reset per open.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CreateLinkDialogBody budgetId={budgetId} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  );
}

function CreateLinkDialogBody({
  budgetId,
  onOpenChange,
}: {
  budgetId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const createLink = useBudgetStore((s) => s.createLink);

  const [step, setStep] = useState<Step>("budget");
  const [linkableBudgets, setLinkableBudgets] = useState<LinkableBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected values
  const [selectedBudget, setSelectedBudget] = useState<LinkableBudget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");

  useEffect(() => {
    let cancelled = false;
    linkApi
      .linkableBudgets(budgetId)
      .then((res) => { if (!cancelled) setLinkableBudgets(res); })
      .catch(() => { if (!cancelled) setLinkableBudgets([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [budgetId]);

  const handleSelectBudget = (b: LinkableBudget) => {
    setSelectedBudget(b);
    setSelectedCategory(null);
    setStep("category");
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setStep("filter");
  };

  const handleCreate = async () => {
    if (!selectedBudget || !selectedCategory) return;
    setSubmitting(true);
    setError(null);
    try {
      await createLink({
        source_budget_id: selectedBudget.id,
        source_category_id: selectedCategory.id,
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
    : step === "category"
      ? t("pickCategory")
      : t("filterMode");

  return (
    <>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5" strokeWidth={1.8} />
            {t("linkCategory")}
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
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left border border-border transition-colors hover:bg-muted"
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
        ) : step === "category" && selectedBudget ? (
          <div className="space-y-2">
            {selectedBudget.categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("noCategoriesInBudget")}
              </p>
            ) : (
              selectedBudget.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left border border-border transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon iconKey={cat.icon} className="size-4" />
                    <span className="font-semibold">{cat.name}</span>
                  </div>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
              ))
            )}
          </div>
        ) : step === "filter" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <p className="font-medium">
                {selectedBudget?.name} &rarr; {selectedCategory?.name}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors",
                  filterMode === "all"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border hover:border-border"
                )}
              >
                <div className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  filterMode === "all" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
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
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors",
                  filterMode === "mine"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border hover:border-border"
                )}
              >
                <div className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  filterMode === "mine" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
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
    </>
  );
}
