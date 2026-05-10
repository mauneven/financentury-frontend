"use client";

import { useState } from "react";

import { Check, Loader2, Trash2 } from "lucide-react";

import { useDeleteLink, useUpdateLink } from "@/hooks/use-budget-queries";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { BudgetLink } from "@/types/budget";

type FilterMode = "all" | "mine";

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

interface ManageLinkDialogProps {
  link: BudgetLink;
  sourceBudgetName: string;
  /** Name of the linked category (replaces the old sectionName prop). */
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageLinkDialog({
  link,
  sourceBudgetName,
  categoryName,
  open,
  onOpenChange,
}: ManageLinkDialogProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const updateLinkMut = useUpdateLink(link.target_budget_id);
  const deleteLinkMut = useDeleteLink(link.target_budget_id);

  const [filterMode, setFilterMode] = useState<FilterMode>(link.filter_mode);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = saving || removing;
  const hasChanges = filterMode !== link.filter_mode;

  const handleSave = async () => {
    if (!hasChanges) return;
    setError(null);
    setSaving(true);
    try {
      await updateLinkMut.mutateAsync({ linkId: link.id, filterMode });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    try {
      await deleteLinkMut.mutateAsync(link.id);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("manageLink")}</DialogTitle>
          <DialogDescription>
            {sourceBudgetName} &rarr; {categoryName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter mode */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("filterMode")}</p>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              disabled={busy}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors disabled:opacity-60",
                filterMode === "all"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-border"
              )}
            >
              <div className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                filterMode === "all" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
              )}>
                {filterMode === "all" && <Check className="size-3" strokeWidth={1.8} />}
              </div>
              <span className="font-semibold">{t("filterAll")}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("mine")}
              disabled={busy}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors disabled:opacity-60",
                filterMode === "mine"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-border"
              )}
            >
              <div className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                filterMode === "mine" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
              )}>
                {filterMode === "mine" && <Check className="size-3" strokeWidth={1.8} />}
              </div>
              <span className="font-semibold">{t("filterMine")}</span>
            </button>
          </div>

          {/* Remove link */}
          <div className="border-t border-border pt-4">
            {confirmRemove ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("removeLinkConfirm")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={busy}
                    aria-busy={removing}
                    className="flex-1"
                  >
                    {removing && <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.8} />}
                    {removing ? t("removing") : t("removeLink")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                    className="flex-1"
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
                className="flex items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="size-4" strokeWidth={1.8} />
                {t("removeLink")}
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!hasChanges || busy} aria-busy={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.8} />}
            {saving ? t("saving") : tc("save")}
          </Button>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            {tc("cancel")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
