"use client";

import { useParams, useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft } from "lucide-react";
import { formatCompact, getPercentage, getProgressColor, getProgressTextColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icon-picker";
import { useEffect } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function SectionReportsPage() {
  const params = useParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const summary = useBudgetStore((s) => s.summary);
  const mode = useAuthStore((s) => s.mode);
  const budgetBase = mode === "local" ? "localBudget" : "budget";

  const sectionSummary = summary?.sections.find(
    (s) => s.section.id === params.sectionId
  );

  useEffect(() => {
    if (summary && !sectionSummary) {
      router.push(`/${budgetBase}/${params.id}`);
    }
  }, [summary, sectionSummary, router, budgetBase, params.id]);

  if (!summary || !sectionSummary) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
        Cargando...
      </div>
    );
  }

  const { section, categories, allocated_amount, total_spent } = sectionSummary;
  const currency = summary.budget.currency;
  const remaining = allocated_amount - total_spent;
  const percentage = getPercentage(total_spent, allocated_amount);
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.push(`/${budgetBase}/${params.id}`)}
          className="mt-1 flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-3">
          <CategoryIcon iconKey={section.icon} className="size-8" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {section.name}
            </h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Informes · {section.allocation_percent}% del presupuesto
            </p>
          </div>
        </div>
      </div>

      {/* Stats totales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Presupuestado</p>
          <p className="text-xl font-bold tabular-nums font-mono">
            {formatCompact(allocated_amount, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Gastado</p>
          <p className={cn("text-xl font-bold tabular-nums font-mono", textColor)}>
            {formatCompact(total_spent, currency)}
          </p>
        </div>
        <div className="border-2 border-foreground bg-card p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold">Restante</p>
          <p className={cn(
            "text-xl font-bold tabular-nums font-mono",
            remaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
          )}>
            {remaining < 0 ? "-" : ""}{formatCompact(Math.abs(remaining), currency)}
          </p>
        </div>
      </div>

      {/* Progress bar general */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Uso del presupuesto</span>
          <span className={cn("text-sm font-bold tabular-nums font-mono", textColor)}>{percentage}%</span>
        </div>
        <div className="h-4 w-full overflow-hidden bg-muted border border-border">
          <div
            className={cn("h-full transition-all duration-500", progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Desglose por categorías */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-widest border-b-2 border-foreground pb-2">
          Categorías · {categories.length}
        </h2>

        {categories.length === 0 ? (
          <div className="border-2 border-foreground bg-card p-8 text-center text-muted-foreground">
            Esta sección no tiene categorías.
          </div>
        ) : (
          categories.map((cat) => {
            const catPct = getPercentage(cat.total_spent, cat.allocated_amount);
            const catProgressColor = getProgressColor(catPct);
            const catTextColor = getProgressTextColor(catPct);
            const catRemaining = cat.allocated_amount - cat.total_spent;
            const shareOfSection = allocated_amount > 0
              ? Math.round((cat.allocated_amount / allocated_amount) * 100)
              : 0;

            return (
              <div key={cat.category.id} className="border-2 border-foreground bg-card">
                <div className="p-5">
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CategoryIcon iconKey={cat.category.icon} className="size-5" />
                      <div>
                        <p className="font-bold text-foreground">{cat.category.name}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {shareOfSection}% de la sección
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-bold tabular-nums font-mono", catTextColor)}>
                        {catPct}%
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">usado</p>
                    </div>
                  </div>

                  {/* Category progress */}
                  <div className="h-3 w-full overflow-hidden bg-muted mb-3">
                    <div
                      className={cn("h-full transition-all duration-500", catProgressColor)}
                      style={{ width: `${Math.min(catPct, 100)}%` }}
                    />
                  </div>

                  {/* Category numbers */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Asignado</p>
                      <p className="text-sm font-bold tabular-nums font-mono">
                        {formatCompact(cat.allocated_amount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Gastado</p>
                      <p className={cn("text-sm font-bold tabular-nums font-mono", catTextColor)}>
                        {formatCompact(cat.total_spent, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Restante</p>
                      <p className={cn(
                        "text-sm font-bold tabular-nums font-mono",
                        catRemaining < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"
                      )}>
                        {catRemaining < 0 ? "-" : ""}{formatCompact(Math.abs(catRemaining), currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
