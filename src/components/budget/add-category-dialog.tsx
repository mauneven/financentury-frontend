"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, ChevronRight, ArrowLeft, Link2 } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";
import { CURRENCIES } from "@/types/budget";
import type { LinkableBudget, Section, Category } from "@/types/budget";
import { formatAmount, parseAmount, maskAmountInput, pickRandomIcon } from "@/lib/amount-utils";
import { linkApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/i18n/client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_value: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(1e15, "Amount exceeds maximum"),
  icon: z.string().min(1, "Pick an icon"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddCategoryDialogProps {
  sectionId: string;
  existingCategoryIcons?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillAmount?: number;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

type DialogMode = "create" | "link";
type LinkStep = "budget" | "section" | "category" | "filter";

export function AddCategoryDialog({
  sectionId,
  existingCategoryIcons = [],
  open,
  onOpenChange,
  prefillAmount,
}: AddCategoryDialogProps) {
  const t = useTranslations("section");
  const tl = useTranslations("links");
  const addCategory = useBudgetStore((s) => s.addCategory);
  const createLink = useBudgetStore((s) => s.createLink);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);
  const currencySymbol = CURRENCIES.find((c) => c.code === summary?.budget.currency)?.symbol || "$";

  const sectionBudget = React.useMemo(() => {
    if (!summary) return 0;
    const sec = summary.sections.find((s) => s.section.id === sectionId);
    return sec?.allocated_amount ?? 0;
  }, [summary, sectionId]);

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
  const [selectedSection, setSelectedSection] = React.useState<(Section & { categories: Category[] }) | null>(null);
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
    sectionBudget > 0 ? (rawAmount / sectionBudget) * 100 : 0;
  const percentOverBudget = rawAmount > sectionBudget && sectionBudget > 0;

  // On open: reset everything (no eager fetch)
  React.useEffect(() => {
    if (open) {
      const randomIcon = pickRandomIcon(existingCategoryIcons);
      if (prefillAmount && prefillAmount > 0) {
        reset({ name: "", allocation_value: prefillAmount, icon: randomIcon });
        setAmountInput(formatAmount(prefillAmount));
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
      setSelectedSection(null);
      setSelectedCategory(null);
      setFilterMode("all");
      setSubmitError(null);
      setLinkableBudgets(null);
      setLinkLoading(false);
    }
  }, [open, reset, existingCategoryIcons, prefillAmount, sectionBudget]);

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
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);
    setValue("allocation_value", numericValue, { shouldValidate: true });
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await addCategory(sectionId, {
        name: values.name,
        allocation_value: values.allocation_value,
        icon: values.icon,
      });

      await refreshSummary();
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
    setSelectedSection(null);
    setSelectedCategory(null);
    setLinkStep("section");
  };

  const handleSelectSection = (sec: Section & { categories: Category[] }) => {
    setSelectedSection(sec);
    setSelectedCategory(null);
    setLinkStep("category");
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setLinkStep("filter");
  };

  const handleCreateLink = async () => {
    if (!selectedBudget || !selectedSection || !selectedCategory) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createLink({
        source_budget_id: selectedBudget.id,
        source_section_id: selectedSection.id,
        source_category_id: selectedCategory.id,
        target_section_id: sectionId,
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
    else if (linkStep === "category") setLinkStep("section");
    else if (linkStep === "section") setLinkStep("budget");
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
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
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
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
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
          ))}
        </div>
      );
    }

    // Section picker
    if (linkStep === "section" && selectedBudget) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>
          <p className="text-sm text-muted-foreground">{t("pickSection")}</p>
          {selectedBudget.sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelectSection(sec)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left border-2 border-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex items-center gap-2">
                <CategoryIcon iconKey={sec.icon} className="size-5" />
                <div>
                  <p className="font-semibold">{sec.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sec.categories.length === 1
                      ? t("categorySummarySingular", { count: String(sec.categories.length) })
                      : t("categorySummary", { count: String(sec.categories.length) })}
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0" />
            </button>
          ))}
        </div>
      );
    }

    // Category picker
    if (linkStep === "category" && selectedBudget && selectedSection) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>
          <p className="text-sm text-muted-foreground">{t("pickCategory")}</p>
          {selectedSection.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left border-2 border-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex items-center gap-2">
                <CategoryIcon iconKey={cat.icon} className="size-4" />
                <span className="font-semibold">{cat.name}</span>
              </div>
              <ChevronRight className="size-4 shrink-0" />
            </button>
          ))}
          {selectedSection.categories.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("categorySummary", { count: "0" })}
            </p>
          )}
        </div>
      );
    }

    // Filter mode
    if (linkStep === "filter" && selectedBudget && selectedSection && selectedCategory) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("back")}
          </button>

          <div className="bg-muted/50 px-4 py-3 text-sm">
            <p className="font-medium">
              {selectedBudget.name} &rarr; {selectedSection.name} &rarr; {selectedCategory.name}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{tl("filterMode")}</p>
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
              <span className="font-semibold">{tl("filterAll")}</span>
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
              <span className="font-semibold">{tl("filterMine")}</span>
            </button>
          </div>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleCreateLink}
              disabled={isSubmitting}
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
                    className="flex size-10 shrink-0 items-center justify-center border-2 border-foreground bg-background transition-colors hover:bg-muted"
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

            {/* Allocation */}
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
                disabled={isSubmitting}
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
                className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
