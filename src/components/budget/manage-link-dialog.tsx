"use client";

import { useState } from "react";
import { Loader2, Check, Trash2 } from "lucide-react";
import type { BudgetLink } from "@/types/budget";
import { useBudgetStore } from "@/store/budget-store";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ManageLinkDialogProps {
  link: BudgetLink;
  sourceBudgetName: string;
  sectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageLinkDialog({
  link,
  sourceBudgetName,
  sectionName,
  open,
  onOpenChange,
}: ManageLinkDialogProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const updateLink = useBudgetStore((s) => s.updateLink);
  const deleteLink = useBudgetStore((s) => s.deleteLink);

  const [filterMode, setFilterMode] = useState<"all" | "mine">(link.filter_mode);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const hasChanges = filterMode !== link.filter_mode;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await updateLink(link.id, { filter_mode: filterMode });
      onOpenChange(false);
    } catch {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await deleteLink(link.id);
      onOpenChange(false);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("manageLink")}</DialogTitle>
          <DialogDescription>
            {sourceBudgetName} &rarr; {sectionName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter mode */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("filterMode")}</p>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors",
                filterMode === "all"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-border"
              )}
            >
              <div className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                filterMode === "all" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
              )}>
                {filterMode === "all" && <Check className="size-3" />}
              </div>
              <span className="font-semibold">{t("filterAll")}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("mine")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left border transition-colors",
                filterMode === "mine"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-border"
              )}
            >
              <div className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                filterMode === "mine" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"
              )}>
                {filterMode === "mine" && <Check className="size-3" />}
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
                    disabled={removing}
                    className="flex-1"
                  >
                    {removing && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {removing ? t("removing") : t("removeLink")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmRemove(false)}
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
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="size-4" />
                {t("removeLink")}
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? t("saving") : tc("save")}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            {tc("cancel")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
