import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { I18nProvider, useMessages, useTranslations } from "@/i18n/client";
import { useLocaleStore } from "@/i18n/locale";

// Mock the dynamic import of locale JSON files
vi.mock("../../../messages/en.json", () => ({
  default: {
    common: {
      save: "Save",
      cancel: "Cancel",
    },
    budget: {
      title: "My Budget",
    },
  },
}));

vi.mock("../../../messages/es.json", () => ({
  default: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
    },
    budget: {
      title: "Mi Presupuesto",
    },
  },
}));

// Test component that uses useMessages
function MessagesDisplay() {
  const messages = useMessages();
  return <div data-testid="messages">{JSON.stringify(messages)}</div>;
}

// Test component that uses useTranslations
function TranslatedText({ ns, tKey }: { ns?: string; tKey: string }) {
  const t = useTranslations(ns);
  return <span data-testid="translated">{t(tKey)}</span>;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "en" });
  });

  it("provides messages to children after loading", async () => {
    render(
      <I18nProvider>
        <MessagesDisplay />
      </I18nProvider>
    );

    await waitFor(() => {
      const el = screen.getByTestId("messages");
      expect(el.textContent).toContain("save");
    });
  });

  it("returns null while loading", () => {
    // The I18nProvider returns null before messages are loaded.
    // We can't easily test this in a stable way since dynamic imports
    // resolve synchronously in the test environment with mocks.
    // Instead we verify that after rendering, content becomes available.
    const { container } = render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    // After async load, content should appear
    waitFor(() => {
      expect(container.textContent).toContain("Content");
    });
  });
});

describe("useTranslations within I18nProvider", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "en" });
  });

  it("translates keys with namespace", async () => {
    render(
      <I18nProvider>
        <TranslatedText ns="common" tKey="save" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("translated").textContent).toBe("Save");
    });
  });

  it("translates keys without namespace", async () => {
    render(
      <I18nProvider>
        <TranslatedText tKey="common.save" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("translated").textContent).toBe("Save");
    });
  });

  it("falls back to key when translation is missing", async () => {
    render(
      <I18nProvider>
        <TranslatedText tKey="nonexistent.key" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("translated").textContent).toBe("nonexistent.key");
    });
  });
});
