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
import { CURRENCIES, BILLING_PERIODS, GUIDED_SECTIONS } from "@/types/budget";
import { detectCurrency, formatCurrency } from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
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
  billing_cutoff_day: z.number().int().min(1).max(31),
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
            "h-1.5 transition-all duration-300",
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
  categories: {
    name: string;
    allocation_percent: number;
    icon: string;
  }[];
}

function formatWithCommas(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function AmountInput({
  amount,
  onAmountChange,
  prefix = "$",
  className = "",
  inputClassName = "",
}: {
  amount: number;
  onAmountChange: (raw: string) => void;
  prefix?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [display, setDisplay] = React.useState(formatWithCommas(amount));
  const [focused, setFocused] = React.useState(false);

  // Sync from parent only when not focused (avoid overwriting user typing)
  React.useEffect(() => {
    if (!focused) {
      setDisplay(formatWithCommas(amount));
    }
  }, [amount, focused]);

  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">
        <InputGroupText className="text-xs">{prefix}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="decimal"
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDisplay(formatWithCommas(amount));
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplay(raw);
          onAmountChange(raw);
        }}
        className={inputClassName}
      />
    </InputGroup>
  );
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
  const totalAmount = (income * totalPercent) / 100;

  const handleSectionAmountChange = (index: number, amountStr: string) => {
    const amount = parseFloat(amountStr.replace(/[^\d.]/g, "")) || 0;
    const percent = income > 0 ? Math.round((amount / income) * 100) : 0;
    const updated = [...categories];
    updated[index] = { ...updated[index], allocation_percent: percent };
    onChange(updated);
  };

  const handleSubcategoryAmountChange = (catIdx: number, subIdx: number, amountStr: string) => {
    const amount = parseFloat(amountStr.replace(/[^\d.]/g, "")) || 0;
    const sectionAmount = (income * categories[catIdx].allocation_percent) / 100;
    const percent = sectionAmount > 0 ? Math.round((amount / sectionAmount) * 100) : 0;
    const updated = [...categories];
    const updatedSubs = [...updated[catIdx].categories];
    updatedSubs[subIdx] = { ...updatedSubs[subIdx], allocation_percent: percent };
    updated[catIdx] = { ...updated[catIdx], categories: updatedSubs };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("guidelinesNote")}
      </p>

      <div className="space-y-3">
        {categories.map((cat, catIdx) => {
          const sectionAmount = (income * cat.allocation_percent) / 100;
          return (
            <div
              key={cat.name}
              className="border-2 border-foreground bg-card/50 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryIcon iconKey={cat.icon} className="size-5" />
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AmountInput
                    amount={sectionAmount}
                    onAmountChange={(raw) => handleSectionAmountChange(catIdx, raw)}
                    className="h-7 w-32"
                    inputClassName="text-right text-xs h-7"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {cat.allocation_percent}%
                  </span>
                </div>
              </div>

              <div className="pl-7 space-y-1.5">
                {cat.categories.map((sub, subIdx) => {
                  const subAmount = (sectionAmount * sub.allocation_percent) / 100;
                  return (
                    <div
                      key={sub.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CategoryIcon iconKey={sub.icon} className="size-3.5" />
                        {sub.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <AmountInput
                          amount={subAmount}
                          onAmountChange={(raw) => handleSubcategoryAmountChange(catIdx, subIdx, raw)}
                          className="h-6 w-28"
                          inputClassName="text-right text-[11px] h-6"
                        />
                        <span className="text-muted-foreground w-8 text-right tabular-nums">
                          {sub.allocation_percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("totalAllocation")}</span>
        <div className="flex items-center gap-2">
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
            {formatCurrency(totalAmount, currency)}
          </span>
          <span
            className={cn(
              "text-xs tabular-nums",
              totalPercent === 100
                ? "text-emerald-600"
                : totalPercent > 100
                  ? "text-red-600"
                  : "text-amber-600"
            )}
          >
            ({totalPercent}%)
          </span>
        </div>
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
  const { mode: authMode } = useAuthStore();
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");

  // Step & mode state
  const [step, setStep] = React.useState(1);
  const [mode, setMode] = React.useState<"guided" | "manual" | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [customPeriod, setCustomPeriod] = React.useState(false);
  const [incomeDisplay, setIncomeDisplay] = React.useState("");

  // Guided categories (mutable copy)
  const [guidedCategories, setGuidedCategories] = React.useState<
    GuidedCategoryState[]
  >(() =>
    GUIDED_SECTIONS.map((c) => ({
      name: c.name,
      allocation_percent: c.allocation_percent,
      icon: c.icon,
      categories: c.categories.map((s) => ({
        name: s.name,
        allocation_percent: s.allocation_percent,
        icon: s.icon,
      })),
    }))
  );

  // Detect currency on mount
  const detectedCurrency = (() => {
    if (typeof window === "undefined") return "USD";
    return detectCurrency();
  })();

  // Currency input formatting
  const formatInputValue = (val: string) => {
    const nums = val.replace(/[^\d.]/g, "");
    const parts = nums.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      monthly_income: undefined as unknown as number,
      currency: detectedCurrency,
      billing_period_months: 1,
      billing_cutoff_day: 1,
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
        setCreateError(null);
        setCustomPeriod(false);
        setGuidedCategories(
          GUIDED_SECTIONS.map((c) => ({
            name: c.name,
            allocation_percent: c.allocation_percent,
            icon: c.icon,
            categories: c.categories.map((s) => ({
              name: s.name,
              allocation_percent: s.allocation_percent,
              icon: s.icon,
            })),
          }))
        );
        setIncomeDisplay("");
        reset({
          name: "",
          monthly_income: undefined as unknown as number,
          currency: detectedCurrency,
          billing_period_months: 1,
          billing_cutoff_day: 1,
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

      onCreated?.(budget);
      onOpenChange(false);
      router.push(`/${authMode === "local" ? "localBudget" : "budget"}/${budget.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create budget");
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
            "group relative flex flex-col items-start rounded-none border-2 p-4 text-left transition-all duration-200",
            "hover:border-emerald-500",
            mode === "guided"
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-foreground/20"
          )}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-none border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
            <Sparkles className="size-5" />
          </div>
          <h3 className="font-medium text-sm sm:text-base mb-1">{t("guidedMode")}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t("guidedDescription")}
          </p>
          <div className="w-full space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-emerald-500/20">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: "50%" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-20 tabular-nums">
                {tCat("necesidades")} 50%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-blue-500/20">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: "30%" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-20 tabular-nums">
                {tCat("deseos")} 30%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-amber-500/20">
                <div
                  className="h-full bg-amber-500 transition-all"
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
            "group relative flex flex-col items-start rounded-none border-2 p-4 text-left transition-all duration-200",
            "hover:border-emerald-500",
            mode === "manual"
              ? "border-emerald-500 bg-emerald-500/5"
              : "border-foreground/20"
          )}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-none border-2 border-violet-500/30 bg-violet-500/10 text-violet-600">
            <PenLine className="size-5" />
          </div>
          <h3 className="font-medium text-sm sm:text-base mb-1">{t("manualMode")}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t("manualDescription")}
          </p>
          <div className="flex h-[52px] w-full items-center justify-center rounded-none border-2 border-dashed border-muted-foreground/20">
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
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={incomeDisplay}
            aria-invalid={!!errors.monthly_income}
            onChange={(e) => {
              const formatted = formatInputValue(e.target.value);
              setIncomeDisplay(formatted);
              const num = parseFloat(formatted.replace(/,/g, ""));
              setValue("monthly_income", isNaN(num) ? (undefined as unknown as number) : num, { shouldValidate: true });
            }}
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
                {field.value ? (() => {
                  const curr = CURRENCIES.find((c) => c.code === field.value);
                  return curr ? (
                    <span className="flex flex-1 text-left">
                      {curr.symbol} {curr.code} - {curr.name}
                    </span>
                  ) : (
                    <SelectValue placeholder={t("selectCurrency")} />
                  );
                })() : (
                  <SelectValue placeholder={t("selectCurrency")} />
                )}
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
          render={({ field }) => {
            const periodOptions = [
              { value: 1, label: tc("monthly") },
              { value: 6, label: tc("semiAnnual") },
              { value: 12, label: tc("annual") },
              { value: -1, label: tc("custom") },
            ];
            const activeValue = customPeriod ? -1 : field.value;
            return (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (opt.value === -1) {
                          setCustomPeriod(true);
                          field.onChange(1);
                        } else {
                          setCustomPeriod(false);
                          field.onChange(opt.value);
                        }
                      }}
                      className={cn(
                        "rounded-none border-2 px-2 py-2 text-sm font-bold uppercase tracking-wide transition-all duration-150",
                        activeValue === opt.value
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-foreground/20 text-muted-foreground hover:border-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {customPeriod && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{t("months")}</span>
                  </div>
                )}
              </>
            );
          }}
        />
      </div>

      {/* Billing cutoff day */}
      <div className="space-y-1.5">
        <Label>{t("billingCutoffDay")}</Label>
        <p className="text-xs text-muted-foreground">{t("billingCutoffDayDescription")}</p>
        <Controller
          name="billing_cutoff_day"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(val) => field.onChange(Number(val))}
            >
              <SelectTrigger className="w-full">
                <span className="flex flex-1 text-left">
                  {t("dayOfMonth", { day: String(field.value) })}
                </span>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {t("dayOfMonth", { day: String(day) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <Button type="button" variant="ghost" onClick={handleBack} className="min-h-[44px]">
          <ArrowLeft className="size-4 mr-1" />
          {tc("back")}
        </Button>
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
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
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
          {createError && (
            <p className="text-xs text-destructive px-1 pt-1">{createError}</p>
          )}
          {renderFooter()}
        </form>
      </DialogContent>
    </Dialog>
  );
}
