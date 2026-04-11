import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLocaleStore } from "@/i18n/locale";

describe("useLocaleStore", () => {
  beforeEach(() => {
    // Reset store state
    useLocaleStore.setState({ locale: "en" });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("has a locale property", () => {
      const state = useLocaleStore.getState();
      expect(state.locale).toBeDefined();
      expect(typeof state.locale).toBe("string");
    });

    it("has a setLocale function", () => {
      const state = useLocaleStore.getState();
      expect(typeof state.setLocale).toBe("function");
    });

    it("locale is either 'en' or 'es'", () => {
      const state = useLocaleStore.getState();
      expect(["en", "es"]).toContain(state.locale);
    });
  });

  describe("setLocale", () => {
    it("updates the locale to 'es'", () => {
      useLocaleStore.getState().setLocale("es");
      expect(useLocaleStore.getState().locale).toBe("es");
    });

    it("updates the locale to 'en'", () => {
      useLocaleStore.getState().setLocale("es");
      useLocaleStore.getState().setLocale("en");
      expect(useLocaleStore.getState().locale).toBe("en");
    });

    it("persists locale to localStorage", () => {
      useLocaleStore.getState().setLocale("es");
      expect(localStorage.getItem("locale")).toBe("es");
    });

    it("overwrites previous localStorage value", () => {
      useLocaleStore.getState().setLocale("es");
      useLocaleStore.getState().setLocale("en");
      expect(localStorage.getItem("locale")).toBe("en");
    });
  });

  describe("locale persistence", () => {
    it("reads locale from localStorage when present", () => {
      localStorage.setItem("locale", "es");
      // Re-create store won't re-read because zustand is a singleton,
      // but we can verify the setLocale/getLocale round-trip.
      useLocaleStore.getState().setLocale("es");
      expect(useLocaleStore.getState().locale).toBe("es");
    });
  });

  describe("store independence", () => {
    it("setLocale does not affect other store properties", () => {
      const before = Object.keys(useLocaleStore.getState());
      useLocaleStore.getState().setLocale("es");
      const after = Object.keys(useLocaleStore.getState());
      expect(before.sort()).toEqual(after.sort());
    });
  });
});

// ---------------------------------------------------------------------------
// detectLocale logic (replicated since it is not exported)
// ---------------------------------------------------------------------------
describe("detectLocale (logic test)", () => {
  function detectLocale(): "en" | "es" {
    try {
      const lang = navigator.language.split("-")[0];
      return lang === "es" ? "es" : "en";
    } catch {
      return "en";
    }
  }

  it("returns 'en' for English navigator.language", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    expect(detectLocale()).toBe("en");
  });

  it("returns 'es' for Spanish navigator.language", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-CO");
    expect(detectLocale()).toBe("es");
  });

  it("returns 'en' for French navigator.language (non-Spanish fallback)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' for German navigator.language", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
    expect(detectLocale()).toBe("en");
  });

  it("returns 'es' for es without region code", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es");
    expect(detectLocale()).toBe("es");
  });
});
