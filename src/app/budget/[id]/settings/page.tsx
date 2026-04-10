"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { BudgetSettings } from "@/components/budget/budget-settings";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function BudgetSettingsPage() {
  const params = useParams<{ id: string }>();
  const summary = useBudgetStore((s) => s.summary);
  const router = useRouter();
  const tc = useTranslations("common");

  if (!summary) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-12">
      <button
        type="button"
        onClick={() => router.push(`/budget/${params.id}`)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span className="text-xs uppercase tracking-wider font-bold">{tc("back")}</span>
      </button>
      <BudgetSettings budget={summary.budget} />
    </div>
  );
}
