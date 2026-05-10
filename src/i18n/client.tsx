"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocaleStore } from "./locale";

type Messages = Record<string, unknown>;

const MessagesContext = createContext<Messages>({});

export function useMessages(): Messages {
  return useContext(MessagesContext);
}

/**
 * Simple translation hook. Supports dot-notation keys.
 * Example: t("sidebar.myBudgets") -> looks up messages.sidebar.myBudgets
 *
 * The returned `t` function is memoized on `messages` + `namespace` so
 * downstream React Compiler / hand-written memos don't see a new reference
 * every render. That matters because many components call
 * `useTranslations()` repeatedly and pass `t` into child props.
 */
export function useTranslations(namespace?: string) {
  const messages = useMessages();

  return useMemo(() => {
    return function t(
      key: string,
      params?: Record<string, string | number>
    ): string {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const parts = fullKey.split(".");
      let value: unknown = messages;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return fullKey; // Fallback to key
        }
      }

      if (typeof value !== "string") return fullKey;

      // Replace {param} placeholders. We avoid the per-param RegExp
      // allocation of the previous implementation by scanning the string
      // once with a shared placeholder pattern.
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_m, k: string) =>
          k in params ? String(params[k]) : `{${k}}`
        );
      }

      return value;
    };
  }, [messages, namespace]);
}

// Client-side provider that loads messages based on locale
export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocaleStore();
  const [messages, setMessages] = useState<Messages>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import(`../../messages/${locale}.json`)
      .then((mod) => {
        setMessages(mod.default);
        setLoaded(true);
      })
      .catch(() => {
        // Fallback to English
        import("../../messages/en.json").then((mod) => {
          setMessages(mod.default);
          setLoaded(true);
        });
      });
  }, [locale]);

  if (!loaded) return null;

  return (
    <MessagesContext.Provider value={messages}>
      {children}
    </MessagesContext.Provider>
  );
}
