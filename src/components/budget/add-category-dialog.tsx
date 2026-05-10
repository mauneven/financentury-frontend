"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronRight, Link2,Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useBudgetSummary,
  useCreateCategory,
  useCreateLink,
} from "@/hooks/use-budget-queries";
import { useTranslations } from "@/i18n/client";
import { formatAmount, maskAmountInput, parseAmount, pickRandomIcon } from "@/lib/amount-utils";
import { linkApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon, IconPicker } from "@/lib/icon-picker";
import { cn } from "@/lib/utils";
import { useActiveBudgetStore } from "@/store/active-budget-store";
import type { Category, LinkableBudget } from "@/types/budget";
import { CURRENCIES, MAX_CATEGORIES_PER_BUDGET } from "@/types/budget";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_value: z
    .number({ message: "Allocation is required" })
    .positive("Amount must be greater than 0")
    .max(1e15, "Amount exceeds maximum"),
  icon: z.string().min(1, "Pick an icon"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillAmount?: number;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

type DialogMode = "create" | "link";
type LinkStep = "budget" | "category" | "filter";

export function AddCategoryDialog({
  open,
  onOpenChange,
  prefillAmount,
}: AddCategoryDialogProps) {
  const t = useTranslations("category");
  const tl = useTranslations("links");
  const activeBudgetId = useActiveBudgetStore((s) => s.activeBudgetId);
  const { data: summary } = useBudgetSummary(activeBudgetId ?? undefined);
  const addCategoryMut = useCreateCategory(activeBudgetId ?? "");
  const createLinkMut = useCreateLink(activeBudgetId ?? "");
  const currencyInfo = CURRENCIES.find((c) => c.code === summary?.budget.currency);
  const currencySymbol = currencyInfo?.symbol || "$";
  const currencyLocale = currencyInfo?.locale || "en-US";

  // Allocation percent is now relative to monthly_income, not a parent section.
  const monthlyIncome = summary?.budget.monthly_income ?? 0;

  // Existing category icons — used to pick a distinct random icon for new entries.
  const existingCategoryIcons = React.useMemo(
    () => (summary?.categories ?? []).map((c) => c.category.icon),
    [summary]
  );

  // Count caps: own + linked
  const currentCount =
    (summary?.categories?.length ?? 0) + (summary?.linked_categories?.length ?? 0);
  const atCap = currentCount >= MAX_CATEGORIES_PER_BUDGET;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);

  // Dollar amount state
  const [amountInput, setAmountInput] = React.useState<string>("");
  const [rawAmount, setRawAmount] = React.useState<number>(0);

  // Link mode state
  const [mode, setMode] = React.useState<DialogMode>("create");
  const [linkStep, setLinkStep] = React.useState<LinkStep>("budget");
  const [linkableBudgets, setLinkableBudgets] = React.useState<LinkableBudget[] | null>(null);
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [selectedBudget, setSelectedBudget] = React.useState<LinkableBudget | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [filterMode, setFilterMode] = React.useState<"all" | "mine">("all");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      allocation_value: 0,
      icon: "tag",
    },
  });

  const watchIcon = watch("icon");

  const computedPercent =
    monthlyIncome > 0 ? (rawAmount / monthlyIncome) * 100 : 0;
  const percentOverBudget = rawAmount > monthlyIncome && monthlyIncome > 0;

  // On open: reset everything (no eager fetch)
  React.useEffect(() => {
    if (open) {
      const randomIcon = pickRandomIcon(existingCategoryIcons);
      if (prefillAmount && prefillAmount > 0) {
        reset({ name: "", allocation_value: prefillAmount, icon: randomIcon });
        setAmountInput(formatAmount(prefillAmount, currencyLocale));
        setRawAmount(prefillAmount);
      } else {
        reset({ name: "", allocation_value: 0, icon: randomIcon });
        setAmountInput("");
        setRawAmount(0);
      }
      setIsSubmitting(false);
      setMode("create");
      setLinkStep("budget");
      setSelectedBudget(null);
      setSelectedCategory(null);
      setFilterMode("all");
      setSubmitError(null);
      setLinkableBudgets(null);
      setLinkLoading(false);
    }
  }, [open, reset, existingCategoryIcons, prefillAmount, monthlyIncome, currencyLocale]);

  // Fetch linkable budgets lazily when entering link mode
  const enterLinkMode = () => {
    setMode("link");
    setLinkStep("budget");
    setSubmitError(null);

    if (linkableBudgets !== null) return; // already fetched

    const budgetId = summary?.budget.id;
    if (!budgetId) return;

    setLinkLoading(true);
    linkApi
      .linkableBudgets(budgetId)
      .then((data) => setLinkableBudgets(data))
      .catch(() => setLinkableBudgets([]))
      .finally(() => setLinkLoading(false));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value, currencyLocale);
    setAmountInput(masked);
    const parsed = parseAmount(masked, currencyLocale);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);
    setValue("allocation_value", numericValue, { shouldValidate: true });
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError(null);
    if (atCap) {
      setSubmitError(t("maxCategoriesReached", { max: String(MAX_CATEGORIES_PER_BUDGET) }));
      return;
    }
    setIsSubmitting(true);
    try {
      await addCategoryMut.mutateAsync({
        name: values.name,
        allocation_value: values.allocation_value,
        icon: values.icon,
      });
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Link flow handlers
  const handleSelectBudget = (b: LinkableBudget) => {
    setSelectedBudget(b);
    setSelectedCategory(null);
    setLinkStep("category");
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setLinkStep("filter");
  };

  const handleCreateLink = async () => {
    if (!selectedBudget || !selectedCategory) return;
    if (atCap) {
      setSubmitError(t("maxCategoriesReached", { max: String(MAX_CATEGORIES_PER_BUDGET) }));
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createLinkMut.mutateAsync({
        source_budget_id: selectedBudget.id,
        source_category_id: selectedCategory.id,
        filter_mode: filterMode,
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (linkStep === "filter") setLinkStep("category");
    else if (linkStep === "category") setLinkStep("budget");
    else setMode("create");
  };

  // ---------------------------------------------------------------------------
  // Link mode UI
  // ---------------------------------------------------------------------------

  const renderLinkMode = () => {
    // Loading
    if (linkLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // No compatible budgets
    if (linkableBudgets !== null && linkableBudgets.length === 0) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>
          <p className="py-6 text-center text-sm text-muted-foreground leading-relaxed">
            {t("noLinkableBudgetsCategory")}
          </p>
        </div>
      );
    }

    // Budget picker
    if (linkStep === "budget" && linkableBudgets) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>
          <p className="text-sm text-muted-foreground">{t("pickBudget")}</p>
          {linkableBudgets.map((b) => (
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
          ))}
        </div>
      );
    }

    // Category picker (directly from the linkable budget's flat category list)
    if (linkStep === "category" && selectedBudget) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>
          <p className="text-sm text-muted-foreground">{t("pickCategory")}</p>
          {selectedBudget.categories.map((cat) => (
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
          ))}
          {selectedBudget.categories.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noCategoriesInBudget")}
            </p>
          )}
        </div>
      );
    }

    // Filter mode
    if (linkStep === "filter" && selectedBudget && selectedCategory) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>

          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <p className="font-medium">
              {selectedBudget.name} &rarr; {selectedCategory.name}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{tl("filterMode")}</p>
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
              <span className="font-semibold">{tl("filterAll")}</span>
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
              <span className="font-semibold">{tl("filterMine")}</span>
            </button>
          </div>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleCreateLink}
              disabled={isSubmitting || atCap}
              className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  {t("linking")}
                </>
              ) : (
                <>
                  <Link2 className="size-4 mr-1" />
                  {tl("createLink")}
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "link" ? t("addCategoryFromBudget") : t("addCategory")}
          </DialogTitle>
          <DialogDescription>
            {mode === "link"
              ? (linkLoading ? "" : linkableBudgets && linkableBudgets.length > 0 ? t("pickBudget") : "")
              : t("addCategoryDescription")}
          </DialogDescription>
        </DialogHeader>

        {atCap && (
          <p className="text-xs text-destructive px-1">
            {t("maxCategoriesReached", { max: String(MAX_CATEGORIES_PER_BUDGET) })}
          </p>
        )}

        {mode === "link" ? (
          renderLinkMode()
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name with icon button */}
            <div className="space-y-1.5">
              <Label htmlFor="add-cat-name">{t("categoryName")}</Label>
              <div className="flex items-center gap-2">
                <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                  <PopoverTrigger
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
                    aria-label={t("icon")}
                  >
                    <CategoryIcon iconKey={watchIcon} className="size-5" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <IconPicker
                      value={watchIcon}
                      onChange={(iconKey) => {
                        setValue("icon", iconKey);
                        setIconPickerOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="add-cat-name"
                  placeholder={t("categoryName")}
                  autoFocus
                  aria-invalid={!!errors.name}
                  className="flex-1"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
              {errors.icon && (
                <p className="text-xs text-destructive">{errors.icon.message}</p>
              )}
            </div>

            {/* Allocation — now relative to monthly_income */}
            <div className="space-y-1.5">
              <Label htmlFor="add-cat-allocation">{t("allocationPercent")}</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                    {currencySymbol}
                  </span>
                  <Input
                    id="add-cat-allocation"
                    type="text"
                    inputMode="decimal"
                    className="pl-6"
                    value={amountInput}
                    onChange={handleAmountChange}
                    aria-invalid={!!errors.allocation_value}
                    placeholder="0"
                  />
                </div>
                <span
                  className={cn(
                    "text-sm shrink-0",
                    percentOverBudget
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  = {computedPercent.toFixed(1)}%
                </span>
              </div>
              {errors.allocation_value && (
                <p className="text-xs text-destructive">
                  {errors.allocation_value.message}
                </p>
              )}
            </div>

            {submitError && <p className="text-xs text-destructive">{submitError}</p>}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || atCap}
                className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-1" />
                    {t("addCategory")}
                  </>
                )}
              </Button>
            </div>

            {/* Always-visible link option */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={enterLinkMode}
                disabled={atCap}
                className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Link2 className="size-4" />
                {t("orLinkCategory")}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
