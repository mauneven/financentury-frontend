"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Trash2, Loader2, Check, Users, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Budget } from "@/types/budget";
import { CURRENCIES, BILLING_PERIODS } from "@/types/budget";
import { budgetApi } from "@/lib/api";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";


import { CollaboratorsList } from "@/components/budget/collaborators-list";
import { PendingInvites } from "@/components/budget/pending-invites";
import { InviteDialog } from "@/components/budget/invite-dialog";

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
  billing_cutoff_day: z.number().int().min(1).max(31),
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
  const tInvite = useTranslations("invite");
  const tCollab = useTranslations("collaborators");
  const router = useRouter();
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);
  const { user } = useAuthStore();
  const isOwner = budget.user_id === user?.id;
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [collabCount, setCollabCount] = React.useState(0);
  const [customPeriod, setCustomPeriod] = React.useState(() => {
    return !BILLING_PERIODS.some((p) => p.value === budget.billing_period_months);
  });

  const formatInputValue = (val: string) => {
    const nums = val.replace(/[^\d.]/g, "");
    const parts = nums.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const numberToDisplay = (num: number): string => {
    if (!num) return "";
    return formatInputValue(num.toString());
  };

  const [incomeDisplay, setIncomeDisplay] = React.useState(() =>
    numberToDisplay(budget.monthly_income)
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: budget.name,
      monthly_income: budget.monthly_income,
      currency: budget.currency,
      billing_period_months: budget.billing_period_months,
      billing_cutoff_day: budget.billing_cutoff_day ?? 1,
    },
  });

  const watchCurrency = watch("currency");
  const currencyInfo = CURRENCIES.find((c) => c.code === watchCurrency);
  const currencySymbol = currencyInfo?.symbol || "$";

  const onSubmit = async (values: SettingsFormValues) => {
    setSubmitError(null);
    setIsSaving(true);
    try {
      await budgetApi.update(budget.id, values);
      await refreshSummary();
      onSaved?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteBudget(budget.id);
      setDeleteDialogOpen(false);
      router.push("/budgets");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h2 className="text-lg sm:text-xl font-medium">{t("settings")}</h2>
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
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={incomeDisplay}
              aria-invalid={!!errors.monthly_income}
              onChange={(e) => {
                const formatted = formatInputValue(e.target.value);
                setIncomeDisplay(formatted);
                const num = parseFloat(formatted.replace(/,/g, ""));
                setValue("monthly_income", isNaN(num) ? (undefined as unknown as number) : num, { shouldValidate: true, shouldDirty: true });
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
        </div>

        {/* Billing period */}
        <div className="space-y-1.5">
          <Label>{t("billingPeriod")}</Label>
          <Controller
            name="billing_period_months"
            control={control}
            render={({ field }) => {
              const selectValue = customPeriod ? "custom" : String(field.value);
              const displayLabel = customPeriod
                ? tc("custom")
                : (() => { const bp = BILLING_PERIODS.find((p) => String(p.value) === selectValue); return bp ? tc(bp.labelKey) : undefined; })();
              return (
                <>
                  <Select
                    value={selectValue}
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
                      {displayLabel ? (
                        <span className="flex flex-1 text-left">{displayLabel}</span>
                      ) : (
                        <SelectValue placeholder={t("selectPeriod")} />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIODS.map((p) => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          {tc(p.labelKey)}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">{tc("custom")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {customPeriod && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 1)
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

        {submitError && <p className="text-xs text-destructive">{submitError}</p>}

        {/* Save — owner only */}
        <Button
          type="submit"
          disabled={isSaving || !isDirty || !isOwner}
          className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
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

      {/* Collaborators section */}
      <>
        <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-muted-foreground" />
                <h2 className="text-lg sm:text-xl font-medium">{tCollab("title")}</h2>
                <span className="text-sm text-muted-foreground">{collabCount} / 5</span>
              </div>
              {isOwner && collabCount < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteDialogOpen(true)}
                  className="min-h-[44px]"
                >
                  <Link2 className="size-4 mr-1" />
                  {tInvite("generate")}
                </Button>
              )}
            </div>

            <CollaboratorsList budgetId={budget.id} isOwner={isOwner} onCountChange={setCollabCount} />

            {isOwner && <PendingInvites budgetId={budget.id} />}
          </div>

        <InviteDialog
          budgetId={budget.id}
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </>

      {/* Danger zone — owner only */}
      {isOwner && (
        <>
          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-destructive">{t("dangerZone")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("deleteDescription")}
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="min-h-[44px]"
            >
              <Trash2 className="size-4 mr-1" />
              {t("deleteBudget")}
            </Button>
          </div>

          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(val) => setDeleteDialogOpen(val)}
          >
            <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
                <DialogDescription>
                  {t("deleteConfirmMessage")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" className="min-h-[44px]" />}
                >
                  {tc("cancel")}
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="min-h-[44px]"
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
        </>
      )}
    </div>
  );
}
