"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { ThemeToggle, UserIndicator } from "./user-controls";
import { LanguageSwitcher } from "./language-switcher";

export function Navbar() {
  const tApp = useTranslations("app");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Branding */}
          <Link
            href="/budgets"
            className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground">
              <Wallet className="size-4 text-background" strokeWidth={1.8} />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-foreground">
              {tApp("title")}
            </span>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="w-px h-5 bg-border mx-1" />
            <UserIndicator />
          </div>
        </div>
      </div>
    </header>
  );
}
