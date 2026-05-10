"use client";

import Link from "next/link";

import { Wallet } from "lucide-react";

import { useTranslations } from "@/i18n/client";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="hidden lg:block border-t border-border bg-background py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" strokeWidth={1.8} />
            <span className="text-xs font-medium text-muted-foreground">
              Financentury
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("privacy")}
            </Link>
            <span className="h-3 w-px bg-border" />
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("terms")}
            </Link>
            <span className="h-3 w-px bg-border" />
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
