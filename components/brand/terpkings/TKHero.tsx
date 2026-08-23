import Link from "next/link";
import { Header } from "@/components/site/Header";
import { HeroVideo } from "@/components/site/HeroVideo";
import { TK_HERO } from "@/lib/terpkings-content";

/**
 * TerpKings CRT hero — layer order bottom→top exactly as the design export:
 * (a) radial green gradient base; (b) optional hero <video> + the multiply-blend
 * green radial tint + the screen-blend highlight ("green distortion" the video
 * sits behind); (c) scanlines; (d) animated static; (e) rollbar sweep;
 * (f) vignette; (g) VT323 corner labels; (h) tagline, CTAs, blinking cursor.
 *
 * The shared brand-page header (transparent overlay, white text — the hero is a
 * dark asset) sits on top (guardrail #5); it lives OUTSIDE the flicker wrapper so
 * the chrome never flickers.
 */

/**
 * EDIT ME: 0 = video fully clear, 1 = full green CRT tint. Mirrors the export's
 * `heroTintOpacity` prop default (0.6). Applied to BOTH the multiply tint and the
 * screen highlight, exactly as the export did.
 */
export const HERO_TINT_OPACITY = 0.6;

const label =
  "tk-mono pointer-events-none absolute text-[16px] tracking-[.12em] text-[rgba(20,24,10,.85)]";

export function TKHero({ videoUrl, posterUrl = null }: { videoUrl: string | null; posterUrl?: string | null }) {
  return (
    <section
      id="top"
      className="relative flex h-screen min-h-[660px] items-center justify-center overflow-hidden bg-[#020302]"
    >
      <div className="tk-flicker relative h-full min-h-[520px] w-full overflow-hidden">
        {/* (a) base */}
        <div className="absolute inset-0" style={{ background: TK_HERO.base }} />

        {/* (b) video + green distortion */}
        {videoUrl && (
          <>
            {/* Poster paints immediately; the video fades in over it on first "playing" (no gradient flash). */}
            <HeroVideo src={videoUrl} poster={posterUrl} />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: TK_HERO.multiplyTint,
                mixBlendMode: "multiply",
                opacity: HERO_TINT_OPACITY,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: TK_HERO.screenHighlight,
                mixBlendMode: "screen",
                opacity: HERO_TINT_OPACITY,
              }}
            />
          </>
        )}

        {/* (c) scanlines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: TK_HERO.scanlines }}
        />
        {/* (d) static */}
        <div
          className="tk-static pointer-events-none absolute inset-0 opacity-80"
          style={{ background: TK_HERO.static, backgroundSize: "400px 300px" }}
        />
        {/* (e) rollbar */}
        <div
          className="tk-rollbar pointer-events-none absolute left-0 right-0 h-[90px]"
          style={{ background: TK_HERO.rollbar }}
        />
        {/* (f) vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: TK_HERO.vignette }}
        />

        {/* (g) corner labels */}
        <div className={`${label} right-6 top-[18px]`}>{TK_HERO.cornerTop}</div>
        <div
          className={`${label} bottom-[18px] left-6`}
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {TK_HERO.cornerSide}
        </div>

        {/* (h) content */}
        <div className="relative z-[2] flex h-full flex-col items-center justify-end gap-[26px] px-8 pb-[72px] text-center">
          <h1 className="tk-mono m-0 text-[clamp(20px,2.4vw,28px)] font-normal tracking-[.18em] text-[#141809]">
            {TK_HERO.tagline}
          </h1>
          <div className="flex flex-wrap justify-center gap-[14px]">
            <Link
              href="/store-locator"
              className="tk-mono tk-btn-hero-find rounded-[4px] px-8 py-[13px] text-[22px] tracking-[.12em]"
            >
              ► FIND A STORE
            </Link>
            <a
              href="#products"
              className="tk-mono tk-btn-hero-view rounded-[4px] px-8 py-[11px] text-[22px] tracking-[.12em]"
            >
              VIEW ARSENAL
            </a>
          </div>
          <div className="tk-mono text-[18px] tracking-[.14em] text-[rgba(20,24,10,.7)]">
            {TK_HERO.scroll} <span className="tk-blink">_</span>
          </div>
        </div>
      </div>

      {/* Brand landing page — transparent overlay header (D-012), white text. */}
      <Header variant="overlay" />
    </section>
  );
}
