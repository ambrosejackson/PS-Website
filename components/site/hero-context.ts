"use client";

import { createContext, useContext } from "react";
import type { HeroTheme } from "@/lib/luminance";

/**
 * Bridge between the Header and the hero behind it. The HeroSwitcher provides
 * the active asset's theme (drives header text color, guardrail #5) and receives
 * nav hover events (hero hover-swap, build plan decision 8).
 */
export interface HeroChrome {
  theme: HeroTheme;
  navEnter: (navTarget: string) => void;
  navLeave: () => void;
}

export const HeroContext = createContext<HeroChrome | null>(null);

const NO_HERO: HeroChrome = {
  theme: "dark",
  navEnter: () => {},
  navLeave: () => {},
};

/** Safe outside a provider — defaults to a dark asset (white header text). */
export function useHeroChrome(): HeroChrome {
  return useContext(HeroContext) ?? NO_HERO;
}
