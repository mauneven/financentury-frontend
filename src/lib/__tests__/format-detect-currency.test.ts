import { describe, expect, it, vi } from "vitest";

import { detectCurrency } from "@/lib/format";

describe("detectCurrency", () => {
  it("returns 'COP' for Colombian locale (es-CO)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-CO");
    expect(detectCurrency()).toBe("COP");
  });

  it("returns 'USD' for US locale (en-US)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    expect(detectCurrency()).toBe("USD");
  });

  it("returns 'GBP' for UK locale (en-GB)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-GB");
    expect(detectCurrency()).toBe("GBP");
  });

  it("returns 'EUR' for German locale (de-DE)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
    expect(detectCurrency()).toBe("EUR");
  });

  it("returns 'EUR' for French locale (fr-FR)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
    expect(detectCurrency()).toBe("EUR");
  });

  it("returns 'EUR' for Spanish locale (es-ES)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-ES");
    expect(detectCurrency()).toBe("EUR");
  });

  it("returns 'MXN' for Mexican locale (es-MX)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-MX");
    expect(detectCurrency()).toBe("MXN");
  });

  it("returns 'BRL' for Brazilian locale (pt-BR)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");
    expect(detectCurrency()).toBe("BRL");
  });

  it("returns 'ARS' for Argentine locale (es-AR)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-AR");
    expect(detectCurrency()).toBe("ARS");
  });

  it("returns 'CLP' for Chilean locale (es-CL)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-CL");
    expect(detectCurrency()).toBe("CLP");
  });

  it("returns 'PEN' for Peruvian locale (es-PE)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("es-PE");
    expect(detectCurrency()).toBe("PEN");
  });

  it("returns 'USD' for unknown region (ja-JP)", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("ja-JP");
    expect(detectCurrency()).toBe("USD");
  });

  it("returns 'USD' for locale without region code", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en");
    expect(detectCurrency()).toBe("USD");
  });

  it("returns 'USD' when navigator.language throws", () => {
    vi.spyOn(navigator, "language", "get").mockImplementation(() => {
      throw new Error("not available");
    });
    expect(detectCurrency()).toBe("USD");
  });
});
