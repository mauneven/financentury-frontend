"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Holds a value for a fixed duration then clears it. Encapsulates the timer
 * lifecycle so callers don't have to manage refs + cleanup themselves.
 *
 * Used for ephemeral UI signals like "Copied!" badges, where setting a flag
 * for N ms is the natural shape of the interaction.
 */
export function useTransientFlag<T>(durationMs: number) {
  const [value, setValue] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(
    (next: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setValue(next);
      timerRef.current = setTimeout(() => {
        setValue(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return [value, trigger] as const;
}
