"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Scale,
  Wallet,
  PenLine,
  ArrowLeft,
  Check,
  Loader2,
  CreditCard,
  Plane,
  PartyPopper,
} from "lucide-react";

// Removed recharts PieChart/Pie/Cell — replaced with a lightweight SVG donut.
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";
import { pickRandomIcon, maskAmountInput, parseAmount } from "@/lib/amount-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { Budget, CategoryTemplate } from "@/types/budget";
import {
  CURRENCIES,
  BALANCED_CATEGORIES,
  DEBT_FREE_CATEGORIES,
  DEBT_PAYOFF_CATEGORIES,
  TRAVEL_CATEGORIES,
  EVENT_CATEGORIES,
} from "@/types/budget";
import { detectCurrency } from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
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
  icon: z.string().min(1),
  monthly_income: z
    .number({ message: "Income is required" })
    .positive("Income must be greater than 0")
    .max(1e15, "Amount exceeds maximum"),
  currency: z.string().min(1, "Currency is required"),
  billing_period_months: z.number().int().min(0).max(12),
  billing_cutoff_day: z.number().int().min(0).max(31),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BudgetMode =
  | "balanced"
  | "debt-free"
  | "debt-payoff"
  | "travel"
  | "event"
  | "manual";

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
// Donut chart for mode cards
// ---------------------------------------------------------------------------

const DONUT_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
];

const MODE_CATEGORIES: Record<string, CategoryTemplate> = {
  balanced: BALANCED_CATEGORIES,
  "debt-free": DEBT_FREE_CATEGORIES,
  "debt-payoff": DEBT_PAYOFF_CATEGORIES,
  travel: TRAVEL_CATEGORIES,
  event: EVENT_CATEGORIES,
};

// Maps the Spanish hardcoded name in budget.ts constants to a budget i18n key.
// Category names (not section names — sections are gone).
const CATEGORY_NAME_KEYS: Record<string, string> = {
  Vivienda: "categoryHousing",
  Comida: "categoryFood",
  Transporte: "categoryTransport",
  Servicios: "categoryUtilities",
  Salidas: "categoryOutings",
  Entretenimiento: "categoryEntertainment",
  Tarjetas: "categoryCards",
  "Pr\u00e9stamos": "categoryLoans",
  "Fondo de emergencia": "categoryEmergencyFund",
  "Inversi\u00f3n": "categoryInvestment",
  Vuelos: "categoryFlights",
  Hospedaje: "categoryAccommodation",
  Actividades: "categoryActivities",
  "Transporte local": "categoryLocalTransport",
  Bebidas: "categoryDrinks",
  "Decoraci\u00f3n": "categoryDecoration",
  "Log\u00edstica": "categoryLogistics",
};

/** Lightweight SVG donut — replaces recharts PieChart to avoid bundling the
 *  entire recharts library just for static preview charts in this dialog. */
function MiniDonut({
  data,
  size = 60,
}: {
  data: { value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 6;
  const circumference = 2 * Math.PI * r;
  // Precompute cumulative offsets so the map callback is pure (no reassign).
  const offsets = data.reduce<number[]>((acc, d) => {
    const prev = acc[acc.length - 1] ?? 0;
    const pct = total > 0 ? d.value / total : 0;
    acc.push(prev + pct * circumference);
    return acc;
  }, [0]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const pct = total > 0 ? d.value / total : 0;
        const dashArray = `${pct * circumference} ${circumference}`;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={8}
            strokeDasharray={dashArray}
            strokeDashoffset={-offsets[i]}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </svg>
  );
}

function ModeDonutChart({
  mode,
  manualLabel,
  nameTranslator,
}: {
  mode: string;
  manualLabel?: string;
  nameTranslator?: (name: string) => string;
}) {
  const isManual = mode === "manual";
  const categories = isManual ? [] : (MODE_CATEGORIES[mode] ?? []);
  const donutData = isManual
    ? [{ value: 1, color: "#9ca3af" }]
    : categories.map((c, i) => ({
        value: c.pct,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }));

  return (
    <div className="flex items-center gap-2 mt-3 w-full">
      <div className="shrink-0 pointer-events-none select-none" style={{ width: 60, height: 60 }}>
        <MiniDonut data={donutData} size={60} />
      </div>

      {/* Legend to the right — flat list of categories */}
      {isManual ? (
        <p className="text-[10px] text-muted-foreground leading-tight">
          {manualLabel}
        </p>
      ) : (
        <div className="flex flex-col gap-[3px] flex-1 min-w-0 overflow-hidden">
          {categories.map((category, i) => (
            <span
              key={`${category.name}-${i}`}
              className="flex items-center gap-1 text-[9px] leading-tight text-muted-foreground"
            >
              <span
                className="inline-block shrink-0 rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                }}
              />
              <span className="truncate">{nameTranslator ? nameTranslator(category.name) : category.name}</span>
              <span className="shrink-0 tabular-nums">({category.pct}%)</span>
            </span>
          ))}
        </div>
      )}
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

  // Step & mode state
  const [step, setStep] = React.useState(1);
  const [mode, setMode] = React.useState<BudgetMode | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [customPeriod, setCustomPeriod] = React.useState(false);
  const [incomeDisplay, setIncomeDisplay] = React.useState("");
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);

  // Detect currency on mount
  const detectedCurrency = (() => {
    if (typeof window === "undefined") return "USD";
    return detectCurrency();
  })();

  // Locale-aware formatting happens per-change via maskAmountInput; no local
  // helper needed here.

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
      icon: "wallet",
      monthly_income: undefined as unknown as number,
      currency: detectedCurrency,
      billing_period_months: 1,
      billing_cutoff_day: 1,
    },
  });

  const watchCurrency = watch("currency");
  const watchBillingPeriod = watch("billing_period_months");
  const watchIcon = watch("icon");

  // Always 2 steps for all modes (mode selection -> details)
  const totalSteps = 2;

  // Currency symbol + locale
  const currencyInfo = CURRENCIES.find((c) => c.code === watchCurrency);
  const currencySymbol = currencyInfo?.symbol || "$";
  const currencyLocale = currencyInfo?.locale || "en-US";

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setStep(1);
        setMode(null);
        setIsSubmitting(false);
        setCreateError(null);
        setCustomPeriod(false);
        setIncomeDisplay("");
        reset({
          name: "",
          icon: pickRandomIcon([]),
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
  const selectMode = (m: BudgetMode) => {
    setMode(m);
    if (m === "travel" || m === "event") {
      // One-time billing for trip/event budgets
      setValue("billing_period_months", 0);
      setValue("billing_cutoff_day", 0);
      setCustomPeriod(false);
    } else {
      // Always reset to monthly when selecting non-one-time modes
      setValue("billing_period_months", 1);
      setValue("billing_cutoff_day", 1);
      setCustomPeriod(false);
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setMode(null);
    }
  };

  const onSubmit = async (values: BudgetFormValues) => {
    if (!mode) return;

    setIsSubmitting(true);
    try {
      const budget = await createBudget({
        ...values,
        mode,
      });

      onCreated?.(budget);
      onOpenChange(false);
      router.push(`/budget/${budget.id}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create budget"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Mode cards config
  // ---------------------------------------------------------------------------

  const modeCards: {
    mode: BudgetMode;
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
    borderColor: string;
    iconBg: string;
    iconBorder: string;
    iconText: string;
  }[] = [
    {
      mode: "balanced",
      icon: <Scale className="size-5" strokeWidth={1.8} />,
      titleKey: "balancedMode",
      descKey: "balancedDescription",
      borderColor: "hover:border-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-500/30",
      iconText: "text-emerald-600",
    },
    {
      mode: "debt-free",
      icon: <Wallet className="size-5" strokeWidth={1.8} />,
      titleKey: "debtFreeMode",
      descKey: "debtFreeDescription",
      borderColor: "hover:border-blue-500",
      iconBg: "bg-blue-500/10",
      iconBorder: "border-blue-500/30",
      iconText: "text-blue-600",
    },
    {
      mode: "debt-payoff",
      icon: <CreditCard className="size-5" strokeWidth={1.8} />,
      titleKey: "debtPayoffMode",
      descKey: "debtPayoffDescription",
      borderColor: "hover:border-rose-500",
      iconBg: "bg-rose-500/10",
      iconBorder: "border-rose-500/30",
      iconText: "text-rose-600",
    },
    {
      mode: "travel",
      icon: <Plane className="size-5" strokeWidth={1.8} />,
      titleKey: "travelMode",
      descKey: "travelDescription",
      borderColor: "hover:border-sky-500",
      iconBg: "bg-sky-500/10",
      iconBorder: "border-sky-500/30",
      iconText: "text-sky-600",
    },
    {
      mode: "event",
      icon: <PartyPopper className="size-5" strokeWidth={1.8} />,
      titleKey: "eventMode",
      descKey: "eventDescription",
      borderColor: "hover:border-amber-500",
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/30",
      iconText: "text-amber-600",
    },
    {
      mode: "manual",
      icon: <PenLine className="size-5" strokeWidth={1.8} />,
      titleKey: "manualMode",
      descKey: "manualDescription",
      borderColor: "hover:border-violet-500",
      iconBg: "bg-violet-500/10",
      iconBorder: "border-violet-500/30",
      iconText: "text-violet-600",
    },
  ];

  // ---------------------------------------------------------------------------
  // Step 1: Mode selection
  // ---------------------------------------------------------------------------

  const renderModeSelection = () => (
    <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <p className="text-xs text-muted-foreground mb-3">
        {t("canChangeLater")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modeCards.map((card) => (
          <button
            key={card.mode}
            type="button"
            onClick={() => selectMode(card.mode)}
            className={cn(
              "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200",
              card.borderColor,
              mode === card.mode
                ? "border-emerald-500 bg-emerald-500/5"
                : "border-border"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border",
                  card.iconBorder,
                  card.iconBg,
                  card.iconText
                )}
              >
                {card.icon}
              </div>
              <h3 className="font-medium text-sm sm:text-base">
                {t(card.titleKey)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">{t(card.descKey)}</p>
            <ModeDonutChart
              mode={card.mode}
              manualLabel={t("manualChartLabel")}
              nameTranslator={(name) => {
                const key = CATEGORY_NAME_KEYS[name];
                // Fall back to the literal name if translation key not found.
                return key ? t(key) : name;
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2: Budget details
  // ---------------------------------------------------------------------------

  const renderBudgetForm = () => (
    <div className="animate-in fade-in-0 slide-in-from-right-4 duration-300 space-y-4">
      {/* Name with icon picker */}
      <div className="space-y-1.5">
        <Label htmlFor="budget-name">{t("budgetName")}</Label>
        <div className="flex items-center gap-2">
          <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
            <PopoverTrigger
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-muted"
              aria-label="Pick icon"
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
            id="budget-name"
            placeholder={t("budgetNamePlaceholder")}
            autoFocus
            aria-invalid={!!errors.name}
            className="flex-1"
            {...register("name")}
          />
        </div>
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
              const formatted = maskAmountInput(e.target.value, currencyLocale);
              setIncomeDisplay(formatted);
              const num = parseAmount(formatted, currencyLocale);
              setValue(
                "monthly_income",
                isNaN(num) ? (undefined as unknown as number) : num,
                { shouldValidate: true }
              );
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
                {field.value
                  ? (() => {
                      const curr = CURRENCIES.find(
                        (c) => c.code === field.value
                      );
                      return curr ? (
                        <span className="flex flex-1 text-left">
                          {curr.symbol} {curr.code} - {curr.name}
                        </span>
                      ) : (
                        <SelectValue placeholder={t("selectCurrency")} />
                      );
                    })()
                  : (
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
              { value: 0, label: tc("oneTime") },
              { value: 1, label: tc("monthly") },
              { value: 6, label: tc("semiAnnual") },
              { value: 12, label: tc("annual") },
              { value: -1, label: tc("custom") },
            ];
            const activeValue = customPeriod ? -1 : field.value;
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {periodOptions.map((opt, idx) => (
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
                          if (opt.value === 0) {
                            setValue("billing_cutoff_day", 0);
                          } else if (watch("billing_cutoff_day") === 0) {
                            setValue("billing_cutoff_day", 1);
                          }
                        }
                      }}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-[10px] font-medium leading-tight transition-all duration-150",
                        idx === periodOptions.length - 1 ? "col-span-2 sm:col-span-1" : "",
                        activeValue === opt.value
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {field.value === 0 && !customPeriod && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("oneTimeDescription")}
                  </p>
                )}

                {customPeriod && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          Number(e.target.value.replace(/[^\d]/g, "")) || 1
                        )
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {t("months")}
                    </span>
                  </div>
                )}
              </>
            );
          }}
        />
      </div>

      {/* Billing cutoff day -- hidden for one-time budgets */}
      {watchBillingPeriod !== 0 && (
        <div className="space-y-1.5">
          <Label>{t("billingCutoffDay")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("billingCutoffDayDescription")}
          </p>
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
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Navigation footer
  // ---------------------------------------------------------------------------

  const renderFooter = () => {
    if (step === 1) return null;

    return (
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleBack}
          className="min-h-[44px]"
        >
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
          ) : (
            <>
              <Check className="size-4 mr-1" />
              {t("createBudget")}
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
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={totalSteps} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && renderModeSelection()}
          {step === 2 && renderBudgetForm()}
          {createError && (
            <p className="text-xs text-destructive px-1 pt-1">{createError}</p>
          )}
          {renderFooter()}
        </form>
      </DialogContent>
    </Dialog>
  );
}
