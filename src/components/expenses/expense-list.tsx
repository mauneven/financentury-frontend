"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
} from "lucide-react";

import type { Expense } from "@/types/budget";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface CategoryInfo {
  name: string;
  icon: string | null;
  categoryName: string;
}

export interface CollaboratorInfo {
  name: string;
  avatar_url?: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  currency: string;
  categoriesMap: Map<string, CategoryInfo>;
  collaborators?: Map<string, CollaboratorInfo>;
  currentUserId?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

interface GroupedExpenses {
  date: string;
  label: string;
  expenses: Expense[];
}

export function ExpenseList({
  expenses,
  currency,
  categoriesMap,
  collaborators,
  currentUserId,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const grouped = ((): GroupedExpenses[] => {
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );

    const groups = new Map<string, Expense[]>();
    for (const expense of sorted) {
      const dateKey = expense.expense_date;
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(expense);
    }

    return Array.from(groups.entries()).map(([date, exps]) => ({
      date,
      label: format(parseISO(date), "EEEE, MMMM d, yyyy"),
      expenses: exps,
    }));
  })();

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="mb-4 bg-muted p-4">
          <Receipt className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-base font-medium text-foreground">{t("noExpenses")}</h3>
        <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
          {t("noExpensesHint")}
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="space-y-1">
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-background/95 px-2 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              </div>

              {/* Expense Items */}
              <div>
                {group.expenses.map((expense) => {
                  const catInfo = categoriesMap.get(expense.category_id);
                  return (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      currency={currency}
                      categoryInfo={catInfo}
                      collaborators={collaborators}
                      currentUserId={currentUserId}
                      onEdit={onEdit}
                      onDelete={() => setDeleteTarget(expense)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("deleteExpense")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t("deleteConfirmMessage", { amount: formatCurrency(deleteTarget.amount, currency) })
                : t("deleteConfirmMessageGeneric")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {tc("delete")}
            </Button>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  currency: string;
  categoryInfo?: CategoryInfo;
  collaborators?: Map<string, CollaboratorInfo>;
  currentUserId?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: () => void;
}

function ExpenseRow({
  expense,
  currency,
  categoryInfo,
  collaborators,
  currentUserId,
  onEdit,
  onDelete,
}: ExpenseRowProps) {
  const t = useTranslations("expense");
  const tc = useTranslations("common");

  // Resolve creator info
  const createdByOther =
    expense.created_by && currentUserId && expense.created_by !== currentUserId;
  const creatorInfo = createdByOther && collaborators
    ? collaborators.get(expense.created_by!)
    : null;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-border/50 px-2 py-3 sm:py-3.5",
        "transition-colors duration-200 hover:bg-accent/50"
      )}
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
        {categoryInfo?.icon
          ? <CategoryIcon iconKey={categoryInfo.icon} className="size-5" />
          : <Receipt className="size-5" />
        }
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {categoryInfo?.name || "Unknown"}
        </p>
        {expense.description && (
          <p className="truncate text-sm text-muted-foreground">
            {expense.description}
          </p>
        )}
        {creatorInfo && (
          <p className="truncate text-xs text-muted-foreground/70 mt-0.5">
            {creatorInfo.name}
          </p>
        )}
      </div>

      {/* Amount + time */}
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-medium text-foreground">
          {formatCurrency(expense.amount, currency)}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {new Date(expense.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          {expense.updated_at && new Date(expense.updated_at).getTime() - new Date(expense.created_at).getTime() > 60000 && (
            <span className="ml-1 text-muted-foreground/60">· {t("edited")}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="shrink-0 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="min-h-[44px] min-w-[44px]" />}>
              <MoreHorizontal className="size-5" />
              <span className="sr-only">{t("actions")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(expense)} className="min-h-[44px]">
                  <Pencil className="mr-2 size-4" />
                  {tc("edit")}
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete} className="min-h-[44px]">
                  <Trash2 className="mr-2 size-4" />
                  {tc("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
