"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ShopCollection } from "@/lib/merch/queries";

/**
 * Collections carousel (§6.2 #6): horizontal scroll-snap track of cover cards
 * (4:5 cover, name, subtitle, Shop now). Prev/Next arrows hide at the ends,
 * touch drags natively, ← / → scroll when the track is focused. No carousel
 * library; reduced motion → instant scroll.
 */
export function CollectionsCarousel({ collections }: { collections: ShopCollection[] }) {
  const track = useRef<HTMLUListElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  function scrollByCards(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("li");
    const step = card ? card.getBoundingClientRect().width + 13 : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  }

  if (collections.length === 0) return null;

  return (
    <section aria-labelledby="collections-heading" className="px-3 md:px-5">
      <h2 id="collections-heading" className="mb-6 text-center font-condensed text-[28px] font-bold uppercase tracking-tight text-ink md:text-[37px]">
        Collections
      </h2>
      <div className="relative">
        <ul
          ref={track}
          tabIndex={0}
          aria-label="Collections — use the arrow keys to scroll"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              scrollByCards(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              scrollByCards(-1);
            }
          }}
          className="flex snap-x snap-mandatory gap-[13px] overflow-x-auto scroll-smooth pb-2 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ink motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          {collections.map((c) => (
            <li key={c.id} className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-13px)/2)] lg:w-[calc((100%-26px)/3)]">
              <Link href={`/apparel/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f0f0f0]">
                  {c.cover_image_url && (
                    <Image
                      src={c.cover_image_url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-condensed text-base font-bold uppercase tracking-wide text-ink">{c.name}</p>
                    {c.subtitle && <p className="truncate text-xs text-neutral-500">{c.subtitle}</p>}
                  </div>
                  <span className="nav-underline shrink-0 font-condensed text-[11px] font-semibold uppercase tracking-wide text-ink">Shop now</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {canPrev && (
          <button
            type="button"
            aria-label="Previous collections"
            onClick={() => scrollByCards(-1)}
            className="absolute left-2 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow md:flex"
          >
            ←
          </button>
        )}
        {canNext && (
          <button
            type="button"
            aria-label="Next collections"
            onClick={() => scrollByCards(1)}
            className="absolute right-2 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow md:flex"
          >
            →
          </button>
        )}
      </div>
    </section>
  );
}
