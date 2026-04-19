"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Sanitize an error message that will be placed in a URL query string and
 * later rendered as text. Strips HTML-ish characters and hard-caps length to
 * prevent phishing-style messages in attacker-crafted URLs. React already
 * escapes children, so this is defense-in-depth.
 */
function safeErrorParam(msg: string | undefined | null): string {
  const s = typeof msg === "string" ? msg : "";
  const cleaned = s.replace(/[<>]/g, "").trim();
  const capped = cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
  return capped || "Authentication failed";
}

function CallbackHandler() {
  const searchParams = useSearchParams();
  // Narrow selector: only this action is used, and it's a stable ref.
  const handleGoogleCallback = useAuthStore((s) => s.handleGoogleCallback);
  const called = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-firing this effect.
    if (called.current) return;
    called.current = true;

    // Reject OAuth error responses from the provider (e.g. user denied
    // access, invalid_scope). Don't blindly propagate the provider's raw
    // error text back into the URL.
    const oauthError = searchParams.get("error");
    if (oauthError) {
      window.location.replace(
        "/?auth=error&message=" + encodeURIComponent(safeErrorParam(oauthError))
      );
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      window.location.replace(
        "/?auth=error&message=" + encodeURIComponent("No auth code received")
      );
      return;
    }
    handleGoogleCallback(code)
      .then(() => {
        window.location.replace("/?auth=loading");
      })
      .catch((err: Error) => {
        window.location.replace(
          "/?auth=error&message=" + encodeURIComponent(safeErrorParam(err?.message))
        );
      });
  }, [searchParams, handleGoogleCallback]);

  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoadingSpinner />
      <CallbackHandler />
    </Suspense>
  );
}
