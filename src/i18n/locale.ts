"use client";

import { create } from "zustand";

export type Locale = "en" | "es";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: (typeof window !== "undefined"
    ? (localStorage.getItem("locale") as Locale) || detectLocale()
    : "en") as Locale,
  setLocale: (locale: Locale) => {
    localStorage.setItem("locale", locale);
    set({ locale });
    window.location.reload();
  },
}));

function detectLocale(): Locale {
  try {
    const lang = navigator.language.split("-")[0];
    return lang === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}
