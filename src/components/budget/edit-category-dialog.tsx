"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, Trash2, ChevronDown, ChevronRight, Link2 } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { categoryApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";
import { formatAmount, parseAmount, maskAmountInput } from "@/lib/amount-utils";
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
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/i18n/client";
import type { Category, BudgetLink } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";

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
// Impact preview — shown when allocation changes vs. total monthly_income
// ---------------------------------------------------------------------------

interface CategoryImpactPreviewProps {
  monthlyIncome: number;
  otherCategoriesTotal: number;
  newAllocationValue: number;
  originalAllocationValue: number;
  currency: string;
}

function CategoryImpactPreview({
  monthlyIncome,
  otherCategoriesTotal,
  newAllocationValue,
  originalAllocationValue,
  currency,
}: CategoryImpactPreviewProps) {
  const t = useTranslations("category");
  const [expanded, setExpanded] = React.useState(true);

  const newTotal = otherCategoriesTotal + newAllocationValue;
  const isOverflow = newTotal > monthlyIncome;
  const direction = newAllocationValue > originalAllocationValue ? "increase" : "decrease";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs space-y-1.5",
        isOverflow
          ? "border-destructive bg-destructive/5"
          : "border-amber-400 bg-amber-50/60 dark:bg-amber-900/10"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between gap-1 font-medium"
      >
        <span
          className={cn(
            isOverflow ? "text-destructive" : "text-amber-700 dark:text-amber-400"
          )}
        >
          {t("impactPreview")}
        </span>
        {expanded ? (
          <ChevronDown className="size-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <p
          className={cn(
            "font-medium",
            isOverflow ? "text-destructive" : "text-amber-700 dark:text-amber-400"
          )}
        >
          {`Budget total would ${direction}: `}
          <span className="tabular-nums">
            {originalAllocationValue !== newAllocationValue
              ? `${formatCurrency(otherCategoriesTotal + originalAllocationValue, currency)} → ${formatCurrency(newTotal, currency)}`
              : formatCurrency(newTotal, currency)}
          </span>
          {isOverflow && (
            <span className="ml-1">{`(income: ${formatCurrency(monthlyIncome, currency)})`}</span>
          )}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog manages a linked category instead of an owned one. */
  link?: BudgetLink;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  link,
}: EditCategoryDialogProps) {
  const t = useTranslations("category");
  const tc = useTranslations("common");
  const tl = useTranslations("links");
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const deleteCategoryAction = useBudgetStore((s) => s.deleteCategory);
  const updateLink = useBudgetStore((s) => s.updateLink);
  const deleteLink = useBudgetStore((s) => s.deleteLink);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);
  const currencyInfo = CURRENCIES.find((c) => c.code === summary?.budget.currency);
  const currencySymbol = currencyInfo?.symbol || "$";
  const currencyLocale = currencyInfo?.locale || "en-US";
  const currency = summary?.budget.currency ?? "USD";
  const isLinked = !!link;

  // Allocation is now checked against monthly_income (no section parent).
  const monthlyIncome = summary?.budget.monthly_income ?? 0;

  // Sum of other own categories' allocations (for overflow preview).
  const otherCategoriesTotal = React.useMemo(() => {
    if (!summary) return 0;
    let total = 0;
    for (const c of summary.categories) {
      if (c.category.id !== category.id) {
        total += c.category.allocation_value;
      }
    }
    return total;
  }, [summary, category.id]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<"all" | "mine">(link?.filter_mode ?? "all");

  const [amountInput, setAmountInput] = React.useState<string>("");
  const [rawAmount, setRawAmount] = React.useState<number>(0);

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
      name: category.name,
      allocation_value: category.allocation_value,
      icon: category.icon || "tag",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_value");

  const computedPercent =
    monthlyIncome > 0 ? (rawAmount / monthlyIncome) * 100 : 0;
  const percentOverBudget = rawAmount > monthlyIncome && monthlyIncome > 0;

  React.useEffect(() => {
    if (open) {
      reset({
        name: category.name,
        allocation_value: category.allocation_value,
        icon: category.icon || "tag",
      });

      setRawAmount(category.allocation_value);
      setAmountInput(formatAmount(category.allocation_value, currencyLocale));

      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
      setFilterMode(link?.filter_mode ?? "all");
    }
  }, [open, category, reset, monthlyIncome, link, currencyLocale]);

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
    setIsSubmitting(true);
    try {
      const catPayload = {
        name: values.name,
        allocation_value: values.allocation_value,
        icon: values.icon,
      };

      if (isLinked && link) {
        // Update the category in the source budget (we don't own it).
        await categoryApi.update(
          link.source_budget_id,
          category.id,
          catPayload
        );
        if (filterMode !== link.filter_mode) {
          await updateLink(link.id, { filter_mode: filterMode });
        }
      } else {
        await updateCategory(category.id, catPayload);
      }

      await refreshSummary();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitError(null);
    setIsDeleting(true);
    try {
      if (isLinked && link) {
        await deleteLink(link.id);
      } else {
        await deleteCategoryAction(category.id);
      }
      await refreshSummary();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const allocationChanged =
    Math.abs(watchAllocation - category.allocation_value) > 0.001;
  const showImpact = allocationChanged && !isLinked;

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editCategory")}</DialogTitle>
          <DialogDescription>
            {t("editCategoryDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-name">{t("categoryName")}</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
                  aria-label={t("icon")}
                >
                  <CategoryIcon iconKey={watchIcon} className="size-5" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <IconPicker
                    value={watchIcon}
                    onChange={(iconKey) => setValue("icon", iconKey)}
                  />
                </PopoverContent>
              </Popover>
              <Input
                id="edit-sub-name"
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

          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-allocation">{t("allocationPercent")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  {currencySymbol}
                </span>
                <Input
                  id="edit-sub-allocation"
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

          {/* Impact preview — own categories only */}
          {showImpact && (
            <CategoryImpactPreview
              monthlyIncome={monthlyIncome}
              otherCategoriesTotal={otherCategoriesTotal}
              newAllocationValue={watchAllocation}
              originalAllocationValue={category.allocation_value}
              currency={currency}
            />
          )}

          {/* Filter mode — linked categories only */}
          {isLinked && (
            <div className="space-y-2">
              <Label>{tl("filterMode")}</Label>
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
                <span className="text-sm font-semibold">{tl("filterAll")}</span>
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
                <span className="text-sm font-semibold">{tl("filterMine")}</span>
              </button>
            </div>
          )}

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isLinked ? <Link2 className="size-4 mr-1" /> : <Trash2 className="size-4 mr-1" />}
                {isLinked ? tl("removeLink") : t("deleteCategory")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" />
                      {t("deleting")}
                    </>
                  ) : (
                    tc("confirm")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {tc("cancel")}
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1" />
                  {tc("save")}
                </>
              )}
            </Button>
          </div>

          {showDeleteConfirm && (
            <p className="text-xs text-destructive">
              {isLinked ? tl("removeLinkConfirm") : t("confirmDeleteCategory")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
