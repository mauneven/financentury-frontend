"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Loading skeleton shown while auth is initializing.
 * Clean, minimal design with subtle border and rounded corners.
 */
function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar placeholder */}
      <div className="h-14 border-b border-border bg-background" />
      {/* Content spinner */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <p className="text-xs text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const loading = useAuthStore((s) => s.loading);
  const initialize = useAuthStore((s) => s.initialize);
  const router = useRouter();

  // Ensure initialize() has been called. AuthProvider already does this in
  // the root layout, but if the guard mounts before the provider effect runs
  // (e.g. direct URL navigation with slow hydration), this guarantees it.
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/");
    }
  }, [initialized, loading, user, router]);

  // Show skeleton while auth is resolving. This covers:
  // 1. Initial page load (initialized=false)
  // 2. Token validation in progress (loading=true)
  if (!initialized || loading) {
    return <AuthLoadingSkeleton />;
  }

  // After auth resolved with no user, show skeleton until the redirect
  // effect fires and navigation completes (prevents blank flash).
  if (!user) {
    return <AuthLoadingSkeleton />;
  }

  return <>{children}</>;
}
