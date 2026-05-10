"use client";

import { QueryClient } from "@tanstack/react-query";

/**
 * Builds a QueryClient configured for this app's traffic profile:
 *
 * - `staleTime` 30s — matches the backend's in-memory summary/trends cache
 *   so client + server invalidate at roughly the same cadence.
 * - `gcTime` 5min — components remount frequently (route transitions);
 *   keeping inactive cache around for 5min avoids re-fetch on back nav.
 * - `retry` 1 — single retry on transient failures, no exponential storm.
 * - `refetchOnWindowFocus` true — picks up server-side mutations from
 *   collaborators when the user tabs back in.
 * - `refetchOnReconnect` true — same for offline → online transitions.
 *
 * The factory shape (function returning a fresh client) is required for
 * SSR / Server Components: each request gets its own cache instance.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
