"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { displayOrderApi } from "@/lib/api";

/** In-memory cache shared across all hook instances in a session. */
const cache = new Map<string, string[]>();

/**
 * Seeds the cache from the /auth/me response so no extra GET is needed.
 * Called once during auth initialization.
 */
export function seedDisplayOrderCache(
  orders: { scope_key: string; ordered_ids: string[] }[]
) {
  for (const o of orders) {
    cache.set(o.scope_key, o.ordered_ids);
  }
}

/**
 * Persists a visual display order for a list of items on the server.
 * The order is keyed per scope (e.g. per budget for sections) so
 * linked items can have independent positions in different budgets.
 *
 * Cache is pre-populated by auth init — no separate fetch needed.
 * Saves are debounced 2s so rapid reordering doesn't spam the API.
 * On unmount (navigation), any pending save is flushed immediately.
 */
export function useDisplayOrder<T>(
  scopeKey: string,
  items: T[],
  getId: (item: T) => string
) {
  const [savedOrder, setSavedOrder] = useState<string[]>(
    () => cache.get(scopeKey) ?? []
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIds = useRef<string[] | null>(null);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (pendingIds.current) {
      displayOrderApi.save(scopeKey, pendingIds.current).catch(() => {});
      pendingIds.current = null;
    }
  }, [scopeKey]);

  // Flush on unmount (navigation away) so order is never lost
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  const ordered = useMemo(() => {
    if (savedOrder.length === 0) return items;
    const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
    return [...items].sort((a, b) => {
      const ai = orderMap.get(getId(a));
      const bi = orderMap.get(getId(b));
      if (ai === undefined && bi === undefined) return 0;
      if (ai === undefined) return 1;
      if (bi === undefined) return -1;
      return ai - bi;
    });
  }, [items, savedOrder, getId]);

  const persist = useCallback(
    (ids: string[]) => {
      setSavedOrder(ids);
      cache.set(scopeKey, ids);
      // Track latest pending state and reset the 2s debounce on every call
      pendingIds.current = ids;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        displayOrderApi.save(scopeKey, ids).catch(() => {});
        pendingIds.current = null;
        saveTimer.current = null;
      }, 2000);
    },
    [scopeKey]
  );

  const moveUp = useCallback(
    (id: string) => {
      const ids = ordered.map(getId);
      const idx = ids.indexOf(id);
      if (idx <= 0) return;
      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      persist(ids);
    },
    [ordered, getId, persist]
  );

  const moveDown = useCallback(
    (id: string) => {
      const ids = ordered.map(getId);
      const idx = ids.indexOf(id);
      if (idx < 0 || idx >= ids.length - 1) return;
      [ids[idx + 1], ids[idx]] = [ids[idx], ids[idx + 1]];
      persist(ids);
    },
    [ordered, getId, persist]
  );

  const moveTo = useCallback(
    (id: string, toIndex: number) => {
      const ids = ordered.map(getId);
      const fromIndex = ids.indexOf(id);
      if (fromIndex < 0 || fromIndex === toIndex) return;
      const [removed] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, removed);
      persist(ids);
    },
    [ordered, getId, persist]
  );

  return { ordered, moveUp, moveDown, moveTo };
}
