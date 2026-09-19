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
 * Touch TABLETS (D-083, narrowed to tablets by D-084 — phones always show the
 * default, as before): there is no hover, so a horizontal finger swipe on the
 * hero steps through the same assets — default → each nav-target swap in admin
 * sort order — wrapping at the ends and staying put (no revert). Pager dots show
 * on touch only. Vertical swipes still scroll the page (`touch-action: pan-y`).
 *
 * `navTargetNodes` (D-082) lets a page render a React node INSTEAD of the
 * admin-managed media for a nav target — the landing passes the interactive
 * Brand Gallery Hero for BRANDS. The node wins over the DB row, and works even
 * if that row is missing or inactive. Inactive layers are inert so a hidden
 * node's links can never be clicked or tabbed to.
 *
 * Two chrome treatments (guardrail #5): by default the solid white bar sits
 * ABOVE the hero and the pair together fill `heightClassName`; brand landing
 * pages pass `overlayHeader` to keep the original transparent bar overlaid on a
 * hero flush to the viewport top.
 */

const REVERT_GRACE_MS = 600;
/** Touch swipe (D-083): minimum horizontal travel, and how much it must beat vertical. */
const SWIPE_MIN_PX = 40;
const SWIPE_AXIS_RATIO = 1.5;
/** Touch devices mount a nav-target node (the gallery) after this idle delay, or on first touch. */
const TOUCH_NODE_MOUNT_MS = 2500;
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
/**
 * Tablet-sized viewport (D-084): swipe is for iPads, NOT phones. Width alone
 * would let a landscape phone in (~900px wide), so height is required too —
 * iPad mini is 744×1133 either way round; the tallest landscape phone is ~440.
 */
const TABLET_QUERY = "(min-width: 700px) and (min-height: 600px)";

function subscribeToTabletViewport(callback: () => void) {
  const mq = window.matchMedia(TABLET_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

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
  navTargetNodes,
}: {
  heroes: HeroAsset[];
  /** Interactive replacements keyed by UPPERCASE nav target, e.g. `{ BRANDS: <BrandGalleryHero /> }`. */
  navTargetNodes?: Record<string, React.ReactNode>;
  /** Optional content overlaid on the hero (e.g. brand titles). */
  children?: React.ReactNode;
  heightClassName?: string;
  /** Brand landing pages only — transparent header over a top-flush hero. */
  overlayHeader?: boolean;
}) {
  const assets = useMemo(() => {
    const dbAssets = heroes.length > 0 ? heroes : [FALLBACK_HERO];
    // A node-backed nav target needs an asset to swap to even when admin has no
    // (active) row for it — synthesize one; its media is never rendered.
    const synthesized = Object.keys(navTargetNodes ?? {})
      .filter((t) => !dbAssets.some((h) => h.nav_target?.toUpperCase() === t))
      .map(
        (t): HeroAsset => ({
          ...FALLBACK_HERO,
          id: `node:${t}`,
          nav_target: t,
          is_default: false,
        }),
      );
    return [...dbAssets, ...synthesized];
  }, [heroes, navTargetNodes]);
  const defaultHero = useMemo(
    () => assets.find((h) => h.is_default) ?? assets[0],
    [assets],
  );
  const byNavTarget = useMemo(() => {
    const map = new Map<string, HeroAsset>();
    for (const h of assets) {
      if (h.nav_target) map.set(h.nav_target.toUpperCase(), h);
    }
    return map;
  }, [assets]);

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

  // ── Touch swipe (D-083) ────────────────────────────────────────────────
  // The swipeable set is exactly what desktop can reach: the default plus every
  // nav-target swap. Pages with only a default hero get no swipe and no dots.
  const swipeAssets = useMemo(
    () => assets.filter((h) => h.id === defaultHero.id || h.nav_target),
    [assets, defaultHero.id],
  );
  const isTabletViewport = useSyncExternalStore(
    subscribeToTabletViewport,
    () => window.matchMedia(TABLET_QUERY).matches,
    () => false,
  );
  // Phones get the default hero only — no swipe, no dots, gallery never mounts.
  const swipeEnabled = !canHover && isTabletViewport && swipeAssets.length > 1;

  // A nav-target node (the Brand Gallery) is not needed for first paint on a
  // phone — mount it once the page has settled, or the moment the hero is touched.
  const [touchNodesMounted, setTouchNodesMounted] = useState(false);
  useEffect(() => {
    if (!swipeEnabled || touchNodesMounted) return;
    const t = setTimeout(() => setTouchNodesMounted(true), TOUCH_NODE_MOUNT_MS);
    return () => clearTimeout(t);
  }, [swipeEnabled, touchNodesMounted]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swallowClick = useRef(false);

  const stepHero = useCallback(
    (dir: 1 | -1) => {
      setActiveId((current) => {
        const i = swipeAssets.findIndex((h) => h.id === current);
        const n = swipeAssets.length;
        return swipeAssets[(((i < 0 ? 0 : i) + dir) % n + n) % n].id;
      });
    },
    [swipeAssets],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeEnabled || e.touches.length !== 1) return;
      setTouchNodesMounted(true);
      swallowClick.current = false;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    [swipeEnabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!swipeEnabled || !start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (
        Math.abs(dx) < SWIPE_MIN_PX ||
        Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO
      ) {
        return;
      }
      // A swipe that ends on a gallery panel must not also follow its link.
      swallowClick.current = true;
      stepHero(dx < 0 ? 1 : -1);
    },
    [swipeEnabled, stepHero],
  );

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const swipeProps = swipeEnabled
    ? {
        onTouchStart,
        onTouchEnd,
        onClickCapture,
        style: { touchAction: "pan-y" as const },
      }
    : {};

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
        const node =
          hero.nav_target && !hero.is_default
            ? navTargetNodes?.[hero.nav_target.toUpperCase()]
            : undefined;
        // Desktop mounts the node up front; touch defers it (see touchNodesMounted)
        // so a phone's first paint doesn't pay for the gallery images.
        const mediaEl = node ? (
          canHover || touchNodesMounted ? node : null
        ) : hero.media_type === "video" ? (
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
            inert={!isActive}
            className={`absolute inset-0 transition-opacity duration-500 ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {mediaEl}
          </div>
        );
      })}
      {children && (
        <div className="absolute inset-0 z-10 flex items-end">{children}</div>
      )}
      {swipeEnabled && (
        <div
          role="group"
          aria-label="Choose hero"
          className="absolute inset-x-0 bottom-1 z-20 flex justify-center"
        >
          {swipeAssets.map((h, i) => {
            const on = h.id === active.id;
            const dark = ((active.theme as "light" | "dark") ?? "dark") === "dark";
            return (
              <button
                key={h.id}
                type="button"
                aria-label={`Show hero ${i + 1} of ${swipeAssets.length}`}
                aria-current={on}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId(h.id);
                }}
                className="flex h-6 w-5 items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    on ? "w-4" : "w-1.5 opacity-50"
                  } ${
                    dark
                      ? "bg-white shadow-[0_0_3px_rgba(0,0,0,.6)]"
                      : "bg-black shadow-[0_0_3px_rgba(255,255,255,.6)]"
                  }`}
                />
              </button>
            );
          })}
        </div>
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
          {...swipeProps}
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
            {...swipeProps}
          >
            {media}
          </section>
        </div>
      )}
    </HeroContext.Provider>
  );
}
