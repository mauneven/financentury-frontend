"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";

import type { Expense, Section } from "@/types/budget";
import { CURRENCIES } from "@/types/budget";
import { useBudgetStore } from "@/store/budget-store";
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
  category_id: z.string().uuid("Please select a subcategory"),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().max(500, "Description must be 500 characters or fewer").optional(),
  expense_date: z.string().min(1, "Date is required"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  budgetId: string;
  categories: Section[];
  currency: string;
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

function numberToDisplay(num: number): string {
  if (num === 0) return "";
  const str = num.toString();
  return formatAmountDisplay(str);
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  budgetId,
  categories,
  currency,
}: EditExpenseDialogProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const updateExpense = useBudgetStore((s) => s.updateExpense);
  const deleteExpense = useBudgetStore((s) => s.deleteExpense);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  });

  const watchedSubcategoryId = watch("category_id");
  const watchedDate = watch("expense_date");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const subcategories = useMemo(
    () => selectedCategory?.categories || [],
    [selectedCategory]
  );

  // Find which category owns the expense's subcategory
  const findCategoryForSubcategory = useCallback(
    (subcategoryId: string): string | null => {
      for (const cat of categories) {
        if (cat.categories?.some((s) => s.id === subcategoryId)) {
          return cat.id;
        }
      }
      return null;
    },
    [categories]
  );

  // Populate form when dialog opens
  useEffect(() => {
    if (open && expense) {
      const catId = findCategoryForSubcategory(expense.category_id);
      setSelectedCategoryId(catId);
      setAmountDisplay(numberToDisplay(expense.amount));
      setShowDeleteConfirm(false);

      reset({
        category_id: expense.category_id,
        amount: expense.amount,
        description: expense.description || "",
        expense_date: expense.expense_date,
      });
    }
  }, [open, expense, reset, findCategoryForSubcategory]);

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      setSelectedCategoryId(value);
      setValue("category_id", "");
    },
    [setValue]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatAmountDisplay(raw);
      setAmountDisplay(formatted);
      setValue("amount", parseAmountString(formatted), { shouldValidate: true });
    },
    [setValue]
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        setValue("expense_date", format(date, "yyyy-MM-dd"), { shouldValidate: true });
        setCalendarOpen(false);
      }
    },
    [setValue]
  );

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      await updateExpense(budgetId, expense.id, {
        category_id: data.category_id,
        amount: data.amount,
        description: data.description || undefined,
        expense_date: data.expense_date,
      });
      onOpenChange(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      onOpenChange(false);
    } catch {
      setIsDeleting(false);
    }
  };

  const selectedDate = watchedDate ? new Date(watchedDate + "T00:00:00") : new Date();

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editExpense")}</DialogTitle>
          <DialogDescription>{t("editExpenseDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category Select */}
          <div className="space-y-2">
            <Label>{t("category")}</Label>
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
            <Label>{t("subcategory")}</Label>
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
                <AlertCircle className="size-3" />
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
          <DialogFooter>
            {!showDeleteConfirm ? (
              <>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isSubmitting ? t("saving") : t("saveChanges")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 size-4" />
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
                  {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
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
