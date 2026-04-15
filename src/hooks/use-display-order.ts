"use client";

import { useState, useCallback, useMemo, useRef } from "react";
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
      // Debounce save to avoid rapid API calls during quick reordering
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        displayOrderApi.save(scopeKey, ids).catch(() => {});
      }, 400);
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
