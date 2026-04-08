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
import type { Section, Category } from "@/types/budget";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  name: z
    .string()
    .min(1, "Section name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
  icon: z.string().min(1, "Pick an icon"),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

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
  const num = parseFloat(stripped);
  return num;
}

/** Handle keystrokes: strip non-numeric (except decimal), re-format. */
function maskAmountInput(raw: string): string {
  // Allow digits and at most one decimal point
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, ""); // remove leading zeros
  const decPart = parts.length > 1 ? "." + parts[1].slice(0, 2) : "";

  if (intPart === "") return decPart ? "0" + decPart : "";

  // Add thousands separators to integer part
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
            "flex h-10 w-10 items-center justify-center rounded-none border-2 text-lg transition-all duration-150",
            "hover:bg-muted",
            value === emoji
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-transparent bg-transparent"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impact preview — shown when category allocation changes
// ---------------------------------------------------------------------------

interface SectionImpactPreviewProps {
  categories: Category[];
  newSectionPercent: number;
}

function SectionImpactPreview({
  categories,
  newSectionPercent,
}: SectionImpactPreviewProps) {
  const [expanded, setExpanded] = React.useState(true);

  if (categories.length === 0) return null;

  const childTotal = categories.reduce(
    (sum, s) => sum + s.allocation_percent,
    0
  );
  const isOverflow = childTotal > newSectionPercent;

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
          {/* Summary line */}
          <p
            className={cn(
              isOverflow ? "text-destructive font-medium" : "text-amber-700 dark:text-amber-400"
            )}
          >
            {isOverflow
              ? `Categories total ${childTotal.toFixed(1)}% but section is only ${newSectionPercent.toFixed(1)}%`
              : `Categories total ${childTotal.toFixed(1)}% of ${newSectionPercent.toFixed(1)}% allocated`}
          </p>

          {/* Per-category rows */}
          <ul className="space-y-0.5 pl-1">
            {categories.map((sub) => {
              const overflow = sub.allocation_percent > newSectionPercent;
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
                      <span className="text-[11px]">{sub.icon}</span>
                    )}
                    {sub.name}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      overflow ? "text-destructive" : ""
                    )}
                  >
                    {sub.allocation_percent}%
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
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      name: section.name,
      allocation_percent: section.allocation_percent,
      icon: section.icon || "🏠",
    },
  });

  const watchIcon = watch("icon");
  const watchAllocation = watch("allocation_percent");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    totalBudget > 0 ? (rawAmount / totalBudget) * 100 : 0;
  const percentOverBudget = rawAmount > totalBudget && totalBudget > 0;

  // Reset form and amount input when category changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: section.name,
        allocation_percent: section.allocation_percent,
        icon: section.icon || "🏠",
      });

      // Convert stored percent to dollar amount
      const initialAmount =
        totalBudget > 0 ? (section.allocation_percent / 100) * totalBudget : 0;
      setRawAmount(initialAmount);
      setAmountInput(formatAmount(initialAmount));

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

    // Keep RHF in sync
    const pct = totalBudget > 0 ? (numericValue / totalBudget) * 100 : 0;
    setValue("allocation_percent", Math.min(parseFloat(pct.toFixed(4)), 100), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: SectionFormValues) => {
    setIsSubmitting(true);
    try {
      await updateSection(section.id, {
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
      await deleteSectionAction(section.id);
      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsDeleting(false);
    }
  };

  // Show impact preview only when allocation has changed from the original
  const allocationChanged =
    Math.abs(watchAllocation - section.allocation_percent) > 0.001;
  const showImpact = allocationChanged && categories.length > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editSection")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
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
            <Label htmlFor="edit-cat-name">{t("sectionName")}</Label>
            <Input
              id="edit-cat-name"
              placeholder={t("sectionNamePlaceholder")}
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
            <Label htmlFor="edit-cat-allocation">{t("allocationPercent")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  $
                </span>
                <Input
                  id="edit-cat-allocation"
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

          {/* Impact preview */}
          {showImpact && (
            <SectionImpactPreview
              categories={categories}
              newSectionPercent={watchAllocation}
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
