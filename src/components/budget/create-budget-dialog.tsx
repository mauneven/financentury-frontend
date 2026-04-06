"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  PenLine,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

import type { Budget } from "@/types/budget";
import { CURRENCIES, BILLING_PERIODS, GUIDED_CATEGORIES } from "@/types/budget";
import { detectCurrency, formatCurrency } from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
import { categoryApi, subcategoryApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const budgetFormSchema = z.object({
  name: z
    .string()
    .min(1, "Budget name is required")
    .max(100, "Name must be 100 characters or less"),
  monthly_income: z
    .number({ message: "Income is required" })
    .positive("Income must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  billing_period_months: z.number().int().min(1).max(12),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (budget: Budget) => void;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-6 bg-emerald-500"
              : i + 1 < current
                ? "w-3 bg-emerald-500/50"
                : "w-3 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guided category editor
// ---------------------------------------------------------------------------

interface GuidedCategoryState {
  name: string;
  allocation_percent: number;
  icon: string;
  subcategories: {
    name: string;
    allocation_percent: number;
    icon: string;
  }[];
}

function GuidedCategoryReview({
  categories,
  onChange,
  income,
  currency,
}: {
  categories: GuidedCategoryState[];
  onChange: (updated: GuidedCategoryState[]) => void;
  income: number;
  currency: string;
}) {
  const t = useTranslations("budget");
  const totalPercent = categories.reduce(
    (acc, c) => acc + c.allocation_percent,
    0
  );

  const handleCategoryPercentChange = (index: number, value: number) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], allocation_percent: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("guidelinesNote")}
      </p>

      <div className="space-y-3">
        {categories.map((cat, catIdx) => (
          <div
            key={cat.name}
            className="rounded-lg border bg-card/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <span className="font-medium text-sm">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <InputGroup className="h-7 w-20">
                  <InputGroupInput
                    type="number"
                    min={0}
                    max={100}
                    value={cat.allocation_percent}
                    onChange={(e) =>
                      handleCategoryPercentChange(
                        catIdx,
                        Number(e.target.value) || 0
                      )
                    }
                    className="text-right text-xs h-7"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText className="text-xs">%</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <span className="text-xs text-muted-foreground w-20 text-right tabular-nums">
                  {formatCurrency(
                    (income * cat.allocation_percent) / 100,
                    currency
                  )}
                </span>
              </div>
            </div>

            <div className="pl-7 space-y-1">
              {cat.subcategories.map((sub) => (
                <div
                  key={sub.name}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{sub.icon}</span>
                    {sub.name}
                  </span>
                  <span className="tabular-nums">
                    {sub.allocation_percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("totalAllocation")}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            totalPercent === 100
              ? "text-emerald-600"
              : totalPercent > 100
                ? "text-red-600"
                : "text-amber-600"
          )}
        >
          {totalPercent}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function CreateBudgetDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBudgetDialogProps) {
  const router = useRouter();
  const createBudget = useBudgetStore((s) => s.createBudget);
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");

  // Step & mode state
  const [step, setStep] = React.useState(1);
  const [mode, setMode] = React.useState<"guided" | "manual" | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [customPeriod, setCustomPeriod] = React.useState(false);

  // Guided categories (mutable copy)
  const [guidedCategories, setGuidedCategories] = React.useState<
    GuidedCategoryState[]
  >(() =>
    GUIDED_CATEGORIES.map((c) => ({
      name: c.name,
      allocation_percent: c.allocation_percent,
      icon: c.icon,
      subcategories: c.subcategories.map((s) => ({
        name: s.name,
        allocation_percent: s.allocation_percent,
        icon: s.icon,
      })),
    }))
  );

  // Detect currency on mount
  const detectedCurrency = React.useMemo(() => {
    if (typeof window === "undefined") return "USD";
    return detectCurrency();
  }, []);

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      monthly_income: undefined as unknown as number,
      currency: detectedCurrency,
      billing_period_months: 1,
    },
  });

  const watchCurrency = watch("currency");
  const watchIncome = watch("monthly_income");

  // Total steps
  const totalSteps = mode === "guided" ? 3 : 2;

  // Currency symbol
  const currencyInfo = CURRENCIES.find((c) => c.code === watchCurrency);
  const currencySymbol = currencyInfo?.symbol || "$";

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Small delay so animation completes before resetting
      const timeout = setTimeout(() => {
        setStep(1);
        setMode(null);
        setIsSubmitting(false);
        setCustomPeriod(false);
        setGuidedCategories(
          GUIDED_CATEGORIES.map((c) => ({
            name: c.name,
            allocation_percent: c.allocation_percent,
            icon: c.icon,
            subcategories: c.subcategories.map((s) => ({
              name: s.name,
              allocation_percent: s.allocation_percent,
              icon: s.icon,
            })),
          }))
        );
        reset({
          name: "",
          monthly_income: undefined as unknown as number,
          currency: detectedCurrency,
          billing_period_months: 1,
        });
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset, detectedCurrency]);

  // Handlers
  const selectMode = (m: "guided" | "manual") => {
    setMode(m);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setMode(null);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const onSubmit = async (values: BudgetFormValues) => {
    if (!mode) return;

    // If guided mode and on step 2, go to review first
    if (mode === "guided" && step === 2) {
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const budget = await createBudget({
        ...values,
        mode,
      });

      // For guided mode, create the default categories and subcategories
      if (mode === "guided") {
        for (const cat of guidedCategories) {
          const created = await categoryApi.create(budget.id, {
            name: cat.name,
            allocation_percent: cat.allocation_percent,
            icon: cat.icon,
          });
          for (const sub of cat.subcategories) {
            await subcategoryApi.create(budget.id, created.id, {
              name: sub.name,
              allocation_percent: sub.allocation_percent,
              icon: sub.icon,
            });
          }
        }
      }

      onCreated?.(budget);
      onOpenChange(false);
      router.push(`/budget/${budget.id}`);
    } catch {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 1: Mode selection
  // ---------------------------------------------------------------------------

  const renderModeSelection = () => (
    <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Guided card */}
        <button
          type="button"
          onClick={() => selectMode("guided")}
          className={cn(
            "group relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200",
            "hover:border-emerald-500/70 hover:shadow-md",
            mode === "guided"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-border"
          )}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Sparkles className="size-5" />
          </div>
          <h3 className="font-medium text-sm mb-1">{t("guidedMode")}</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t("guidedDescription")}
          </p>
          <div className="w-full space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-emerald-500/20">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: "50%" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-20 tabular-nums">
                {tCat("necesidades")} 50%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-blue-500/20">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: "30%" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-20 tabular-nums">
                {tCat("deseos")} 30%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-amber-500/20">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: "20%" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-20 tabular-nums">
                {tCat("ahorro")} 20%
              </span>
            </div>
          </div>
        </button>

        {/* Manual card */}
        <button
          type="button"
          onClick={() => selectMode("manual")}
          className={cn(
            "group relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200",
            "hover:border-emerald-500/70 hover:shadow-md",
            mode === "manual"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-border"
          )}
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
            <PenLine className="size-5" />
          </div>
          <h3 className="font-medium text-sm mb-1">{t("manualMode")}</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t("manualDescription")}
          </p>
          <div className="flex h-[52px] w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
            <span className="text-[10px] text-muted-foreground">
              {t("customCategories")}
            </span>
          </div>
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2: Budget details
  // ---------------------------------------------------------------------------

  const renderBudgetForm = () => (
    <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="budget-name">{t("budgetName")}</Label>
        <Input
          id="budget-name"
          placeholder={t("budgetNamePlaceholder")}
          autoFocus
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Monthly income */}
      <div className="space-y-1.5">
        <Label htmlFor="budget-income">{t("monthlyIncome")}</Label>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>{currencySymbol}</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="budget-income"
            type="number"
            min={0}
            step="any"
            placeholder="0"
            aria-invalid={!!errors.monthly_income}
            {...register("monthly_income", { valueAsNumber: true })}
          />
        </InputGroup>
        {errors.monthly_income && (
          <p className="text-xs text-destructive">
            {errors.monthly_income.message}
          </p>
        )}
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label>{tc("currency")}</Label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(val) => field.onChange(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectCurrency")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.currency && (
          <p className="text-xs text-destructive">
            {errors.currency.message}
          </p>
        )}
      </div>

      {/* Billing period */}
      <div className="space-y-1.5">
        <Label>{t("billingPeriod")}</Label>
        <Controller
          name="billing_period_months"
          control={control}
          render={({ field }) => (
            <>
              <Select
                value={
                  customPeriod
                    ? "custom"
                    : String(field.value)
                }
                onValueChange={(val) => {
                  if (val === "custom") {
                    setCustomPeriod(true);
                    field.onChange(1);
                  } else {
                    setCustomPeriod(false);
                    field.onChange(Number(val));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectPeriod")} />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{tc("custom")}</SelectItem>
                </SelectContent>
              </Select>

              {customPeriod && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">{t("months")}</span>
                </div>
              )}
            </>
          )}
        />
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 3: Guided review
  // ---------------------------------------------------------------------------

  const renderGuidedReview = () => (
    <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <GuidedCategoryReview
        categories={guidedCategories}
        onChange={setGuidedCategories}
        income={watchIncome || 0}
        currency={watchCurrency || "USD"}
      />
    </div>
  );

  // ---------------------------------------------------------------------------
  // Navigation footer
  // ---------------------------------------------------------------------------

  const renderFooter = () => {
    if (step === 1) return null;

    const isLastStep =
      (mode === "manual" && step === 2) || (mode === "guided" && step === 3);

    return (
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="size-4 mr-1" />
          {tc("back")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" />
              {t("creating")}
            </>
          ) : isLastStep ? (
            <>
              <Check className="size-4 mr-1" />
              {t("createBudget")}
            </>
          ) : (
            <>
              {tc("continue")}
              <ArrowRight className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>
            {step === 1 && t("chooseSetup")}
            {step === 2 && t("enterDetails")}
            {step === 3 && t("reviewAllocations")}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={totalSteps} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && renderModeSelection()}
          {step === 2 && renderBudgetForm()}
          {step === 3 && mode === "guided" && renderGuidedReview()}
          {renderFooter()}
        </form>
      </DialogContent>
    </Dialog>
  );
}
