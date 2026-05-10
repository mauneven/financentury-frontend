"use client";

import { useEffect, useMemo,useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const ICON_STROKE = 1.8;

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/i18n/client";
import { useQueryClient } from "@tanstack/react-query";

import {
  useBudgetSummary,
  useCreateExpense,
} from "@/hooks/use-budget-queries";
import { maskAmountInput, parseAmount } from "@/lib/amount-utils";
import { expenseApi } from "@/lib/api";
import { formatCurrency, getPercentage, getProgressTextColor } from "@/lib/format";
import { CategoryIcon } from "@/lib/icon-picker";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Category, CategorySummary } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";

// Reject dates that are in the future or farther back than a sane bound.
// Defense-in-depth: the calendar disables future dates, but the underlying
// form value is a raw string that could be set directly.
function isValidExpenseDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d.getTime() > today.getTime()) return false;
  // Sanity floor — reject anything before year 2000.
  if (d.getFullYear() < 2000) return false;
  return true;
}

const expenseSchema = z.object({
  category_id: z.string().uuid("Please select a category"),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1e15, "Amount exceeds maximum"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .optional(),
  expense_date: z
    .string()
    .min(1, "Date is required")
    .refine(isValidExpenseDate, "Date must be valid and not in the future"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Budget the dialog is opened from. Kept for API continuity — the actual
   * target budget is resolved per-category via `linkedCategoryBudgetMap`
   * (for linked categories) or falls back to the store's active budget.
   */
  budgetId: string;
  /**
   * Flat list of categories the user can pick from. With sections gone
   * we no longer nest a category picker — it's a single select.
   */
  categories: Category[];
  currency: string;
  preselectedCategoryId?: string;
  /** When set, expense is routed to this budget (for linked categories). */
  sourceBudgetId?: string;
  /** Maps category IDs to their source budget ID for category-level links. */
  linkedCategoryBudgetMap?: Map<string, string>;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  budgetId,
  categories,
  currency,
  preselectedCategoryId,
  sourceBudgetId,
  linkedCategoryBudgetMap,
}: AddExpenseDialogProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const addExpenseMut = useCreateExpense(budgetId);
  const { data: summary } = useBudgetSummary(budgetId);

  const [amountDisplay, setAmountDisplay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = currencyInfo?.symbol || "$";
  const currencyLocale = currencyInfo?.locale || "en-US";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category_id: "",
      amount: 0,
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const watchedCategoryId = watch("category_id");
  const watchedDate = watch("expense_date");

  const categorySummary = useMemo((): CategorySummary | null => {
    if (!summary || !watchedCategoryId) return null;
    for (const c of summary.categories) {
      if (c.category.id === watchedCategoryId) return c;
    }
    for (const l of summary.linked_categories ?? []) {
      if (l.category.category.id === watchedCategoryId) return l.category;
    }
    return null;
  }, [summary, watchedCategoryId]);

  useEffect(() => {
    if (open) {
      reset({
        category_id: preselectedCategoryId || "",
        amount: 0,
        description: "",
        expense_date: format(new Date(), "yyyy-MM-dd"),
      });
      setAmountDisplay("");
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [open, reset, preselectedCategoryId]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = maskAmountInput(raw, currencyLocale);
    setAmountDisplay(formatted);
    const parsed = parseAmount(formatted, currencyLocale);
    setValue("amount", isNaN(parsed) ? 0 : parsed, { shouldValidate: true });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setValue("expense_date", format(date, "yyyy-MM-dd"), { shouldValidate: true });
      setCalendarOpen(false);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const expenseData = {
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || undefined,
        expense_date: data.expense_date,
      };
      // Route by source:
      //   • linked category  → its source budget (linkedCategoryBudgetMap)
      //   • sourceBudgetId   → explicit override (linked-expense flow from dashboard)
      //   • otherwise        → the active budget via the scoped mutation
      const categorySourceBudget = linkedCategoryBudgetMap?.get(data.category_id);
      const targetBudget = categorySourceBudget || sourceBudgetId;
      if (targetBudget && targetBudget !== budgetId) {
        // Cross-budget linked write. Hit the source budget directly, then
        // invalidate BOTH that budget's detail subtree (it owns the row)
        // AND the active budget's summary (it aggregates linked spending).
        await expenseApi.create(targetBudget, expenseData);
        queryClient.invalidateQueries({
          queryKey: qk.budget.detail(targetBudget),
        });
        queryClient.invalidateQueries({
          queryKey: qk.budget.detail(budgetId),
        });
      } else {
        await addExpenseMut.mutateAsync(expenseData);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add expense");
      setIsSubmitting(false);
    }
  };

  const selectedDate = watchedDate ? new Date(watchedDate + "T00:00:00") : new Date();
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addExpense")}</DialogTitle>
          <DialogDescription>{t("addExpenseDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Category — flat single select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("category")}</Label>
            <Select
              value={watchedCategoryId || null}
              onValueChange={(val) => {
                if (val) setValue("category_id", val, { shouldValidate: true });
              }}
            >
              <SelectTrigger className="w-full">
                {selectedCategory ? (
                  <span className="flex flex-1 items-center gap-1.5 text-left">
                    <CategoryIcon iconKey={selectedCategory.icon} className="size-4" />
                    {selectedCategory.name}
                  </span>
                ) : (
                  <SelectValue placeholder={t("selectCategory")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <CategoryIcon iconKey={cat.icon} className="mr-1.5 inline size-4" />
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
                {errors.category_id.message}
              </p>
            )}
          </div>

          {/* Remaining Budget Info */}
          {categorySummary && (() => {
            const remaining = Math.max(0, categorySummary.allocated_amount - categorySummary.total_spent);
            const spentPct = getPercentage(categorySummary.total_spent, categorySummary.allocated_amount);
            const remainingPct = categorySummary.allocated_amount > 0
              ? Math.max(0, 100 - spentPct)
              : 0;
            return (
              <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5 text-sm rounded-md">
                <span className="text-muted-foreground">{t("remainingBudget")}</span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    getProgressTextColor(spentPct)
                  )}
                >
                  {formatCurrency(remaining, currency)} ({remainingPct}%)
                </span>
              </div>
            );
          })()}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("amount")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountDisplay}
                onChange={handleAmountChange}
                className="h-12 pl-8 text-right tabular-nums text-xl"
                aria-invalid={!!errors.amount}
              />
            </div>
            {errors.amount && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("description")}
              <span className="ml-1 text-xs font-normal text-muted-foreground">({t("optional")})</span>
            </Label>
            <Textarea
              {...register("description")}
              placeholder={t("descriptionPlaceholder")}
              maxLength={500}
              className="resize-none"
            />
            {errors.description && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("date")}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-full justify-start text-left font-normal" />
                }
              >
                <CalendarIcon className="mr-2 size-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
                {watchedDate ? format(selectedDate, "PPP") : t("pickDate")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date()}
                  today={new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.expense_date && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
                {errors.expense_date.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={ICON_STROKE} />}
              {isSubmitting ? t("saving") : t("addExpense")}
            </Button>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
          </DialogFooter>
          {submitError && (
            <p className="flex items-center gap-1 text-xs text-destructive px-1">
              <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
              {submitError}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
