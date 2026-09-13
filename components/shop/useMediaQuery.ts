"use client";

import { useSyncExternalStore } from "react";

/** SSR-safe media query (server snapshot = false). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP_QUERY = "(min-width: 768px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
