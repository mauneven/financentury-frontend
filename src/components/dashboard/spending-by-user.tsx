"use client";

import { useTranslations } from "@/i18n/client";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UserSpending } from "@/types/budget";

interface SpendingByUserProps {
  spendingByUser: UserSpending[];
  totalSpent: number;
  currency: string;
  compact?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

export function SpendingByUser({
  spendingByUser,
  totalSpent,
  currency,
  compact,
}: SpendingByUserProps) {
  const t = useTranslations("dashboard");

  if (!spendingByUser || spendingByUser.length === 0) return null;

  return (
    <div className={cn("space-y-2", compact ? "mt-2" : "mt-3")}>
      <p className="text-sm font-medium text-muted-foreground">
        {t("spendingByPerson")}
      </p>
      {/* Stacked bar — percent of total spent per user (clamped 0..100). */}
      {totalSpent > 0 && (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {spendingByUser.map((u, i) => {
            const raw = (u.amount / totalSpent) * 100;
            const pct = Math.max(0, Math.min(100, raw));
            return (
              <div
                key={u.user_id}
                className={cn("h-full transition-all duration-300", COLORS[i % COLORS.length])}
                style={{ width: `${pct}%` }}
                title={u.profile?.full_name || u.profile?.email || u.user_id}
              />
            );
          })}
        </div>
      )}
      {/* Per-person rows */}
      <div className={cn("space-y-1.5", compact && "text-sm")}>
        {spendingByUser.map((u, i) => {
          const pct = totalSpent > 0
            ? Math.max(0, Math.min(100, Math.round((u.amount / totalSpent) * 100)))
            : 0;
          const name = u.profile?.full_name || u.profile?.email || t("unknownUser");
          return (
            <div key={u.user_id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                  COLORS[i % COLORS.length]
                )}
              >
                {getInitials(name)}
              </span>
              <span className="flex-1 truncate text-sm text-foreground">{name}</span>
              <span className="tabular-nums text-sm font-semibold text-foreground">
                {formatCompact(u.amount, currency)}
              </span>
              <span className={cn("min-w-[2.5rem] text-right tabular-nums text-xs font-semibold", COLORS[i % COLORS.length].replace("bg-", "text-"))}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
