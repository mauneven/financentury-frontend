"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Trash2, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Budget } from "@/types/budget";
import { CURRENCIES, BILLING_PERIODS } from "@/types/budget";
import { budgetApi } from "@/lib/api";
import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { useTranslations } from "@/i18n/client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
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

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetSettingsProps {
  budget: Budget;
  onSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BudgetSettings({ budget, onSaved }: BudgetSettingsProps) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const router = useRouter();
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customPeriod, setCustomPeriod] = React.useState(() => {
    return !BILLING_PERIODS.some((p) => p.value === budget.billing_period_months);
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: budget.name,
      monthly_income: budget.monthly_income,
      currency: budget.currency,
      billing_period_months: budget.billing_period_months,
    },
  });

  const watchCurrency = watch("currency");
  const currencyInfo = CURRENCIES.find((c) => c.code === watchCurrency);
  const currencySymbol = currencyInfo?.symbol || "$";

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      await budgetApi.update(budget.id, values);
      onSaved?.();
    } catch {
      // error handling upstream
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBudget(budget.id);
      setDeleteDialogOpen(false);
      router.push("/");
    } catch {
      // error handling upstream
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-medium">{t("settings")}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">{t("budgetName")}</Label>
          <Input
            id="settings-name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Monthly income */}
        <div className="space-y-1.5">
          <Label htmlFor="settings-income">{t("monthlyIncome")}</Label>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>{currencySymbol}</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="settings-income"
              type="number"
              min={0}
              step="any"
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
                  value={customPeriod ? "custom" : String(field.value)}
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
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {t("months")}
                    </span>
                  </div>
                )}
              </>
            )}
          />
        </div>

        {/* Save */}
        <Button
          type="submit"
          size="sm"
          disabled={isSaving || !isDirty}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Check className="size-4 mr-1" />
              {t("saveChanges")}
            </>
          )}
        </Button>
      </form>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-destructive">{t("dangerZone")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("deleteDescription")}
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="size-4 mr-1" />
          {t("deleteBudget")}
        </Button>
      </div>

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(val) => setDeleteDialogOpen(val)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm" />}
            >
              {tc("cancel")}
            </DialogClose>
            <Button
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
                <>
                  <Trash2 className="size-4 mr-1" />
                  {tc("delete")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
