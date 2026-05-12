"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTheme } from "next-themes";
import type { Ref } from "react";

import { useLocaleStore } from "@/i18n/locale";

/**
 * The publishable Turnstile site key, read from `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 *
 * NEVER put the secret key here — anything prefixed with `NEXT_PUBLIC_` is
 * shipped to the browser. The secret key lives on the backend.
 *
 * The site key may be undefined / empty in local dev. When that's the case
 * the widget renders nothing (`isTurnstileConfigured()` returns false) and
 * the surrounding form can submit without a token. The backend's verifier
 * MUST be the source of truth on whether to reject unverified requests in
 * production.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function isTurnstileConfigured(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}

/** Imperative handle exposed to parents so they can reset the widget. */
export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Fires once Cloudflare hands us a one-shot verification token. */
  onToken: (token: string) => void;
  /** Fires when the widget hits an error (network, blocked, etc.). */
  onError?: () => void;
  /** Fires when an issued token expires before it was used. */
  onExpire?: () => void;
  /**
   * Cloudflare action tag — surfaced in dashboard analytics so the team
   * can break out widget metrics per call-site (sign-in vs. invite preview).
   */
  action?: string;
  /** "normal" (default) | "compact" | "flexible" | "invisible". */
  size?: "normal" | "compact" | "flexible" | "invisible";
  /** Ref handle for imperative resets after a failed submission. */
  ref?: Ref<TurnstileWidgetHandle>;
}

/**
 * Thin wrapper around `@marsidev/react-turnstile` that:
 *
 * 1. Gracefully no-ops when the site key isn't configured (local dev, tests).
 * 2. Threads the app's light/dark theme through to the widget so it isn't
 *    a jarring white box on a dark page.
 * 3. Localizes the challenge to the user's selected locale.
 * 4. Exposes a stable `reset()` imperative API — Turnstile tokens are
 *    one-shot, so after a failed login the parent must reset before the
 *    user can try again.
 */
export function TurnstileWidget({
  onToken,
  onError,
  onExpire,
  action,
  size = "flexible",
  ref,
}: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const { resolvedTheme } = useTheme();
  const locale = useLocaleStore((s) => s.locale);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => turnstileRef.current?.reset(),
    }),
    []
  );

  // Remove the widget from the DOM on unmount. The library handles its own
  // teardown for the React tree but the injected iframe can briefly linger
  // if the parent unmounts mid-challenge — explicit `.remove()` is cheap
  // insurance.
  useEffect(() => {
    const instance = turnstileRef.current;
    return () => {
      instance?.remove();
    };
  }, []);

  if (!isTurnstileConfigured()) {
    return null;
  }

  return (
    <Turnstile
      ref={turnstileRef}
      siteKey={TURNSTILE_SITE_KEY}
      onSuccess={onToken}
      onError={onError}
      onExpire={onExpire}
      options={{
        action,
        size,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        language: locale,
        appearance: "interaction-only",
      }}
    />
  );
}
