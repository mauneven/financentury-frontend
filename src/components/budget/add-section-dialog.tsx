"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check } from "lucide-react";

import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon, ICON_OPTIONS } from "@/lib/icon-picker";

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

/** Parse a formatted string back to a number. */
function parseAmount(formatted: string): number {
  const stripped = formatted.replace(/,/g, "");
  return parseFloat(stripped);
}

/** Mask input to formatted money string. */
function maskAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const decPart = parts.length > 1 ? "." + parts[1].slice(0, 2) : "";
  if (intPart === "") return decPart ? "0" + decPart : "";
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return formatted + decPart;
}

/** Pick a random icon not already used by existing sections. */
function pickRandomIcon(usedIcons: string[]): string {
  const available = ICON_OPTIONS.filter((o) => !usedIcons.includes(o.key));
  const pool = available.length > 0 ? available : ICON_OPTIONS;
  return pool[Math.floor(Math.random() * pool.length)].key;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddSectionDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function AddSectionDialog({
  budgetId,
  open,
  onOpenChange,
}: AddSectionDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const addSection = useBudgetStore((s) => s.addSection);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const summary = useBudgetStore((s) => s.summary);
  const router = useRouter();

  // Use the actual monthly income for $ ↔ % conversion – total_budget
  // equals monthly_income but we reference the source of truth directly.
  const totalBudget = summary?.budget.monthly_income ?? 0;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);

  // Dollar amount state
  const [amountInput, setAmountInput] = React.useState<string>("");
  const [rawAmount, setRawAmount] = React.useState<number>(0);

  // Compute used icons from existing sections
  const usedIcons = React.useMemo(
    () => (summary?.sections ?? []).map((s) => s.section.icon),
    [summary]
  );

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
      name: "",
      allocation_percent: 0,
      icon: "tag",
    },
  });

  const watchIcon = watch("icon");

  // Compute displayed percentage from current rawAmount
  const computedPercent =
    totalBudget > 0 ? (rawAmount / totalBudget) * 100 : 0;
  const percentOverBudget = rawAmount > totalBudget && totalBudget > 0;

  // On open: pick a random icon and reset form
  React.useEffect(() => {
    if (open) {
      const randomIcon = pickRandomIcon(usedIcons);
      reset({ name: "", allocation_percent: 0, icon: randomIcon });
      setAmountInput("");
      setRawAmount(0);
      setIsSubmitting(false);
    }
  }, [open, reset, usedIcons]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskAmountInput(e.target.value);
    setAmountInput(masked);
    const parsed = parseAmount(masked);
    const numericValue = isNaN(parsed) ? 0 : parsed;
    setRawAmount(numericValue);

    // Keep RHF in sync — store as percent for the backend
    const pct = totalBudget > 0 ? (numericValue / totalBudget) * 100 : 0;
    setValue("allocation_percent", Math.min(parseFloat(pct.toFixed(4)), 100), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: SectionFormValues) => {
    setIsSubmitting(true);
    try {
      const section = await addSection({
        name: values.name,
        allocation_percent: values.allocation_percent,
        icon: values.icon,
      });

      await refreshSummary();
      onOpenChange(false);
      router.push(`/budget/${budgetId}/section/${section.id}/reports`);
    } catch {
      // error handling upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addSection")}</DialogTitle>
          <DialogDescription>
            {t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name with icon button */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">{t("sectionName")}</Label>
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
                id="cat-name"
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
            <Label htmlFor="cat-allocation">{t("allocationPercent")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                  $
                </span>
                <Input
                  id="cat-allocation"
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
                  {t("addSection")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
