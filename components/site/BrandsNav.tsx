"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { useCatalog } from "@/components/site/catalog-context";
import {
  navTextClass,
  type HeaderVariant,
} from "@/components/site/header-chrome";

/**
 * BRANDS header item (D-056 — reverses D-021's CATALOG rename).
 *
 * Renamed back from CATALOG, and the item is now a disclosure rather than a
 * single action: hovering (desktop) or tapping (touch) opens a panel listing
 * the allowlisted brands — each navigating to its brand page — with a CATALOG
 * entry beneath the last brand that opens the Brand Book flip-book modal, which
 * is what the header item itself used to do.
 *
 * The hero hover-swap is unchanged (build plan decision 8): pointer-entering
 * the item still fires navEnter("BRANDS"), which is the nav_target the seeded
 * landing asset already carries — the label and the data agree again.
 *
 * Unlike STORE LOCATOR / YOUR REWARDS this item is NOT hidden below md: it is
 * the only route to the brand pages and the Brand Book from the header on a
 * phone (the fullscreen menu still carries its own CATALOG entry, D-028).
 *
 * Both header treatments are supported (guardrail #5): the panel is white with
 * black content under the solid bar and near-black with white content under the
 * transparent brand-page overlay, so it reads against either ground.
 */

/** Forgiveness window so a diagonal cursor path to the panel doesn't close it. */
const CLOSE_DELAY_MS = 140;

export function BrandsNav({
  variant,
  overlayLight,
  onNavEnter,
  onNavLeave,
}: {
  variant: HeaderVariant;
  /** Overlay treatment over a light asset — dark content instead of white. */
  overlayLight: boolean;
  onNavEnter: (navTarget: string) => void;
  onNavLeave: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const catalog = useCatalog();

  // Open state is KEYED TO THE PATH it was opened on rather than a bare
  // boolean. When a panel Link navigates, `pathname` changes and `open` falls
  // to false during the next render — so there is no
  // useEffect(() => setOpen(false), [pathname]), which the repo's
  // react-hooks/set-state-in-effect rule rejects and which would cascade an
  // extra render on every navigation. Derive, don't synchronise.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenPath(next ? pathname : null),
    [pathname],
  );

  const overlay = variant === "overlay";

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose, setOpen]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Escape + outside pointer close. Bound only while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, setOpen]);

  // Hover opens on pointer devices; the tap/click toggle below covers touch and
  // doubles as the keyboard activation (Enter/Space fire click).
  const pointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    cancelClose();
    setOpen(true);
    onNavEnter("BRANDS"); // hero hover-swap, unchanged
  };

  const pointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    scheduleClose();
    onNavLeave();
  };

  const triggerClass = `nav-underline font-condensed font-semibold uppercase ${navTextClass(
    variant,
  )} ${overlay && !overlayLight ? "text-white" : "text-neutral-950"}`;

  const panelClass = overlay
    ? "border border-white/15 bg-neutral-950/95 text-white shadow-2xl backdrop-blur-sm"
    : "border border-neutral-200 bg-white text-neutral-950 shadow-xl";

  const itemClass = `block w-full whitespace-nowrap px-4 py-2.5 text-left font-condensed text-[0.85rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
    overlay ? "hover:bg-white/10" : "hover:bg-neutral-100"
  }`;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerEnter={pointerEnter}
      onPointerLeave={pointerLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          cancelClose();
          setOpen(!open);
        }}
        className={triggerClass}
      >
        BRANDS
      </button>

      {open && (
        // pt-2 is the hover bridge — without it the gap between the bar and the
        // panel counts as a pointerleave and the panel closes on the way down.
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div
            className={`min-w-[13rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-md py-1 ${panelClass}`}
          >
            {BRANDS.map((brand) => (
              <Link
                key={brand.slug}
                href={`/${brand.slug}`}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {brand.name}
              </Link>
            ))}
            <div
              className={`my-1 h-px ${overlay ? "bg-white/15" : "bg-neutral-200"}`}
            />
            {catalog.available ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  catalog.openCatalog();
                }}
                className={itemClass}
              >
                Catalog
              </button>
            ) : (
              // No rendered brand book — degrade to the on-page brand rows.
              <Link
                href="/#brands"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                Catalog
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
