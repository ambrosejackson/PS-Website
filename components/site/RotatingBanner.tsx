"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BannerSlide } from "@/lib/data";

const ROTATE_MS = 6000;
const SWIPE_PX = 40;

/**
 * Auto-rotating banner per the docx reference (Jeeter "Summer Essentials"):
 * an INSET rounded-corner card — not full-bleed — with an optional corner
 * badge ribbon, rotating admin-uploaded image/video slides that can link out.
 * Renders BELOW the hero only — never above or over it (guardrail #4).
 * ~6 s auto-rotate, pauses on hover/focus, swipe left/right on touch. Slides
 * arrive pre-filtered (active + inside their schedule window, sort order).
 */
export function RotatingBanner({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const badge = slides[index]?.badge_text;

  return (
    <section
      aria-label="Promotions"
      aria-roledescription="carousel"
      className="mx-auto max-w-screen-2xl px-6 pt-8 md:px-12 md:pt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (dx <= -SWIPE_PX) go(1);
        else if (dx >= SWIPE_PX) go(-1);
      }}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative aspect-[10/3] min-h-40 w-full md:aspect-[4/1]">
          {slides.map((slide, i) => {
            const media =
              slide.media_type === "video" ? (
                <video src={slide.media_url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.media_url} alt="" className="h-full w-full object-cover" />
              );
            const content = slide.link_url ? (
              <Link href={slide.link_url} className="block h-full w-full" tabIndex={i === index ? 0 : -1}>
                {media}
              </Link>
            ) : (
              media
            );
            return (
              <div
                key={slide.id}
                aria-hidden={i !== index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === index ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {content}
              </div>
            );
          })}
        </div>

        {badge && (
          <span className="pointer-events-none absolute left-0 top-5 bg-ink py-1.5 pl-4 pr-5 font-condensed text-[11px] font-bold uppercase tracking-wide text-white [clip-path:polygon(0_0,100%_0,calc(100%-10px)_50%,100%_100%,0_100%)]">
            {badge}
          </span>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 md:flex"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 md:flex"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 w-6 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
