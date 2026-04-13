"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const { handleGoogleCallback } = useAuthStore();
  const called = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-firing this effect.
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");
    if (!code) {
      window.location.replace("/?auth=error&message=" + encodeURIComponent("No auth code received"));
      return;
    }
    handleGoogleCallback(code)
      .then(() => {
        window.location.replace("/?auth=loading");
      })
      .catch((err: Error) => {
        window.location.replace("/?auth=error&message=" + encodeURIComponent(err.message));
      });
  }, [searchParams, handleGoogleCallback]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </div>
    </div>
  );
}
