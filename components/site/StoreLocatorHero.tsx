"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Store Locator Hero — the landing page's STORE LOCATOR hover-swap.
 * Recreated from `docs/design_handoff_store_locator_hero/README.md`: black
 * canvas, pale-blue glow and dashed "route" line, left-aligned headline, the
 * "Find a Store" CTA, and six products dropped along the route under map pins.
 *
 * `HeroSwitcher` renders it in place of the admin-managed STORE LOCATOR image
 * (`navTargetNodes`), exactly like the Brand Gallery Hero does for BRANDS
 * (D-082). The six product shots are code-owned files in
 * `public/brand-assets/store-locator-hero/` — NOT admin-managed.
 *
 * Geometry: the handoff is a fixed 1920×800 canvas. Here the hero box is
 * measured and the canvas is scaled uniformly by k = min(w/1920, h/800) —
 * every size and offset in the handoff table is multiplied by k, so the
 * composition is pixel-faithful at 1920×800 and shrinks proportionally
 * elsewhere. The product "stage" is anchored to the bottom of the box and the
 * text block to the top, so a taller-than-12:5 hero (a 16:9 desktop under the
 * header) gains breathing room between them rather than a black band above.
 *
 * Below `STACK_BELOW_PX` the README's phone layout is used instead: text block
 * on top, full-width button, a row of products, no route line. Phones never
 * reach a nav-target swap today (D-084), so that branch exists for a narrow
 * desktop window and for safety.
 *
 * Interaction: the CTA is the only navigating element. Products get a small
 * hover lift (image rises and the pin nudges up), disabled under
 * prefers-reduced-motion. The README's optional pin drop-in stagger is NOT
 * implemented — it is flagged "confirm with design first".
 */

/**
 * Handoff layout variant. The README explored two fixes for the CTA/pin
 * collision and left the choice open:
 *  - "3a": CTA stacked under the headline; the two left products sit lower
 *          (partly below the canvas edge) to clear it.
 *  - "3b": CTA inline to the right of "Near You"; products keep their
 *          original positions, nothing is cropped.
 */
const VARIANT: "3a" | "3b" = "3b";

const CANVAS_W = 1920;
const CANVAS_H = 800;
const STACK_BELOW_PX = 768;
const STORE_LOCATOR_HREF = "/store-locator";

const PALE_BLUE = "hsl(215 100% 90%)";
const ROUTE_PATH =
  "M-40 640 C 300 560, 420 700, 720 610 S 1180 470, 1420 520 S 1800 620, 1980 500";

interface ProductSpec {
  src: string;
  alt: string;
  /** Canvas px from the left edge of the product column. */
  left: number;
  /** Canvas px from the bottom edge; 3a overrides for products 1 and 2. */
  bottom: number;
  bottom3a?: number;
  width: number;
  height: number;
  /** 3a shrinks product 2 to 230×230. */
  size3a?: number;
  /** Intrinsic pixel size of the file (for next/image). */
  natural: [number, number];
}

/** Left→right order, positions and sizes are the handoff table — do not reorder. */
const PRODUCTS: readonly ProductSpec[] = [
  {
    src: "/brand-assets/store-locator-hero/prerolls-box.webp",
    alt: "Outfitters 10-pack pre-rolls",
    left: 60,
    bottom: 20,
    bottom3a: -30,
    width: 260,
    height: 260,
    natural: [500, 500],
  },
  {
    src: "/brand-assets/store-locator-hero/outfitters-flower.webp",
    alt: "Outfitters infused flower",
    left: 340,
    bottom: 110,
    bottom3a: -20,
    width: 250,
    height: 250,
    size3a: 230,
    natural: [500, 500],
  },
  {
    src: "/brand-assets/store-locator-hero/astro-vape.webp",
    alt: "Outfitters vape",
    left: 620,
    bottom: 10,
    width: 250,
    height: 250,
    natural: [500, 500],
  },
  {
    src: "/brand-assets/store-locator-hero/savage-squad-bag.webp",
    alt: "Savage Squad Strains eighth",
    left: 1000,
    bottom: 30,
    width: 290,
    height: 236,
    natural: [1000, 816],
  },
  {
    src: "/brand-assets/store-locator-hero/terpkings-drip.webp",
    alt: "TerpKings Drip Packs",
    left: 1300,
    bottom: 40,
    width: 260,
    height: 260,
    natural: [500, 500],
  },
  {
    src: "/brand-assets/store-locator-hero/higher-self-pineapple.webp",
    alt: "Higher Self vape",
    left: 1590,
    bottom: 150,
    width: 270,
    height: 270,
    natural: [500, 500],
  },
];

/** The handoff's pin glyph (viewBox 0 0 16 20) in either colourway. */
function Pin({
  width,
  height,
  fill,
  dot,
  className,
  style,
}: {
  width: number | string;
  height: number | string;
  fill: string;
  dot: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox="0 0 16 20"
      fill="none"
      className={className}
      style={style}
    >
      <path d="M8 19s7-6.2 7-11A7 7 0 0 0 1 8c0 4.8 7 11 7 11Z" fill={fill} />
      <circle cx="8" cy="8" r="2.6" fill={dot} />
    </svg>
  );
}

/** Pin + product image. Hover: image lifts and the pin nudges up (small, 250ms). */
function Product({
  spec,
  k,
  bottom,
  size,
}: {
  spec: ProductSpec;
  k: number;
  bottom: number;
  size: { width: number; height: number };
}) {
  return (
    <div
      className="group absolute flex flex-col items-center"
      style={{ left: spec.left * k, bottom: bottom * k }}
    >
      <Pin
        width={46 * k}
        height={58 * k}
        fill="#fff"
        dot="#000"
        className="relative z-10 transition-transform duration-300 ease-out group-hover:-translate-y-[4px] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        style={{ marginBottom: -6 * k }}
      />
      <Image
        src={spec.src}
        alt={spec.alt}
        width={spec.natural[0]}
        height={spec.natural[1]}
        sizes={`${Math.round(size.width)}px`}
        draggable={false}
        className="object-contain transition-[transform,filter] duration-300 ease-out [filter:drop-shadow(0_24px_24px_rgba(0,0,0,.6))] group-hover:-translate-y-[10px] group-hover:scale-[1.04] group-hover:[filter:drop-shadow(0_34px_30px_rgba(0,0,0,.7))] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100"
        style={{ width: size.width, height: size.height }}
      />
    </div>
  );
}

function Cta({ fontSize, padY, padX, gap, k, className = "", style }: {
  fontSize: number;
  padY: number;
  padX: number;
  gap: number;
  k: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={STORE_LOCATOR_HREF}
      className={`inline-flex items-center whitespace-nowrap rounded-full bg-white font-semibold text-black no-underline transition-colors duration-150 ease-out hover:bg-[hsl(215_100%_90%)] focus-visible:bg-[hsl(215_100%_90%)] focus-visible:outline-none ${className}`}
      style={{ fontSize, padding: `${padY}px ${padX}px`, gap, ...style }}
    >
      <Pin width={18 * k} height={22 * k} fill="#000" dot="#fff" />
      Find a Store
    </Link>
  );
}

function Eyebrow({ k }: { k: number }) {
  return (
    <div
      className="flex items-center font-semibold uppercase text-[hsl(215_100%_90%)]"
      style={{ gap: 10 * k, fontSize: 15 * k, letterSpacing: ".12em" }}
    >
      <Pin width={14 * k} height={18 * k} fill={PALE_BLUE} dot="#000" />
      Now stocked at dispensaries across Illinois
    </div>
  );
}

export function StoreLocatorHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setBox({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const glow = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,hsl(215_100%_90%/.14),transparent_70%)]"
    />
  );

  const measured = box.width > 0 && box.height > 0;
  const stacked = measured && box.width < STACK_BELOW_PX;

  // ── Phone / narrow layout (README "Responsive <768px") ──────────────────
  if (stacked) {
    return (
      <div
        ref={rootRef}
        className="absolute inset-0 flex flex-col overflow-hidden bg-black font-poppins text-white"
      >
        {glow}
        <div className="relative flex flex-col items-start gap-5 px-6 pt-8">
          <Eyebrow k={0.8} />
          <h1 className="m-0 max-w-[12ch] text-balance text-[48px] font-bold leading-[.94] tracking-[-.04em]">
            Find Private Stock Near You
          </h1>
          <Cta
            k={0.8}
            fontSize={18}
            padY={16}
            padX={32}
            gap={12}
            className="w-full justify-center"
          />
        </div>
        <div className="relative mt-auto flex items-end justify-between px-4 pb-4">
          {PRODUCTS.filter((_, i) => i !== 1 && i !== 4).map((p) => (
            <div key={p.src} className="group flex flex-col items-center">
              <Pin
                width={24}
                height={30}
                fill="#fff"
                dot="#000"
                className="relative z-10 -mb-[3px] transition-transform duration-300 ease-out group-hover:-translate-y-[3px] motion-reduce:transition-none"
              />
              <Image
                src={p.src}
                alt={p.alt}
                width={p.natural[0]}
                height={p.natural[1]}
                sizes="25vw"
                draggable={false}
                className="h-auto w-[22vw] max-w-[120px] object-contain [filter:drop-shadow(0_12px_12px_rgba(0,0,0,.6))]"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Scaled canvas layout ────────────────────────────────────────────────
  const k = measured
    ? Math.min(box.width / CANVAS_W, box.height / CANVAS_H)
    : 0;
  const stageW = CANVAS_W * k;
  const stageH = CANVAS_H * k;
  const stageLeft = (box.width - stageW) / 2;

  const headline = (
    <h1
      className="m-0 text-balance font-bold text-white"
      style={{
        fontSize: 120 * k,
        lineHeight: 0.94,
        letterSpacing: "-.04em",
        maxWidth: 1200 * k,
      }}
    >
      Find Private Stock Near You
    </h1>
  );
  const cta = (
    <Cta
      k={k}
      fontSize={22 * k}
      padY={22 * k}
      padX={44 * k}
      gap={14 * k}
      style={
        VARIANT === "3b"
          ? { marginBottom: 14 * k }
          : { marginTop: 8 * k }
      }
    />
  );

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden bg-black font-poppins text-white"
    >
      {glow}
      {measured && (
        <>
          {/* Product stage: the 1920×800 canvas scaled by k, bottom-anchored, centred. */}
          <div
            className="absolute bottom-0"
            style={{ left: stageLeft, width: stageW, height: stageH }}
          >
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width={stageW}
              height={stageH}
              className="absolute inset-0"
              fill="none"
            >
              <path
                d={ROUTE_PATH}
                stroke={PALE_BLUE}
                strokeWidth={3}
                strokeDasharray="14 18"
                strokeLinecap="round"
              />
            </svg>
            {PRODUCTS.map((p) => {
              const bottom =
                VARIANT === "3a" && p.bottom3a !== undefined ? p.bottom3a : p.bottom;
              const side =
                VARIANT === "3a" && p.size3a !== undefined ? p.size3a : undefined;
              const size = {
                width: (side ?? p.width) * k,
                height: (side ?? p.height) * k,
              };
              return (
                <Product key={p.src} spec={p} k={k} bottom={bottom} size={size} />
              );
            })}
          </div>

          {/* Text block: top-anchored to the hero box, horizontally inside the stage. */}
          <div
            className="absolute flex flex-col items-start text-left"
            style={{
              top: 88 * k,
              left: stageLeft + 120 * k,
              right: Math.max(0, box.width - stageLeft - stageW) + 120 * k,
              gap: 28 * k,
            }}
          >
            <Eyebrow k={k} />
            {VARIANT === "3b" ? (
              <div className="flex items-end" style={{ gap: 40 * k }}>
                {headline}
                {cta}
              </div>
            ) : (
              <>
                {headline}
                {cta}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
