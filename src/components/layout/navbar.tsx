"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { ThemeToggle, UserIndicator } from "./user-controls";
import { LanguageSwitcher } from "./language-switcher";

export function Navbar() {
  const tApp = useTranslations("app");

  return (
    <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Branding */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80"
          >
            <div className="flex size-8 items-center justify-center bg-foreground">
              <Wallet className="size-4 text-background" />
            </div>
            <span className="hidden sm:block text-sm font-bold uppercase tracking-widest text-foreground">
              {tApp("title")}
            </span>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="w-px h-5 bg-foreground/20 mx-1" />
            <UserIndicator />
          </div>
        </div>
      </div>
    </header>
  );
}
