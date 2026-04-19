"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, AlertCircle, CheckCircle2, Wallet } from "lucide-react";

import { inviteApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ICON_STROKE = 1.8;

interface InviteInfo {
  budget_name: string;
  inviter_name: string;
  expires_at: string;
  is_expired: boolean;
  is_used: boolean;
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const t = useTranslations("invite");
  const tAuth = useTranslations("auth");
  // Narrow selectors — avoid re-renders on unrelated auth-store changes.
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const initialized = useAuthStore((s) => s.initialized);

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const budget = await inviteApi.accept(params.token);
      setAccepted(true);
      setTimeout(() => {
        router.push(`/budget/${budget.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invalidLink"));
      setAccepting(false);
    }
  }, [params.token, router, t]);

  // Fetch invite info (no auth needed)
  useEffect(() => {
    if (!params.token) return;
    inviteApi
      .getInfo(params.token)
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t("invalidLink"));
        setLoading(false);
      });
  }, [params.token, t]);

  // Auto-accept if user just logged in and we have a valid invite
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (initialized && user && info && !info.is_expired && !info.is_used && !accepted && !accepting) {
      // Check if we were redirected back after login. We store the token +
      // a timestamp so stale pending-invite entries (e.g. stored days ago)
      // can't auto-accept without the user re-initiating the flow.
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("pending_invite");
        if (raw) {
          let pendingToken: string | null = null;
          let pendingAt = 0;
          try {
            const parsed = JSON.parse(raw) as { token?: unknown; at?: unknown };
            if (typeof parsed.token === "string") pendingToken = parsed.token;
            if (typeof parsed.at === "number") pendingAt = parsed.at;
          } catch {
            // Ignore malformed entries.
          }
          // Accept only if: token matches, timestamp is fresh (<10 min),
          // and params.token looks like a plausible invite token (guards
          // against weird path values being auto-executed).
          const isFresh = pendingAt > 0 && Date.now() - pendingAt < 10 * 60 * 1000;
          const tokenLooksValid =
            typeof params.token === "string" &&
            params.token.length > 0 &&
            params.token.length < 512 &&
            /^[A-Za-z0-9_.\-~]+$/.test(params.token);
          sessionStorage.removeItem("pending_invite");
          if (pendingToken === params.token && isFresh && tokenLooksValid) {
            timeoutId = setTimeout(() => {
              void handleAccept();
            }, 0);
          }
        }
      }
    }
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialized, user, info, accepted, accepting, params.token, handleAccept]);

  const handleSignInAndAccept = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "pending_invite",
        JSON.stringify({ token: params.token, at: Date.now() })
      );
    }
    signInWithGoogle();
  };

  // Loading state
  if (loading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </div>
    );
  }

  // Error state - invalid link
  if (error && !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" strokeWidth={ICON_STROKE} />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold">{error}</h1>
            </div>
            <Button variant="outline" onClick={() => router.push("/budgets")}>
              {t("budgetName")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired or used
  const isInvalid = info?.is_expired || info?.is_used;

  // Accepted state
  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-6 text-emerald-600" strokeWidth={ICON_STROKE} />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold">{t("acceptSuccess")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {info?.budget_name}
              </p>
            </div>
            <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={ICON_STROKE} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8">
          {/* Branding */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground shadow-lg">
              <Wallet className="size-6 text-background" strokeWidth={ICON_STROKE} />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">Financentury</h1>
            </div>
          </div>

          {/* Invite info */}
          <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="size-5 text-primary" strokeWidth={ICON_STROKE} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">{t("invitedBy")}</p>
              <p className="font-medium">{info?.inviter_name}</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">{t("budgetName")}</p>
              <p className="font-semibold text-lg">{info?.budget_name}</p>
            </div>
            {info?.expires_at && !isInvalid && (
              <p className="text-xs text-muted-foreground">
                {t("expires")}: {new Date(info.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="w-full rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Invalid states */}
          {isInvalid ? (
            <div className="w-full rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              {info?.is_expired ? t("expired") : t("used")}
            </div>
          ) : user ? (
            /* Logged in - accept directly */
            <Button
              size="lg"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={accepting}
              onClick={() => void handleAccept()}
            >
              {accepting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={ICON_STROKE} />
                  {t("accepting")}
                </>
              ) : (
                <>
                  <Users className="size-4 mr-2" strokeWidth={ICON_STROKE} />
                  {t("accept")}
                </>
              )}
            </Button>
          ) : (
            /* Not logged in - sign in first */
            <div className="flex w-full flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground text-center">
                {t("signInToAccept")}
              </p>
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-3 text-sm font-medium"
                onClick={handleSignInAndAccept}
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {tAuth("continueWithGoogle")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
