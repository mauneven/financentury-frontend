"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";
import { CURRENCIES } from "@/types/budget";
import { formatAmount, parseAmount, maskAmountInput, pickRandomIcon } from "@/lib/amount-utils";

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
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
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
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function AddCategoryDialog({
  sectionId,
  existingCategoryIcons = [],
  open,
  onOpenChange,
}: AddCategoryDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const addCategory = useBudgetStore((s) => s.addCategory);
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
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);

  // Dollar amount state
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
      name: "",
      allocation_percent: 0,
      icon: "tag",
    },
  });

  const watchIcon = watch("icon");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    sectionBudget > 0 ? (rawAmount / sectionBudget) * 100 : 0;
  const percentOverBudget = rawAmount > sectionBudget && sectionBudget > 0;

  // On open: pick a random icon and reset form
  React.useEffect(() => {
    if (open) {
      const randomIcon = pickRandomIcon(existingCategoryIcons);
      reset({ name: "", allocation_percent: 0, icon: randomIcon });
      setAmountInput("");
      setRawAmount(0);
      setIsSubmitting(false);
    }
  }, [open, reset, existingCategoryIcons]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Keep RHF in sync — store as percent of section for the backend
    const pct = sectionBudget > 0 ? (numericValue / sectionBudget) * 100 : 0;
    setValue("allocation_percent", Math.min(parseFloat(pct.toFixed(4)), 100), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await addCategory(sectionId, {
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

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addCategory")}</DialogTitle>
          <DialogDescription>
            {t("addCategoryDescription")}
          </DialogDescription>
        </DialogHeader>

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

          {/* Allocation — dollar amount with live % indicator */}
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

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          {/* Submit */}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
