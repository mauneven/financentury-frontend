"use client";

import { useState } from "react";
import { AlertTriangle, Plus, ArrowRight, Loader2, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useBudgetStore } from "@/store/budget-store";
import { categoryApi } from "@/lib/api";
import { useTranslations } from "@/i18n/client";
import { CategoryIcon } from "@/lib/icon-picker";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionTarget {
  id: string;
  name: string;
  icon: string;
  allocation_value: number;
}

interface CategoryTarget {
  id: string;
  name: string;
  icon: string;
  allocation_value: number;
  sectionId: string;
  /** Present for linked categories — the budget that owns this category. */
  sourceBudgetId?: string;
}

// ---------------------------------------------------------------------------
// Budget-level banner
// ---------------------------------------------------------------------------

interface BudgetUnallocatedBannerProps {
  unallocatedPercent: number;
  unallocatedAmount: number;
  currency: string;
  sections: SectionTarget[];
  onCreateSection: () => void;
}

export function BudgetUnallocatedBanner({
  unallocatedPercent,
  unallocatedAmount,
  currency,
  sections,
  onCreateSection,
}: BudgetUnallocatedBannerProps) {
  const t = useTranslations("unallocated");
  const [showRedirect, setShowRedirect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const updateSection = useBudgetStore((s) => s.updateSection);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  if (unallocatedPercent <= 0) return null;

  const handleRedirect = async () => {
    if (!selectedId) return;
    const target = sections.find((s) => s.id === selectedId);
    if (!target) return;

    setRedirecting(true);
    try {
      await updateSection(selectedId, {
        allocation_value: target.allocation_value + unallocatedAmount,
      });
      await refreshSummary();
      setShowRedirect(false);
      setSelectedId(null);
    } catch {
      // Error handled by store
    } finally {
      setRedirecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {t("budgetTitle", { percent: String(unallocatedPercent) })}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {t("budgetDescription", { amount: formatCurrency(unallocatedAmount, currency) })}
          </p>

          {!showRedirect ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {sections.length >= 1 && (
                <button
                  type="button"
                  onClick={() => setShowRedirect(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                >
                  <ArrowRight className="size-3.5" strokeWidth={1.8} />
                  {t("redirectToSection")}
                </button>
              )}
              <button
                type="button"
                onClick={onCreateSection}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
                {t("createSection")}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("selectTarget")}
              </p>
              <div className="space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedId(sec.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg border",
                      selectedId === sec.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-transparent bg-background text-foreground hover:border-border"
                    )}
                  >
                    <CategoryIcon iconKey={sec.icon} className="size-4 shrink-0" />
                    <span className="text-sm font-semibold flex-1">{sec.name}</span>
                    <span className="text-xs tabular-nums opacity-70">
                      {formatCurrency(sec.allocation_value, currency)} → {formatCurrency(sec.allocation_value + unallocatedAmount, currency)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowRedirect(false); setSelectedId(null); }}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleRedirect}
                  disabled={!selectedId || redirecting}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {redirecting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t("redirecting")}
                    </span>
                  ) : (
                    t("redirect")
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section-level banner
// ---------------------------------------------------------------------------

interface SectionUnallocatedBannerProps {
  unallocatedPercent: number;
  unallocatedAmount: number;
  currency: string;
  sectionId: string;
  categories: CategoryTarget[];
  onCreateCategory: () => void;
  onTrimSection?: () => Promise<void>;
  trimTargetValue?: number;
  compact?: boolean;
}

export function SectionUnallocatedBanner({
  unallocatedPercent,
  unallocatedAmount,
  currency,
  sectionId,
  categories,
  onCreateCategory,
  onTrimSection,
  trimTargetValue,
  compact = false,
}: SectionUnallocatedBannerProps) {
  const t = useTranslations("unallocated");
  const [showRedirect, setShowRedirect] = useState(false);
  const [confirmTrim, setConfirmTrim] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const updateCategory = useBudgetStore((s) => s.updateCategory);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  if (unallocatedPercent <= 0) return null;

  const handleTrim = async () => {
    if (!onTrimSection) return;
    setTrimming(true);
    try {
      await onTrimSection();
      setConfirmTrim(false);
    } catch {
      // Error handled by store
    } finally {
      setTrimming(false);
    }
  };

  const handleRedirect = async () => {
    if (!selectedId) return;
    const target = categories.find((c) => c.id === selectedId);
    if (!target) return;

    setRedirecting(true);
    try {
      const newValue = target.allocation_value + unallocatedAmount;
      if (target.sourceBudgetId) {
        // Linked category — update in the source budget
        await categoryApi.update(target.sourceBudgetId, target.sectionId, selectedId, {
          allocation_value: newValue,
        });
      } else {
        await updateCategory(sectionId, selectedId, {
          allocation_value: newValue,
        });
      }
      await refreshSummary();
      setShowRedirect(false);
      setSelectedId(null);
    } catch {
      // Error handled by store
    } finally {
      setRedirecting(false);
    }
  };

  if (compact) {
    return (
      <div className="mt-3 flex items-center gap-2 px-1 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.8} />
        <span className="text-xs font-medium">
          {t("sectionTitle", { percent: String(unallocatedPercent) })}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {t("sectionTitle", { percent: String(unallocatedPercent) })}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {t("sectionDescription", { amount: formatCurrency(unallocatedAmount, currency) })}
          </p>

          {!showRedirect && !confirmTrim ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.length >= 1 && (
                <button
                  type="button"
                  onClick={() => setShowRedirect(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                >
                  <ArrowRight className="size-3.5" strokeWidth={1.8} />
                  {t("redirectToCategory")}
                </button>
              )}
              <button
                type="button"
                onClick={onCreateCategory}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="size-3.5" strokeWidth={1.8} />
                {t("createCategory")}
              </button>
              {onTrimSection && trimTargetValue !== undefined && (
                <button
                  type="button"
                  onClick={() => setConfirmTrim(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 bg-background text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Minus className="size-3.5" strokeWidth={1.8} />
                  {t("trimSection")}
                </button>
              )}
            </div>
          ) : confirmTrim ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {t("trimSectionConfirm", {
                  from: formatCurrency((trimTargetValue ?? 0) + unallocatedAmount, currency),
                  to: formatCurrency(trimTargetValue ?? 0, currency),
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmTrim(false)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleTrim}
                  disabled={trimming}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {trimming ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t("trimming")}
                    </span>
                  ) : (
                    t("confirm")
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("selectTarget")}
              </p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedId(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg border",
                      selectedId === cat.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-transparent bg-background text-foreground hover:border-border"
                    )}
                  >
                    <CategoryIcon iconKey={cat.icon} className="size-4 shrink-0" />
                    <span className="text-sm font-semibold flex-1">{cat.name}</span>
                    <span className="text-xs tabular-nums opacity-70">
                      {formatCurrency(cat.allocation_value, currency)} → {formatCurrency(cat.allocation_value + unallocatedAmount, currency)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowRedirect(false); setSelectedId(null); }}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleRedirect}
                  disabled={!selectedId || redirecting}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {redirecting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t("redirecting")}
                    </span>
                  ) : (
                    t("redirect")
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
