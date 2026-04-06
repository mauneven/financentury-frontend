"use client";

import { useLocaleStore } from "@/i18n/locale";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "es" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleLocale}
      className="text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {locale === "en" ? "ES" : "EN"}
    </Button>
  );
}
