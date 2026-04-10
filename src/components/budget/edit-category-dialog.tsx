"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, Trash2, ChevronDown, ChevronRight } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";
import { formatAmount, parseAmount, maskAmountInput } from "@/lib/amount-utils";

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
import type { Section, Category } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
  icon: z.string().min(1, "Pick an icon"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parent impact preview — shown when category allocation changes
// ---------------------------------------------------------------------------

interface CategoryImpactPreviewProps {
  parentSection: Section;
  siblingCategories: Category[];
  currentCategoryId: string;
  newAllocationPercent: number;
  originalAllocationPercent: number;
}

function CategoryImpactPreview({
  parentSection,
  siblingCategories,
  currentCategoryId,
  newAllocationPercent,
  originalAllocationPercent,
}: CategoryImpactPreviewProps) {
  const t = useTranslations("section");
  const [expanded, setExpanded] = React.useState(true);

  // siblings = all categories except the one being edited
  const siblings = siblingCategories.filter((s) => s.id !== currentCategoryId);
  const siblingsTotal = siblings.reduce((sum, s) => sum + s.allocation_percent, 0);
  const newTotal = siblingsTotal + newAllocationPercent;
  const parentAlloc = parentSection.allocation_percent;
  const isOverflow = newTotal > parentAlloc;

  const direction = newAllocationPercent > originalAllocationPercent ? "increase" : "decrease";

  return (
    <div
      className={cn(
        "rounded-none border-2 px-3 py-2 text-xs space-y-1.5",
        isOverflow
          ? "border-destructive bg-destructive/5"
          : "border-amber-400 bg-amber-50/60 dark:bg-amber-900/10"
      )}
    >
      {/* Header row — clickable to collapse */}
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
        <>
          {/* Parent summary */}
          <p
            className={cn(
              "font-medium",
              isOverflow ? "text-destructive" : "text-amber-700 dark:text-amber-400"
            )}
          >
            {`Parent category "${parentSection.name}" total would ${direction}: `}
            <span className="tabular-nums">
              {originalAllocationPercent !== newAllocationPercent
                ? `${(siblingsTotal + originalAllocationPercent).toFixed(1)}% → ${newTotal.toFixed(1)}%`
                : `${newTotal.toFixed(1)}%`}
            </span>
            {isOverflow && (
              <span className="ml-1">{`(category budget: ${parentAlloc.toFixed(1)}%)`}</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditCategoryDialogProps {
  sectionId: string;
  category: Category;
  parentSection: Section;
  siblingCategories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function EditCategoryDialog({
  sectionId,
  category,
  parentSection,
  siblingCategories,
  open,
  onOpenChange,
}: EditCategoryDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const deleteCategoryAction = useBudgetStore((s) => s.deleteCategory);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);
  const currencySymbol = CURRENCIES.find((c) => c.code === summary?.budget.currency)?.symbol || "$";

  // Category allocation_percent is relative to the parent *section* allocation,
  // not the total budget. Find the section's allocated dollar amount.
  const sectionBudget = React.useMemo(() => {
    if (!summary) return 0;
    const sec = summary.sections.find((s) => s.section.id === sectionId);
    return sec?.allocated_amount ?? 0;
  }, [summary, sectionId]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Dollar amount state — managed independently from RHF
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
      allocation_percent: category.allocation_percent,
      icon: category.icon || "tag",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_percent");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    sectionBudget > 0 ? (rawAmount / sectionBudget) * 100 : 0;
  const percentOverBudget = rawAmount > sectionBudget && sectionBudget > 0;

  // Reset form and amount input when category changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: category.name,
        allocation_percent: category.allocation_percent,
        icon: category.icon || "tag",
      });

      // Convert stored percent to dollar amount
      const initialAmount =
        sectionBudget > 0
          ? (category.allocation_percent / 100) * sectionBudget
          : 0;
      setRawAmount(initialAmount);
      setAmountInput(formatAmount(initialAmount));

      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [open, category, reset, sectionBudget]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Keep RHF in sync
    const pct = sectionBudget > 0 ? (numericValue / sectionBudget) * 100 : 0;
    setValue("allocation_percent", Math.min(parseFloat(pct.toFixed(4)), 100), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateCategory(sectionId, category.id, {
        name: values.name,
        allocation_percent: values.allocation_percent,
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

  const handleDelete = async () => {
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteCategoryAction(sectionId, category.id);
      await refreshSummary();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show impact preview only when allocation has actually changed
  const allocationChanged =
    Math.abs(watchAllocation - category.allocation_percent) > 0.001;
  const showImpact = allocationChanged;

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
          {/* Name with icon button */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-name">{t("categoryName")}</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger
                  className="flex size-10 shrink-0 items-center justify-center border-2 border-foreground bg-background transition-colors hover:bg-muted"
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

          {/* Allocation — dollar amount with live % indicator */}
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
                  aria-invalid={!!errors.allocation_percent}
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
            {errors.allocation_percent && (
              <p className="text-xs text-destructive">
                {errors.allocation_percent.message}
              </p>
            )}
          </div>

          {/* Parent impact preview */}
          {showImpact && (
            <CategoryImpactPreview
              parentSection={parentSection}
              siblingCategories={siblingCategories}
              currentCategoryId={category.id}
              newAllocationPercent={watchAllocation}
              originalAllocationPercent={category.allocation_percent}
            />
          )}

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Delete */}
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4 mr-1" />
                {t("deleteCategory")}
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

            {/* Save */}
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
              {t("confirmDeleteCategory")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
