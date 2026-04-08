"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { localBudgetStorage } from "@/lib/local-storage";
import { authApi } from "@/lib/api";
import { useBudgetStore } from "@/store/budget-store";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const t = useTranslations("migration");
  const [migrating, setMigrating] = useState(false);
  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);
  const budgetCount = localBudgetStorage.getBudgets().length;

  const handleSave = async () => {
    setMigrating(true);
    try {
      const payload = localBudgetStorage.getMigrationPayload();
      await authApi.migrate(payload);
      localBudgetStorage.clearAll();
      await fetchBudgets();
      onOpenChange(false);
    } catch {
      setMigrating(false);
    }
  };

  const handleDiscard = async () => {
    localBudgetStorage.clearAll();
    await fetchBudgets();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description").replace("{count}", String(budgetCount))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={migrating}>
            {migrating ? t("migrating") : t("saveToAccount")}
          </Button>
          <Button variant="outline" onClick={handleDiscard} disabled={migrating}>
            {t("discardLocal")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
