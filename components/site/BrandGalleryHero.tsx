"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { brandBySlug, type BrandSlug } from "@/lib/brands";

/**
 * Brand Gallery Hero (D-082) — design handoff option 2a
 * (`docs/design_handoff_brand_gallery_hero/`). Four full-height brand photo
 * panels separated by diagonal dividers; hovering a panel expands it, and the
 * WHOLE panel is a link to that brand's page.
 *
 * It is the landing page's BRANDS hover-swap: `HeroSwitcher` renders it in place
 * of the admin-managed BRANDS image (see `navTargetNodes`). Its four photos are
 * code-owned files in `public/brand-assets/gallery-hero/` — NOT admin-managed.
 *
 * Geometry follows the handoff README exactly: skew S = 90px, gap G = 3px each
 * side, active flex 2.2 vs 1, 550ms cubic-bezier(.2,.7,.2,1). The prototype
 * hard-coded a 1440px stage; here W is the measured hero width. Below 900px
 * the diagonals are dropped for an equal 2×2 grid.
 */

const S = 90;
const G = 3;
const ACTIVE_FLEX = 2.2;
const LABEL_INSET = 26;
const STACK_BELOW_PX = 900;
const COMPACT_BELOW_PX = 560;
const EASE = "cubic-bezier(.2,.7,.2,1)";
const DURATION = "550ms";

interface PanelSpec {
  slug: BrandSlug;
  subheader: string;
  image: string;
  position: string;
}

/** Left→right order, copy and focal points are from the handoff — do not reorder. */
const PANEL_SPECS: readonly PanelSpec[] = [
  {
    slug: "outfitters",
    subheader: "Crafted without compromise",
    image: "/brand-assets/gallery-hero/outfitters.webp",
    position: "30% 60%",
  },
  {
    slug: "higherself",
    subheader: "Pause in your everyday life",
    image: "/brand-assets/gallery-hero/higherself.webp",
    position: "50% 55%",
  },
  {
    slug: "terpkings",
    subheader: "Experience the full potential of cannabis",
    image: "/brand-assets/gallery-hero/terpkings.webp",
    position: "50% 35%",
  },
  {
    slug: "savagesquadstrains",
    subheader: "Not a brand. A movement.",
    image: "/brand-assets/gallery-hero/savagesquadstrains.webp",
    position: "50% 45%",
  },
];

export function BrandGalleryHero() {
  // Names + routes come from the allowlist (guardrail #3): a brand removed from
  // lib/brands.ts drops out of the gallery without touching this file.
  const panels = PANEL_SPECS.flatMap((spec) => {
    const brand = brandBySlug(spec.slug);
    return brand ? [{ ...spec, name: brand.name }] : [];
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeSlug, setActiveSlug] = useState<BrandSlug>(
    panels[0]?.slug ?? "outfitters",
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Handoff type is 11px / 28px. Phone-width 2×2 tiles (~190px) can't hold that
  // — "Savage Squad Strains" wraps to three lines — so they step down (D-083).
  const compact = width > 0 && width < COMPACT_BELOW_PX;
  const label = (p: (typeof panels)[number]) => (
    <>
      <span
        className={`font-normal uppercase text-white/[.72] ${
          compact ? "text-[9px] tracking-[.16em]" : "text-[11px] tracking-[.2em]"
        }`}
      >
        {p.subheader}
      </span>
      <span
        className={`font-semibold leading-[1.05] tracking-[-.01em] text-white ${
          compact ? "text-[19px]" : "text-[28px]"
        }`}
      >
        {p.name}
      </span>
    </>
  );

  const overlay = (
    <span
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,.05) 45%, rgba(0,0,0,.88) 100%)",
      }}
    />
  );

  const stacked = width > 0 && width < STACK_BELOW_PX;

  if (stacked) {
    return (
      <div
        ref={rootRef}
        className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[6px] bg-black font-poppins"
      >
        {panels.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            aria-label={p.name}
            className="group relative block overflow-hidden"
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-cover bg-no-repeat transition-transform ease-[cubic-bezier(.2,.7,.2,1)] [transition-duration:550ms] group-hover:scale-100 motion-reduce:transition-none scale-[1.08]"
              style={{
                backgroundImage: `url("${p.image}")`,
                backgroundPosition: p.position,
              }}
            />
            {overlay}
            <span className="absolute bottom-7 left-4 right-4 flex flex-col gap-1.5">
              {label(p)}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  // Desktop: diagonal gallery. Geometry is derived from the active panel on
  // every render (README "State Management") against the measured width.
  const flex = panels.map((p) => (p.slug === activeSlug ? ACTIVE_FLEX : 1));
  const total = flex.reduce((a, b) => a + b, 0);
  const transition = (props: string[]) =>
    props.map((prop) => `${prop} ${DURATION} ${EASE}`).join(", ");

  let x = 0;
  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden bg-black font-poppins"
    >
      {width > 0 &&
        panels.map((p, i) => {
          const w = (width * flex[i]) / total;
          const left = x - S;
          x += w;
          const first = i === 0;
          const last = i === panels.length - 1;
          const tl = first ? S : 2 * S + G;
          const bl = first ? S : S + G;
          const tr = last ? S + w : 2 * S + w - G;
          const br = last ? S + w : S + w - G;
          const on = p.slug === activeSlug;
          return (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              aria-label={p.name}
              onMouseEnter={() => setActiveSlug(p.slug)}
              onFocus={() => setActiveSlug(p.slug)}
              className="absolute inset-y-0 block overflow-hidden text-white motion-reduce:!transition-none"
              style={{
                left,
                width: w + 2 * S,
                clipPath: `polygon(${tl}px 0, ${tr}px 0, ${br}px 100%, ${bl}px 100%)`,
                transition: transition(["left", "width", "clip-path"]),
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-cover bg-no-repeat motion-reduce:!transition-none"
                style={{
                  backgroundImage: `url("${p.image}")`,
                  backgroundPosition: p.position,
                  transform: `scale(${on ? 1 : 1.08})`,
                  transition: transition(["transform"]),
                }}
              />
              {overlay}
              <span
                className="absolute flex flex-col gap-1.5 motion-reduce:!transition-none"
                style={{
                  left: bl + LABEL_INSET,
                  bottom: LABEL_INSET,
                  maxWidth: w - 60,
                  transition: transition(["left"]),
                }}
              >
                {label(p)}
              </span>
            </Link>
          );
        })}
    </div>
  );
}
