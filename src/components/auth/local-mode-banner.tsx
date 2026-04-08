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
    <div className="border-b-2 border-red-500 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10">
      <div className="flex items-center gap-3 px-4 py-2">
        <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          {t("title")}
        </span>
        <span className="hidden sm:block text-xs text-red-600 dark:text-red-400 truncate">
          {t("description")}
        </span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs font-bold text-red-700 underline dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
            onClick={signInWithGoogle}
          >
            {t("signIn")}
          </Button>
          <button
            onClick={handleClose}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
