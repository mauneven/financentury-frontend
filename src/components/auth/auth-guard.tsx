"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, initialized, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !session && !loading) {
      router.replace("/login");
    }
  }, [initialized, session, loading, router]);

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;
  return <>{children}</>;
}
