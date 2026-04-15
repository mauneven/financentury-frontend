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
import type { Section, Category, BudgetLink } from "@/types/budget";
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

// ---------------------------------------------------------------------------
// Parent impact preview — shown when category allocation changes
// ---------------------------------------------------------------------------

interface CategoryImpactPreviewProps {
  parentSection: Section;
  siblingCategories: Category[];
  currentCategoryId: string;
  newAllocationValue: number;
  originalAllocationValue: number;
}

function CategoryImpactPreview({
  parentSection,
  siblingCategories,
  currentCategoryId,
  newAllocationValue,
  originalAllocationValue,
}: CategoryImpactPreviewProps) {
  const t = useTranslations("section");
  const [expanded, setExpanded] = React.useState(true);

  // siblings = all categories except the one being edited
  const siblings = siblingCategories.filter((s) => s.id !== currentCategoryId);
  const siblingsTotal = siblings.reduce((sum, s) => sum + s.allocation_value, 0);
  const newTotal = siblingsTotal + newAllocationValue;
  const parentAlloc = parentSection.allocation_value;
  const isOverflow = newTotal > parentAlloc;

  const direction = newAllocationValue > originalAllocationValue ? "increase" : "decrease";

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
            {`"${parentSection.name}" total would ${direction}: `}
            <span className="tabular-nums">
              {originalAllocationValue !== newAllocationValue
                ? `${formatAmount(siblingsTotal + originalAllocationValue)} → ${formatAmount(newTotal)}`
                : formatAmount(newTotal)}
            </span>
            {isOverflow && (
              <span className="ml-1">{`(section budget: ${formatAmount(parentAlloc)})`}</span>
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
  parentSection?: Section;
  siblingCategories?: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog manages a linked category instead of an owned one. */
  link?: BudgetLink;
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
  link,
}: EditCategoryDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const tl = useTranslations("links");
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const deleteCategoryAction = useBudgetStore((s) => s.deleteCategory);
  const updateLink = useBudgetStore((s) => s.updateLink);
  const deleteLink = useBudgetStore((s) => s.deleteLink);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);
  const currencySymbol = CURRENCIES.find((c) => c.code === summary?.budget.currency)?.symbol || "$";
  const isLinked = !!link;

  // Category allocation_value is relative to the parent *section* allocation,
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
  const [filterMode, setFilterMode] = React.useState<"all" | "mine">(link?.filter_mode ?? "all");

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
      allocation_value: category.allocation_value,
      icon: category.icon || "tag",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_value");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    sectionBudget > 0 ? (rawAmount / sectionBudget) * 100 : 0;
  const percentOverBudget = rawAmount > sectionBudget && sectionBudget > 0;

  // Reset form and amount input when category changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: category.name,
        allocation_value: category.allocation_value,
        icon: category.icon || "tag",
      });

      // allocation_value is already an absolute amount
      setRawAmount(category.allocation_value);
      setAmountInput(formatAmount(category.allocation_value));

      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
      setFilterMode(link?.filter_mode ?? "all");
    }
  }, [open, category, reset, sectionBudget, link]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Store absolute amount — backend expects the raw value, not a percentage.
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
        // Update category in the source budget
        await categoryApi.update(
          link.source_budget_id,
          link.source_section_id,
          category.id,
          catPayload
        );
        // Update filter mode if changed
        if (filterMode !== link.filter_mode) {
          await updateLink(link.id, { filter_mode: filterMode });
        }
      } else {
        await updateCategory(sectionId, category.id, catPayload);
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
        await deleteCategoryAction(sectionId, category.id);
      }
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
    Math.abs(watchAllocation - category.allocation_value) > 0.001;
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

          {/* Parent impact preview — own categories only */}
          {showImpact && parentSection && siblingCategories && (
            <CategoryImpactPreview
              parentSection={parentSection}
              siblingCategories={siblingCategories}
              currentCategoryId={category.id}
              newAllocationValue={watchAllocation}
              originalAllocationValue={category.allocation_value}
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
                <span className="text-sm font-semibold">{tl("filterAll")}</span>
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
                <span className="text-sm font-semibold">{tl("filterMine")}</span>
              </button>
            </div>
          )}

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Delete / Remove Link */}
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
              {isLinked ? tl("removeLinkConfirm") : t("confirmDeleteCategory")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
