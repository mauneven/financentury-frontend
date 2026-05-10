"use client";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { BudgetSettings } from "@/components/budget/budget-settings";
import { useBudgetSummary } from "@/hooks/use-budget-queries";
import { useTranslations } from "@/i18n/client";

const ICON_STROKE = 1.8;

export default function BudgetSettingsPage() {
  const params = useParams<{ id: string }>();
  const { data: summary, isPending: summaryLoading } = useBudgetSummary(
    params.id
  );
  const router = useRouter();
  const tc = useTranslations("common");

  // Loading state -- parent layout shows skeleton but guard here too
  if (!summary) {
    if (summaryLoading) {
      return null; // Layout handles skeleton
    }
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            {tc("loading")}
          </p>
        </div>
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
        <ArrowLeft className="size-4" strokeWidth={ICON_STROKE} />
        <span className="text-sm font-medium">{tc("back")}</span>
      </button>
      <BudgetSettings budget={summary.budget} />
    </div>
  );
}
