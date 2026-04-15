"use client";

import { useRef, useLayoutEffect, useCallback } from "react";

const DURATION = 280;
const EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

/**
 * FLIP animation for reorderable lists.
 *
 * 1. Add `data-flip-key="<id>"` to each direct child of the container.
 * 2. Call `capturePositions()` immediately before updating the list order.
 * 3. Attach `ref` to the list container element.
 *
 * After React re-renders, items that moved will animate from their old
 * position to their new one.
 */
export function useFlipList() {
  const containerRef = useRef<HTMLElement | null>(null);
  const snapshotRef = useRef<Map<string, number>>(new Map());
  const pendingRef = useRef(false);

  const capturePositions = useCallback(() => {
    if (!containerRef.current) return;
    const snapshot = new Map<string, number>();
    for (const child of Array.from(containerRef.current.children)) {
      const key = (child as HTMLElement).dataset.flipKey;
      if (key) snapshot.set(key, child.getBoundingClientRect().top);
    }
    snapshotRef.current = snapshot;
    pendingRef.current = true;
  }, []);

  // Runs after every render; only acts when capturePositions was called.
  useLayoutEffect(() => {
    if (!pendingRef.current || !containerRef.current) return;
    pendingRef.current = false;

    for (const child of Array.from(containerRef.current.children)) {
      const key = (child as HTMLElement).dataset.flipKey;
      if (!key) continue;
      const oldTop = snapshotRef.current.get(key);
      if (oldTop === undefined) continue;
      const newTop = child.getBoundingClientRect().top;
      const deltaY = oldTop - newTop;
      if (Math.abs(deltaY) < 1) continue;

      const el = child as HTMLElement;
      el.style.transition = "none";
      el.style.transform = `translateY(${deltaY}px)`;

      // Double rAF: first frame applies the transform, second starts the transition.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = `transform ${DURATION}ms ${EASING}`;
          el.style.transform = "";
          const cleanup = () => {
            el.style.transition = "";
            el.removeEventListener("transitionend", cleanup);
          };
          el.addEventListener("transitionend", cleanup);
        });
      });
    }

    snapshotRef.current = new Map();
  });

  const ref = useCallback((el: HTMLElement | null) => {
    containerRef.current = el;
  }, []);

  return { ref, capturePositions };
}
