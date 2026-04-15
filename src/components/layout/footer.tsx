"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t-2 border-foreground bg-background py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-4" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Financentury
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-mono text-xs text-muted-foreground uppercase tracking-wider transition-colors hover:text-foreground"
            >
              {t("privacy")}
            </Link>
            <span className="h-3 w-px bg-border" />
            <Link
              href="/terms"
              className="font-mono text-xs text-muted-foreground uppercase tracking-wider transition-colors hover:text-foreground"
            >
              {t("terms")}
            </Link>
            <span className="h-3 w-px bg-border" />
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
