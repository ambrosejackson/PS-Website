"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Header } from "@/components/site/Header";
import { HeroContext } from "@/components/site/hero-context";
import { FALLBACK_HERO, type HeroAsset } from "@/lib/data";

/**
 * Full-bleed hero flush to the viewport top with the Header overlaid
 * (guardrail #5) and nav-hover media swapping (build plan decision 8):
 * hovering a right-nav item swaps to its mapped asset and it stays while the
 * cursor remains over the nav item or the hero; ~600ms after the cursor
 * leaves, the default returns. Mobile (no hover capability) always shows the
 * default. Supports image and video assets.
 */

const REVERT_GRACE_MS = 600;
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHoverCapability(callback: () => void) {
  const mq = window.matchMedia(HOVER_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function HeroSwitcher({
  heroes,
  children,
  heightClassName = "h-svh",
}: {
  heroes: HeroAsset[];
  /** Optional content overlaid on the hero (e.g. brand titles). */
  children?: React.ReactNode;
  heightClassName?: string;
}) {
  const assets = heroes.length > 0 ? heroes : [FALLBACK_HERO];
  const defaultHero = useMemo(
    () => assets.find((h) => h.is_default) ?? assets[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heroes],
  );
  const byNavTarget = useMemo(() => {
    const map = new Map<string, HeroAsset>();
    for (const h of assets) {
      if (h.nav_target) map.set(h.nav_target.toUpperCase(), h);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroes]);

  const [activeId, setActiveId] = useState(defaultHero.id);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile / touch (no hover capability) always shows the default asset.
  const canHover = useSyncExternalStore(
    subscribeToHoverCapability,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false,
  );

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
    },
    [],
  );

  const cancelRevert = useCallback(() => {
    if (revertTimer.current) {
      clearTimeout(revertTimer.current);
      revertTimer.current = null;
    }
  }, []);

  const scheduleRevert = useCallback(() => {
    cancelRevert();
    revertTimer.current = setTimeout(
      () => setActiveId(defaultHero.id),
      REVERT_GRACE_MS,
    );
  }, [cancelRevert, defaultHero.id]);

  const navEnter = useCallback(
    (navTarget: string) => {
      if (!canHover) return;
      const hero = byNavTarget.get(navTarget.toUpperCase());
      if (!hero) return;
      cancelRevert();
      setActiveId(hero.id);
    },
    [canHover, byNavTarget, cancelRevert],
  );

  const navLeave = useCallback(() => {
    if (!canHover) return;
    scheduleRevert();
  }, [canHover, scheduleRevert]);

  const active =
    assets.find((h) => h.id === activeId) ?? defaultHero;

  // While a swapped hero is showing, hovering the hero itself keeps it alive.
  const heroEnter = useCallback(() => {
    if (!canHover) return;
    if (activeId !== defaultHero.id) cancelRevert();
  }, [canHover, activeId, defaultHero.id, cancelRevert]);

  return (
    <HeroContext.Provider value={{ theme: (active.theme as "light" | "dark") ?? "dark", navEnter, navLeave }}>
      <section
        className={`relative w-full overflow-hidden ${heightClassName}`}
        onMouseEnter={heroEnter}
        onMouseLeave={navLeave}
      >
        {assets.map((hero) => {
          const isActive = hero.id === active.id;
          const media =
            hero.media_type === "video" ? (
              <video
                src={hero.media_url}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              // Media URLs are admin-managed with unknown dimensions — plain img.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.media_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            );
          return (
            <div
              key={hero.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-500 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            >
              {media}
            </div>
          );
        })}
        {children && (
          <div className="absolute inset-0 z-10 flex items-end">
            {children}
          </div>
        )}
        <Header />
      </section>
    </HeroContext.Provider>
  );
}
