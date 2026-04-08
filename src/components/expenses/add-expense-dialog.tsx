"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";

import type { Section, CategorySummary } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";
import { useBudgetStore } from "@/store/budget-store";
import { formatCurrency, getPercentage, getProgressTextColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const expenseSchema = z.object({
  category_id: z.string().uuid("Please select a category"),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().max(500, "Description must be 500 characters or fewer").optional(),
  expense_date: z.string().min(1, "Date is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  categories: Section[];
  currency: string;
  preselectedSubcategoryId?: string;
}

function formatAmountDisplay(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0] || "";
  const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts.length > 1) {
    return `${formatted}.${parts[1].slice(0, 2)}`;
  }
  return formatted;
}

function parseAmountString(value: string): number {
  const cleaned = value.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  budgetId,
  categories,
  currency,
  preselectedSubcategoryId,
}: AddExpenseDialogProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const addExpense = useBudgetStore((s) => s.addExpense);
  const summary = useBudgetStore((s) => s.summary);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencySymbol = currencyInfo?.symbol || "$";

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

  const watchedSubcategoryId = watch("category_id");
  const watchedDate = watch("expense_date");

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const subcategories = selectedCategory?.categories || [];

  const subcategorySummary = useMemo((): CategorySummary | null => {
    if (!summary || !watchedSubcategoryId) return null;
    for (const cat of summary.sections) {
      for (const sub of cat.categories) {
        if (sub.category.id === watchedSubcategoryId) {
          return sub;
        }
      }
    }
    return null;
  }, [summary, watchedSubcategoryId]);

  // Auto-select category and subcategory when preselected
  useEffect(() => {
    if (open && preselectedSubcategoryId) {
      for (const cat of categories) {
        const sub = cat.categories?.find((s) => s.id === preselectedSubcategoryId);
        if (sub) {
          setSelectedCategoryId(cat.id);
          setValue("category_id", sub.id);
          break;
        }
      }
    }
  }, [open, preselectedSubcategoryId, categories, setValue]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        category_id: preselectedSubcategoryId || "",
        amount: 0,
        description: "",
        expense_date: format(new Date(), "yyyy-MM-dd"),
      });
      setAmountDisplay("");
      setIsSubmitting(false);
      setSubmitError(null);
      if (!preselectedSubcategoryId) {
        setSelectedCategoryId(null);
      }
    }
  }, [open, reset, preselectedSubcategoryId]);

  const handleCategoryChange = (value: string | null) => {
    setSelectedCategoryId(value);
    setValue("category_id", "");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatAmountDisplay(raw);
    setAmountDisplay(formatted);
    setValue("amount", parseAmountString(formatted), { shouldValidate: true });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setValue("expense_date", format(date, "yyyy-MM-dd"), { shouldValidate: true });
      setCalendarOpen(false);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      await addExpense({
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || undefined,
        expense_date: data.expense_date,
      });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add expense");
      setIsSubmitting(false);
    }
  };

  const selectedDate = watchedDate ? new Date(watchedDate + "T00:00:00") : new Date();

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addExpense")}</DialogTitle>
          <DialogDescription>{t("addExpenseDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Category Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("category")}</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full">
                {selectedCategoryId ? (
                  <span className="flex flex-1 items-center gap-1.5 text-left">
                    <span>{categories.find((c) => c.id === selectedCategoryId)?.icon}</span>
                    {categories.find((c) => c.id === selectedCategoryId)?.name}
                  </span>
                ) : (
                  <SelectValue placeholder={t("selectCategory")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="mr-1.5">{cat.icon}</span>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("subcategory")}</Label>
            <Select
              value={watchedSubcategoryId || null}
              onValueChange={(val) => {
                if (val) setValue("category_id", val, { shouldValidate: true });
              }}
              disabled={!selectedCategoryId}
            >
              <SelectTrigger className={cn("w-full", !selectedCategoryId && "opacity-50")}>
                {watchedSubcategoryId ? (() => {
                  const sub = subcategories.find((s) => s.id === watchedSubcategoryId);
                  return sub ? (
                    <span className="flex flex-1 items-center gap-1.5 text-left">
                      <span>{sub.icon}</span>
                      {sub.name}
                    </span>
                  ) : (
                    <SelectValue placeholder={selectedCategoryId ? t("selectSubcategory") : t("selectCategoryFirst")} />
                  );
                })() : (
                  <SelectValue placeholder={selectedCategoryId ? t("selectSubcategory") : t("selectCategoryFirst")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {subcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <span className="mr-1.5">{sub.icon}</span>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" />
                {errors.category_id.message}
              </p>
            )}
          </div>

          {/* Remaining Budget Info */}
          {subcategorySummary && (
            <div className="border-2 border-foreground bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("remainingBudget")}</span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    getProgressTextColor(
                      getPercentage(subcategorySummary.total_spent, subcategorySummary.allocated_amount)
                    )
                  )}
                >
                  {formatCurrency(
                    Math.max(0, subcategorySummary.allocated_amount - subcategorySummary.total_spent),
                    currency
                  )}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("spentOf", {
                    spent: formatCurrency(subcategorySummary.total_spent, currency),
                    total: formatCurrency(subcategorySummary.allocated_amount, currency),
                  })}
                </span>
              </div>
            </div>
          )}

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
                className="h-12 pl-8 text-right font-mono text-xl"
                aria-invalid={!!errors.amount}
              />
            </div>
            {errors.amount && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" />
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
                <AlertCircle className="size-3" />
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
                <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
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
                <AlertCircle className="size-3" />
                {errors.expense_date.message}
              </p>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSubmitting ? t("saving") : t("addExpense")}
            </Button>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
          </DialogFooter>
          {submitError && (
            <p className="flex items-center gap-1 text-xs text-destructive px-1">
              <AlertCircle className="size-3" />
              {submitError}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
