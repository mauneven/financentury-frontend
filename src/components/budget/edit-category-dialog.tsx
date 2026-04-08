"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, Trash2, ChevronDown, ChevronRight } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/i18n/client";
import type { Category, Subcategory } from "@/types/budget";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const subcategorySchema = z.object({
  name: z
    .string()
    .min(1, "Subcategory name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
  icon: z.string().min(1, "Pick an icon"),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a raw number as a comma-separated string (no currency symbol). */
function formatAmount(value: number): string {
  if (isNaN(value) || value === 0) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Parse a formatted string back to a number. Returns NaN if invalid. */
function parseAmount(formatted: string): number {
  const stripped = formatted.replace(/,/g, "");
  return parseFloat(stripped);
}

/** Handle keystrokes: strip non-numeric (except decimal), re-format. */
function maskAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const decPart = parts.length > 1 ? "." + parts[1].slice(0, 2) : "";

  if (intPart === "") return decPart ? "0" + decPart : "";

  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return formatted + decPart;
}

// ---------------------------------------------------------------------------
// Emoji picker (simple grid)
// ---------------------------------------------------------------------------

const EMOJI_OPTIONS = [
  "🏠", "🍽️", "🚗", "💡", "🎉", "🎬", "👕", "✈️",
  "🏦", "📈", "💰", "📚", "🏥", "🐾", "🎮", "🎵",
  "☕", "🛒", "💻", "📱", "🏋️", "🎨", "🔧", "🌱",
];

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md text-lg transition-all duration-150",
            "hover:bg-muted",
            value === emoji
              ? "bg-emerald-500/10 ring-2 ring-emerald-500/40"
              : "bg-transparent"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parent impact preview — shown when subcategory allocation changes
// ---------------------------------------------------------------------------

interface SubcategoryImpactPreviewProps {
  parentCategory: Category;
  siblingSubcategories: Subcategory[];
  currentSubcategoryId: string;
  newAllocationPercent: number;
  originalAllocationPercent: number;
}

function SubcategoryImpactPreview({
  parentCategory,
  siblingSubcategories,
  currentSubcategoryId,
  newAllocationPercent,
  originalAllocationPercent,
}: SubcategoryImpactPreviewProps) {
  const [expanded, setExpanded] = React.useState(true);

  // siblings = all subcategories except the one being edited
  const siblings = siblingSubcategories.filter((s) => s.id !== currentSubcategoryId);
  const siblingsTotal = siblings.reduce((sum, s) => sum + s.allocation_percent, 0);
  const newTotal = siblingsTotal + newAllocationPercent;
  const parentAlloc = parentCategory.allocation_percent;
  const isOverflow = newTotal > parentAlloc;

  const direction = newAllocationPercent > originalAllocationPercent ? "increase" : "decrease";

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-xs space-y-1.5",
        isOverflow
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/10"
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
          Impact preview
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
            {`Parent category "${parentCategory.icon ? parentCategory.icon + " " : ""}${parentCategory.name}" total would ${direction}: `}
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

interface EditSubcategoryDialogProps {
  categoryId: string;
  subcategory: Subcategory;
  parentCategory: Category;
  siblingSubcategories: Subcategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function EditSubcategoryDialog({
  categoryId,
  subcategory,
  parentCategory,
  siblingSubcategories,
  open,
  onOpenChange,
}: EditSubcategoryDialogProps) {
  const t = useTranslations("category");
  const tc = useTranslations("common");
  const updateSubcategory = useBudgetStore((s) => s.updateSubcategory);
  const deleteSubcategoryAction = useBudgetStore((s) => s.deleteSubcategory);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);

  const totalBudget = summary?.total_budget ?? 0;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

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
  } = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: subcategory.name,
      allocation_percent: subcategory.allocation_percent,
      icon: subcategory.icon || "📌",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_percent");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    totalBudget > 0 ? (rawAmount / totalBudget) * 100 : 0;
  const percentOverBudget = rawAmount > totalBudget && totalBudget > 0;

  // Reset form and amount input when subcategory changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: subcategory.name,
        allocation_percent: subcategory.allocation_percent,
        icon: subcategory.icon || "📌",
      });

      // Convert stored percent to dollar amount
      const initialAmount =
        totalBudget > 0
          ? (subcategory.allocation_percent / 100) * totalBudget
          : 0;
      setRawAmount(initialAmount);
      setAmountInput(formatAmount(initialAmount));

      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [open, subcategory, reset, totalBudget]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Keep RHF in sync
    const pct = totalBudget > 0 ? (numericValue / totalBudget) * 100 : 0;
    setValue("allocation_percent", Math.min(parseFloat(pct.toFixed(4)), 100), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: SubcategoryFormValues) => {
    setIsSubmitting(true);
    try {
      await updateSubcategory(categoryId, subcategory.id, {
        name: values.name,
        allocation_percent: values.allocation_percent,
        icon: values.icon,
      });
      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSubcategoryAction(categoryId, subcategory.id);
      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsDeleting(false);
    }
  };

  // Show impact preview only when allocation has actually changed
  const allocationChanged =
    Math.abs(watchAllocation - subcategory.allocation_percent) > 0.001;
  const showImpact = allocationChanged;

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editSubcategory")}</DialogTitle>
          <DialogDescription>
            {t("editSubcategoryDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label>{t("icon")}</Label>
            <EmojiPicker
              value={watchIcon}
              onChange={(emoji) => setValue("icon", emoji)}
            />
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-name">{t("subcategoryName")}</Label>
            <Input
              id="edit-sub-name"
              placeholder={t("subcategoryName")}
              autoFocus
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Allocation — dollar amount with live % indicator */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-allocation">{t("allocationPercent")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  $
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
            <SubcategoryImpactPreview
              parentCategory={parentCategory}
              siblingSubcategories={siblingSubcategories}
              currentSubcategoryId={subcategory.id}
              newAllocationPercent={watchAllocation}
              originalAllocationPercent={subcategory.allocation_percent}
            />
          )}

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
                {t("deleteSubcategory")}
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
              {t("confirmDeleteSubcategory")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
