"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SocialButtons } from "@/components/site/SocialButtons";

export interface SocialTile {
  id: string;
  src: string;
  alt: string;
}

/** Seconds per tile at the marquee's constant speed. Tiles are near-full-width on mobile / 480 px on desktop (D-067). */
const SECONDS_PER_TILE = 7;

/**
 * Scrolling strip + lightbox (D-064). The set is rendered exactly twice and the
 * keyframe travels −50%, so the loop is seamless at any count (6–50). Duration
 * scales with count so 6 and 50 images move at the same px/s.
 *
 * "Not downloadable" is deterrence only: context menu, drag and long-press are
 * suppressed and a transparent layer sits over the lightbox image. A screenshot
 * still works — the point is to steer casual viewers to the Instagram button.
 */
export function SocialStrip({ tiles, lightbox }: { tiles: SocialTile[]; lightbox: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = tiles.length;
  const doubled = [...tiles, ...tiles];

  const step = useCallback(
    (d: 1 | -1) => setOpen((cur) => (cur === null ? cur : (cur + d + n) % n)),
    [n],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const block = (e: React.SyntheticEvent) => e.preventDefault();
  const current = open === null ? null : tiles[open];

  return (
    <>
      <div className="mt-10 overflow-hidden">
        <div className="ps-marquee flex w-max gap-4" style={{ animationDuration: `${Math.max(1, n) * SECONDS_PER_TILE}s` }}>
          {doubled.map((t, i) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.src}
                alt={t.alt}
                loading="lazy"
                draggable={false}
                onContextMenu={block}
                onDragStart={block}
                className="ps-nosave aspect-[4/5] w-[calc(100vw-3rem)] rounded-lg object-cover md:w-[480px]"
              />
            );
            return lightbox ? (
              <button
                key={`${t.id}-${i}`}
                type="button"
                aria-label={t.alt || "View larger"}
                data-track="social:tile"
                onClick={() => setOpen(i % n)}
                className="shrink-0 cursor-zoom-in rounded-lg transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                {img}
              </button>
            ) : (
              <div key={`${t.id}-${i}`} className="shrink-0">
                {img}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          showCloseButton
          className="w-auto max-w-[min(92vw,64vh)] gap-0 rounded-xl bg-white p-3 ring-0 sm:max-w-[min(92vw,64vh)] md:p-4"
          onContextMenu={block}
        >
          <DialogTitle className="sr-only">Private Stock on social media</DialogTitle>
          {current && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={current.id}
                src={current.src}
                alt={current.alt}
                draggable={false}
                onContextMenu={block}
                onDragStart={block}
                className="ps-nosave mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
              {/* Transparent layer over the image: blocks direct right-click / long-press on the img element. */}
              <div aria-hidden className="absolute inset-0" onContextMenu={block} />
              {n > 1 && (
                <>
                  <button type="button" aria-label="Previous" onClick={() => step(-1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-1.5 text-lg leading-none text-ink shadow hover:bg-white">
                    ‹
                  </button>
                  <button type="button" aria-label="Next" onClick={() => step(1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-1.5 text-lg leading-none text-ink shadow hover:bg-white">
                    ›
                  </button>
                </>
              )}
            </div>
          )}
          <p className="mt-4 text-center font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">
            See more on
          </p>
          <SocialButtons placement="lightbox" className="mt-2" />
        </DialogContent>
      </Dialog>
    </>
  );
}
