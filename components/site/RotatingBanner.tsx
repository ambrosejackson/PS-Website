"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BannerSlide } from "@/lib/data";

const ROTATE_MS = 5000;

/**
 * Auto-rotating banner carousel. Renders BELOW the hero only — never above or
 * over it (guardrail #4). Supports image and video slides from content_banners.
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

  return (
    <section aria-label="Promotions" className="relative w-full overflow-hidden">
      <div className="relative aspect-[4/1] min-h-40 w-full">
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
    </section>
  );
}
