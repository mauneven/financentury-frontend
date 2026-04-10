"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { useLocaleStore } from "@/i18n/locale";
import { useBudgetStore } from "@/store/budget-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BottomNavProps {
  onAddExpense: () => void;
  onAddBudget: () => void;
  className?: string;
}

export function BottomNav({
  onAddExpense,
  onAddBudget,
  className,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("bottomNav");
  const { locale, setLocale } = useLocaleStore();
  const activeBudgetId = useBudgetStore((s) => s.activeBudgetId);

  const isHome = pathname === "/";

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm",
        className
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-14 items-center justify-around px-2">
        {/* Budgets tab */}
        <button
          onClick={() => router.push("/budgets")}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors duration-200",
            isHome
              ? "text-foreground"
              : "text-muted-foreground active:text-foreground"
          )}
        >
          <Home className="size-5" />
          <span className="text-[10px] font-medium">{t("budgets")}</span>
        </button>

        {/* Add Expense tab (prominent) */}
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={onAddExpense}
            className="flex size-11 items-center justify-center bg-foreground text-background transition-transform duration-150 active:scale-90"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* More tab */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-muted-foreground transition-colors duration-200 outline-none active:text-foreground"
          >
            <User className="size-5" />
            <span className="text-[10px] font-medium">{t("more")}</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={12}
            className="min-w-[180px]"
          >
            <DropdownMenuItem onClick={() => router.push("/account")}>
              {t("account")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setLocale(locale === "en" ? "es" : "en")}
            >
              {t("switchLanguage")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onAddBudget}>
              {t("newBudget")}
            </DropdownMenuItem>

            {activeBudgetId && (
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/budget/${activeBudgetId}/settings`)
                }
              >
                {t("budgetSettings")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
