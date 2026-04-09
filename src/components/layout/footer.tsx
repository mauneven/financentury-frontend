"use client";

import { useTranslations } from "@/i18n/client";

export function Footer() {
  const tApp = useTranslations("app");

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-foreground bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>© {currentYear} {tApp("title")}. All rights reserved.</p>
          <p className="text-xs uppercase tracking-widest">{tApp("description")}</p>
        </div>
      </div>
    </footer>
  );
}
