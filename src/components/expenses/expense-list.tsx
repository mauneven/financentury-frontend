"use client";

import { useMemo,useState } from "react";

import { format, parseISO } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "@/i18n/client";
import { useLocaleStore } from "@/i18n/locale";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon } from "@/lib/icon-picker";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types/budget";

const ICON_STROKE = 1.8;

// Cache Intl.DateTimeFormat — constructing it per row is expensive and the
// expense list can render hundreds of rows. Key by locale so we keep both.
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
function getTimeFormatter(locale: string): Intl.DateTimeFormat {
  let f = timeFormatterCache.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
    timeFormatterCache.set(locale, f);
  }
  return f;
}

interface CategoryInfo {
  name: string;
  icon: string | null;
  categoryName: string;
}

export interface CollaboratorInfo {
  name: string;
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
  const { locale } = useLocaleStore();
  const dateFnsLocale = locale === "es" ? dateFnsEs : undefined;
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const grouped = useMemo((): GroupedExpenses[] => {
    // expense_date is a lexicographically sortable ISO date string
    // (YYYY-MM-DD…), so string compare avoids per-row Date allocations.
    const sorted = [...expenses].sort((a, b) =>
      a.expense_date < b.expense_date ? 1 : a.expense_date > b.expense_date ? -1 : 0
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
      label: format(
        parseISO(date),
        locale === "es" ? "EEEE, d 'de' MMMM 'de' yyyy" : "EEEE, MMMM d, yyyy",
        { locale: dateFnsLocale }
      ),
      expenses: exps,
    }));
  }, [expenses, locale, dateFnsLocale]);

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="mb-4 rounded-lg bg-muted p-4">
          <Receipt className="size-8 text-muted-foreground" strokeWidth={ICON_STROKE} />
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
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
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
  const { locale } = useLocaleStore();

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
        "transition-colors duration-200 hover:bg-accent/50 rounded-lg"
      )}
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {categoryInfo?.icon
          ? <CategoryIcon iconKey={categoryInfo.icon} className="size-5" />
          : <Receipt className="size-5" strokeWidth={ICON_STROKE} />
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
        <p className="tabular-nums text-sm font-medium text-foreground">
          {formatCurrency(expense.amount, currency)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {(() => {
            // Guard against a missing/invalid timestamp so the whole row
            // doesn't crash out of the list.
            const createdAt = expense.created_at ? new Date(expense.created_at) : null;
            if (!createdAt || isNaN(createdAt.getTime())) return "";
            const timeStr = getTimeFormatter(locale === "es" ? "es" : "en").format(createdAt);
            const updatedAt = expense.updated_at ? new Date(expense.updated_at) : null;
            const wasEdited =
              updatedAt && !isNaN(updatedAt.getTime()) &&
              updatedAt.getTime() - createdAt.getTime() > 60000;
            return (
              <>
                {timeStr}
                {wasEdited && (
                  <span className="ml-1 text-muted-foreground/60">· {t("edited")}</span>
                )}
              </>
            );
          })()}
        </p>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="shrink-0 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="min-h-[44px] min-w-[44px]" />}>
              <MoreHorizontal className="size-5" strokeWidth={ICON_STROKE} />
              <span className="sr-only">{t("actions")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(expense)} className="min-h-[44px]">
                  <Pencil className="mr-2 size-4" strokeWidth={ICON_STROKE} />
                  {tc("edit")}
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete} className="min-h-[44px]">
                  <Trash2 className="mr-2 size-4" strokeWidth={ICON_STROKE} />
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
