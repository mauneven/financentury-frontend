"use client";
import { useAuthStore } from "@/store/auth-store";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { useState, useEffect } from "react";

export function LocalModeBanner() {
  const { mode, signInWithGoogle } = useAuthStore();
  const t = useTranslations("localMode");
  const [isOpen, setIsOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const closed = localStorage.getItem("localMode-banner-closed");
    setIsOpen(!closed);
    setIsHydrated(true);
  }, []);

  if (mode !== "local" || !isOpen || !isHydrated) return null;

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("localMode-banner-closed", "true");
  };

  return (
    <div className="mx-3 mb-2 border-2 border-red-500 bg-red-50 p-3 dark:border-red-500/50 dark:bg-red-500/10">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-red-700 dark:text-red-400">{t("title")}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle className="size-3.5 text-red-500" />
          <button
            onClick={handleClose}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
        {t("description")}
      </p>
      <Button
        variant="link"
        size="sm"
        className="mt-2 h-auto p-0 text-xs font-bold text-red-700 underline dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
        onClick={signInWithGoogle}
      >
        {t("signIn")}
      </Button>
    </div>
  );
}
