"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BannerSlide } from "@/lib/data";

const ROTATE_MS = 5000;

/**
 * Auto-rotating banner per the docx reference (Jeeter "Summer Essentials"):
 * an INSET rounded-corner card — not full-bleed — with an optional corner
 * badge ribbon, rotating admin-uploaded image/video slides that can link out.
 * Renders BELOW the hero only — never above or over it (guardrail #4).
 */
export function RotatingBanner({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const badge = slides[index]?.badge_text;

  return (
    <section
      aria-label="Promotions"
      className="mx-auto max-w-screen-2xl px-6 pt-8 md:px-12 md:pt-10"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <div className="relative aspect-[10/3] min-h-40 w-full md:aspect-[4/1]">
          {slides.map((slide, i) => {
            const media =
              slide.media_type === "video" ? (
                <video
                  src={slide.media_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.media_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              );
            const content = slide.link_url ? (
              <Link href={slide.link_url} className="block h-full w-full">
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

        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
