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
import { HeroVideo } from "@/components/site/HeroVideo";
import {
  HeroAudioButton,
  heroAudioEligible,
  useHeroAudio,
} from "@/components/site/hero-audio";
import { HeroContext } from "@/components/site/hero-context";
import { FALLBACK_HERO, type HeroAsset } from "@/lib/data";

/**
 * Full-bleed hero with the site Header and nav-hover media swapping (build plan
 * decision 8): hovering a right-nav item swaps to its mapped asset and it stays
 * while the cursor remains over the nav item or the hero; ~600ms after the
 * cursor leaves, the default returns. Mobile (no hover capability) always shows
 * the default. Supports image and video assets.
 *
 * Two chrome treatments (guardrail #5): by default the solid white bar sits
 * ABOVE the hero and the pair together fill `heightClassName`; brand landing
 * pages pass `overlayHeader` to keep the original transparent bar overlaid on a
 * hero flush to the viewport top.
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
  overlayHeader = false,
}: {
  heroes: HeroAsset[];
  /** Optional content overlaid on the hero (e.g. brand titles). */
  children?: React.ReactNode;
  heightClassName?: string;
  /** Brand landing pages only — transparent header over a top-flush hero. */
  overlayHeader?: boolean;
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

  // Leaving the nav item alone does NOT revert — the swapped hero stays while
  // the cursor remains anywhere over the hero; the section's mouseleave below
  // is the single revert trigger.
  const navLeave = useCallback(() => {}, []);

  const active =
    assets.find((h) => h.id === activeId) ?? defaultHero;

  // Hero audio (D-050): only the page's default hero may carry autoplay audio
  // (D4); a hover-swapped hero is always muted, and the default resumes when it
  // returns (the gesture is already banked — no re-prompt).
  const audioEnabled = heroAudioEligible(defaultHero);
  const audio = useHeroAudio({
    enabled: audioEnabled,
    volume: defaultHero.audio_volume ?? 70,
    visible: active.id === defaultHero.id,
  });

  // A swapped hero STAYS while the cursor is anywhere over the nav item or the
  // hero itself (build plan decision 8 + docx). The nav lives inside the hovered
  // region (the header bar plus the hero), so mouseenter never re-fires when
  // moving nav → hero; instead any movement inside that region cancels a pending
  // revert, and leaving it schedules the revert.
  const heroMove = useCallback(() => {
    if (!canHover) return;
    if (activeId !== defaultHero.id) cancelRevert();
  }, [canHover, activeId, defaultHero.id, cancelRevert]);

  const heroLeave = useCallback(() => {
    if (!canHover) return;
    if (activeId !== defaultHero.id) scheduleRevert();
  }, [canHover, activeId, defaultHero.id, scheduleRevert]);

  const media = (
    <>
      {assets.map((hero) => {
        const isActive = hero.id === active.id;
        const mediaEl =
          hero.media_type === "video" ? (
            // Poster paints first; the video fades in on "playing" (shared HeroVideo).
            // Only the default hero gets the audio ref (D4); mobile variant via <source media>.
            <HeroVideo
              src={hero.media_url}
              mobileSrc={hero.media_url_mobile}
              poster={hero.poster_url}
              loop={hero.video_loop}
              videoRef={
                audioEnabled && hero.id === defaultHero.id ? audio.videoRef : undefined
              }
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
            {mediaEl}
          </div>
        );
      })}
      {children && (
        <div className="absolute inset-0 z-10 flex items-end">{children}</div>
      )}
      {audioEnabled && (
        <div className="absolute bottom-6 right-6 z-20">
          <HeroAudioButton
            audio={audio}
            theme={(active.theme as "light" | "dark") ?? "dark"}
          />
        </div>
      )}
    </>
  );

  return (
    <HeroContext.Provider
      value={{
        theme: (active.theme as "light" | "dark") ?? "dark",
        navEnter,
        navLeave,
      }}
    >
      {overlayHeader ? (
        <section
          className={`relative w-full overflow-hidden ${heightClassName}`}
          onMouseMove={heroMove}
          onMouseLeave={heroLeave}
          onClick={audio.onHeroClick}
        >
          {media}
          <Header variant="overlay" />
        </section>
      ) : (
        <div
          className={`flex w-full flex-col ${heightClassName}`}
          onMouseMove={heroMove}
          onMouseLeave={heroLeave}
        >
          <Header />
          <section
            className="relative w-full flex-1 overflow-hidden"
            onClick={audio.onHeroClick}
          >
            {media}
          </section>
        </div>
      )}
    </HeroContext.Provider>
  );
}
