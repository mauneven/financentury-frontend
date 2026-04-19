"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Wallet, X, Check } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set by the landing page when returning from /auth/callback */
  callbackState?: "loading" | "error" | null;
  callbackError?: string | null;
}

export function AuthModal({ open, onOpenChange, callbackState, callbackError }: AuthModalProps) {
  const router = useRouter();
  // Narrow selectors: destructuring the full store would re-render on unrelated
  // changes (token rotation, justLoggedIn toggle). Zustand action refs are
  // stable, so selecting them individually is safe.
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const authLoading = useAuthStore((s) => s.loading);
  const tLanding = useTranslations("landing");
  const tAuth = useTranslations("auth");

  // Local override lets us move to "success"/"error" after the initial callback prop,
  // and to "idle" on user dismiss. When null, we derive state from props + auth store.
  const [localOverride, setLocalOverride] = useState<
    "idle" | "success" | "error" | null
  >(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Derive the callback flow state from props + auth store + local override.
  // This avoids setState-in-effect cascades: the state IS the computation.
  let cbState: "idle" | "loading" | "success" | "error";
  if (localOverride !== null) {
    cbState = localOverride;
  } else if (callbackState === "error") {
    cbState = "error";
  } else if (callbackState === "loading") {
    // Auth finished resolving while we're in the callback flow — derive result.
    if (initialized && !authLoading) {
      cbState = user ? "success" : "error";
    } else {
      cbState = "loading";
    }
  } else {
    cbState = "idle";
  }

  const error =
    localError ??
    (callbackState === "error" ? callbackError ?? null : null) ??
    (cbState === "error" ? tAuth("authFailed") : null);

  // Side-effect: once we derive "success", schedule the redirect exactly once.
  // This is a real external sync (router navigation), not a setState cascade.
  const redirectScheduled = useRef(false);
  useEffect(() => {
    if (cbState === "success" && !redirectScheduled.current) {
      redirectScheduled.current = true;
      redirectTimer.current = setTimeout(() => {
        router.replace("/budgets");
      }, 1200);
    }
    if (cbState !== "success") {
      redirectScheduled.current = false;
    }
  }, [cbState, router]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  if (!open) return null;

  const handleClose = () => {
    // If in callback flow, clean URL params
    if (callbackState) {
      router.replace("/");
    }
    setLocalError(null);
    setLocalOverride("idle");
    onOpenChange(false);
  };

  // ── Callback flow UI (loading / success / error) ──
  const isCallbackFlow = cbState !== "idle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isCallbackFlow ? undefined : handleClose} />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-lg">
        {/* Close — only for idle/error states */}
        {(cbState === "idle" || cbState === "error") && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        )}

        {/* ── Callback flow states ── */}
        {cbState === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground">
              <Wallet className="size-6 text-background" strokeWidth={1.8} />
            </div>
            <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              {tAuth("signingIn")}
            </p>
          </div>
        )}

        {cbState === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-500">
              <Check className="size-7 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {tAuth("signedIn")}
            </p>
          </div>
        )}

        {cbState === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground">
              <Wallet className="size-6 text-background" strokeWidth={1.8} />
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 w-full">
              <p className="text-xs text-destructive text-center">
                {error || callbackError || tAuth("authFailed")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalOverride("idle");
                setLocalError(null);
                router.replace("/");
              }}
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {tAuth("tryAgain")}
            </button>
          </div>
        )}

        {/* ── Normal auth flow (idle) ── */}
        {cbState === "idle" && (
          <>
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-foreground">
                <Wallet className="size-6 text-background" strokeWidth={1.8} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                {tLanding("letsStart")}
              </h2>
              <p className="text-center text-sm text-muted-foreground">
                {tLanding("authDescription")}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {tAuth("continueWithGoogle")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
