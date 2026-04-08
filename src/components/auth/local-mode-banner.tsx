"use client";
import { useAuthStore } from "@/store/auth-store";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

export function LocalModeBanner() {
  const { mode, signInWithGoogle } = useAuthStore();
  const t = useTranslations("localMode");

  if (mode !== "local") return null;

  return (
    <div className="mx-3 mb-2 border-2 border-amber-500 bg-amber-50 p-3 dark:border-amber-500/50 dark:bg-amber-500/10">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("warningDescription")}</p>
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0 text-xs text-amber-600 underline dark:text-amber-400"
            onClick={signInWithGoogle}
          >
            {t("signIn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
