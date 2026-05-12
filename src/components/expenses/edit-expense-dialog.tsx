"use client";

import { useEffect,useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const ICON_STROKE = 1.8;

import { useQueryClient } from "@tanstack/react-query";

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
import { formatAmount,maskAmountInput, parseAmount } from "@/lib/amount-utils";
import { expenseApi } from "@/lib/api";
import { CategoryIcon } from "@/lib/icon-picker";
import { qk } from "@/lib/query-keys";
import { useActiveBudgetStore } from "@/store/active-budget-store";
import type { Category,Expense } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";

function isValidExpenseDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d.getTime() > today.getTime()) return false;
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

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  /** Flat list of all categories (own + linked) the expense can be moved to. */
  categories: Category[];
  currency: string;
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  categories,
  currency,
}: EditExpenseDialogProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const activeBudgetId = useActiveBudgetStore((s) => s.activeBudgetId);

  // Invalidate both the expense's own budget (the row's source of truth)
  // and the currently-viewed active budget (whose summary aggregates linked
  // spending). One helper covers both update + delete paths.
  const invalidateAffectedBudgets = () => {
    queryClient.invalidateQueries({
      queryKey: qk.budget.detail(expense.budget_id),
    });
    if (activeBudgetId && activeBudgetId !== expense.budget_id) {
      queryClient.invalidateQueries({
        queryKey: qk.budget.detail(activeBudgetId),
      });
    }
  };

  const [amountDisplay, setAmountDisplay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  });

  const watchedCategoryId = watch("category_id");
  const watchedDate = watch("expense_date");

  useEffect(() => {
    // Reset every piece of transient state when the dialog opens so a
    // previous submit/delete failure or in-flight flag doesn't leak into
    // the next session.
    if (open && expense) {
      setAmountDisplay(formatAmount(expense.amount, currencyLocale));
      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
      setSubmitError(null);
      setCalendarOpen(false);

      reset({
        category_id: expense.category_id,
        amount: expense.amount,
        description: expense.description || "",
        expense_date: expense.expense_date,
      });
    }
  }, [open, expense, reset, currencyLocale]);

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
      await expenseApi.update(expense.budget_id, expense.id, {
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || undefined,
        expense_date: data.expense_date,
      });
      invalidateAffectedBudgets();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitError(null);
    setIsDeleting(true);
    try {
      // Always delete against the expense's own budget — for linked
      // expenses that's a foreign source budget, not the active one.
      await expenseApi.delete(expense.budget_id, expense.id);
      invalidateAffectedBudgets();
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  const selectedDate = watchedDate ? new Date(watchedDate + "T00:00:00") : new Date();
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editExpense")}</DialogTitle>
          <DialogDescription>{t("editExpenseDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category — flat single select */}
          <div className="space-y-2">
            <Label>{t("category")}</Label>
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

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>{t("amount")}</Label>
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
            <Label>
              {t("description")}
              <span className="ml-1 text-xs text-muted-foreground">({t("optional")})</span>
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
            <Label>{t("date")}</Label>
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

          {submitError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="size-3" strokeWidth={ICON_STROKE} />
              {submitError}
            </p>
          )}

          <DialogFooter>
            {!showDeleteConfirm ? (
              <>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={ICON_STROKE} />}
                  {isSubmitting ? t("saving") : t("saveChanges")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 size-4" strokeWidth={ICON_STROKE} />
                  {tc("delete")}
                </Button>
                <DialogClose render={<Button variant="outline" />}>
                  {tc("cancel")}
                </DialogClose>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={ICON_STROKE} />}
                  {t("confirmDelete")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {tc("cancel")}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
