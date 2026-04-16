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

const sectionSchema = z.object({
  name: z
    .string()
    .min(1, "Section name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_value: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(1e15, "Amount exceeds maximum"),
  icon: z.string().min(1, "Pick an icon"),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// Impact preview — shown when category allocation changes
// ---------------------------------------------------------------------------

interface SectionImpactPreviewProps {
  categories: Category[];
  newSectionValue: number;
  currency: string;
}

function SectionImpactPreview({
  categories,
  newSectionValue,
  currency,
}: SectionImpactPreviewProps) {
  const t = useTranslations("section");
  const [expanded, setExpanded] = React.useState(true);

  if (categories.length === 0) return null;

  const childTotal = categories.reduce(
    (sum, s) => sum + s.allocation_value,
    0
  );
  const isOverflow = childTotal > newSectionValue;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs space-y-1.5",
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
          {/* Summary line */}
          <p
            className={cn(
              isOverflow ? "text-destructive font-medium" : "text-amber-700 dark:text-amber-400"
            )}
          >
            {isOverflow
              ? `Categories total ${formatAmount(childTotal)} but section is only ${formatAmount(newSectionValue)}`
              : `Categories total ${formatAmount(childTotal)} of ${formatAmount(newSectionValue)} allocated`}
          </p>

          {/* Per-category rows */}
          <ul className="space-y-0.5 pl-1">
            {categories.map((sub) => {
              const overflow = sub.allocation_value > newSectionValue;
              return (
                <li
                  key={sub.id}
                  className={cn(
                    "flex items-center justify-between",
                    overflow ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-1">
                    {sub.icon && (
                      <CategoryIcon iconKey={sub.icon} className="size-3" />
                    )}
                    {sub.name}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      overflow ? "text-destructive" : ""
                    )}
                  >
                    {formatAmount(sub.allocation_value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditSectionDialogProps {
  section: Section;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function EditSectionDialog({
  section,
  categories,
  open,
  onOpenChange,
}: EditSectionDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const updateSection = useBudgetStore((s) => s.updateSection);
  const deleteSectionAction = useBudgetStore((s) => s.deleteSection);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);

  // Use the actual monthly income for $ ↔ % conversion.
  const totalBudget = summary?.budget.monthly_income ?? 0;
  const currencySymbol = CURRENCIES.find((c) => c.code === summary?.budget.currency)?.symbol || "$";

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
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      name: section.name,
      allocation_value: section.allocation_value,
      icon: section.icon || "home",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_value");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    totalBudget > 0 ? (rawAmount / totalBudget) * 100 : 0;
  const percentOverBudget = rawAmount > totalBudget && totalBudget > 0;

  // Reset form and amount input when category changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: section.name,
        allocation_value: section.allocation_value,
        icon: section.icon || "home",
      });

      // allocation_value is already an absolute amount
      setRawAmount(section.allocation_value);
      setAmountInput(formatAmount(section.allocation_value));

      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [open, section, reset, totalBudget]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Store absolute amount — backend expects the raw value, not a percentage.
    setValue("allocation_value", numericValue, { shouldValidate: true });
  };

  const onSubmit = async (values: SectionFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateSection(section.id, {
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

  const handleDelete = async () => {
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteSectionAction(section.id);
      await refreshSummary();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show impact preview only when allocation has changed from the original
  const allocationChanged =
    Math.abs(watchAllocation - section.allocation_value) > 0.001;
  const showImpact = allocationChanged && categories.length > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editSection")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name with icon button */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-cat-name">{t("sectionName")}</Label>
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
                id="edit-cat-name"
                placeholder={t("sectionNamePlaceholder")}
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
            <Label htmlFor="edit-cat-allocation">{t("allocationPercent")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  {currencySymbol}
                </span>
                <Input
                  id="edit-cat-allocation"
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

          {/* Impact preview */}
          {showImpact && (
            <SectionImpactPreview
              categories={categories}
              newSectionValue={watchAllocation}
              currency={summary?.budget.currency ?? "USD"}
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
                {t("deleteSection")}
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
              {t("confirmDeleteSection")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
