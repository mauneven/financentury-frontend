"use client";

import { Wallet, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "@/i18n/client";

export function EmptyDashboard() {
  const t = useTranslations("dashboard");
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <Wallet className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          {t("noData")}
        </h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {t("noDataHint")}
        </p>
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span>{t("startAddingExpense")}</span>
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
