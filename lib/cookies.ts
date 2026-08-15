"use client";

/**
 * Tiny first-party cookie store with change notification so components can
 * read cookies via useSyncExternalStore without hydration flashes.
 */

export const AGE_COOKIE = "ps_age_verified";
export const CONSENT_COOKIE = "ps_consent";

const listeners = new Set<() => void>();

export function subscribeCookies(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export function setCookie(name: string, value: string, maxAgeDays: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
    maxAgeDays * 86400
  }; samesite=lax`;
  notify();
}
