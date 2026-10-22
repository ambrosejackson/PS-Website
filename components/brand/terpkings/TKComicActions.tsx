"use client";

import { useState } from "react";
import { CatalogModal } from "@/components/site/CatalogModal";
import { trackEvent } from "@/components/site/Analytics";
import { useCart } from "@/lib/cart/context";
import { money } from "@/lib/commerce/config";
import { preorderLine } from "@/lib/commerce/preorder";
import type { MerchListing } from "@/lib/data";
import { normalizeImages, primaryImage } from "@/lib/merchImages";
import { COMIC } from "@/lib/terpkings-content";
import manifest from "@/public/terpkings/comic-preview/manifest.json";

/**
 * FILE 02 buttons (D-124): FREE PREVIEW opens the 8-page flip-book of PDF
 * pages 10–17 with the pitch as its final page; GET PRINT ISSUE adds the
 * print product (TK-COMIC-01) to the cart and opens the drawer. The product
 * is the same merch row that appears on /apparel; when it isn't published
 * yet the print button is shown disabled rather than dead-linked.
 */
export function TKComicActions({ printIssue }: { printIssue: MerchListing | null }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const variant = printIssue?.merch_variants.find((v) => v.is_active) ?? null;
  const price = variant ? money(variant.price_cents) : null;
  const preorder = preorderLine(printIssue?.ships_after);

  function addToCart() {
    if (!printIssue || !variant) return;
    const image = primaryImage(normalizeImages(printIssue.images));
    cart.add({
      variantId: variant.id,
      productId: printIssue.id,
      shipsAfter: printIssue.ships_after ?? null,
      slug: printIssue.slug,
      name: printIssue.name,
      variantLabel: [variant.size, variant.color].filter(Boolean).join(" · "),
      sku: variant.sku,
      priceCents: variant.price_cents,
      image: image?.url ?? null,
    });
    trackEvent("comic_add_to_cart", { source: open ? "preview" : "section" });
    setAdded(true);
    if (open) setOpen(false);
  }

  function openPreview() {
    setOpen(true);
    trackEvent("comic_preview_open");
  }
  const closePreview = () => setOpen(false);
  const onPitch = () => trackEvent("comic_preview_complete");

  const fill = (s: string) => s.replace("{price}", price ?? "");

  return (
    <>
      <div className="flex flex-wrap gap-[14px]">
        <button
          type="button"
          onClick={openPreview}
          className="tk-mono tk-btn-amber rounded-[4px] px-7 py-[13px] text-[21px] tracking-[.1em]"
        >
          {COMIC.readCta}
        </button>
        {price ? (
          <button
            type="button"
            onClick={addToCart}
            className="tk-mono tk-btn-outline rounded-[4px] px-7 py-[11px] text-[21px] tracking-[.1em]"
          >
            {added ? COMIC.pitch.added : fill(COMIC.printCta)}
          </button>
        ) : (
          <span
            aria-disabled="true"
            className="tk-mono tk-btn-outline cursor-not-allowed rounded-[4px] px-7 py-[11px] text-[21px] tracking-[.1em] opacity-50"
          >
            {COMIC.printCtaUnavailable}
          </span>
        )}
      </div>
      {preorder && <p className="tk-mono m-0 text-[17px] tracking-[.08em] text-[#8A9E5C]">{preorder}</p>}

      <CatalogModal
        open={open}
        onClose={closePreview}
        pageCount={manifest.pageCount}
        aspectRatio={manifest.aspectRatio}
        basePath={COMIC.preview.basePath}
        altPrefix={COMIC.preview.altPrefix}
        label={COMIC.preview.label}
        theme="terpkings"
        onTrailingReached={onPitch}
        trailing={
          <div className="tk-page flex h-full flex-col justify-center gap-6 bg-[#0B0B0B] px-8 py-10 text-center md:px-12">
            <p className="tk-mono text-[13px] tracking-[.3em] text-[#FFB000]">{COMIC.eyebrow}</p>
            <h3 className="m-0 font-extrabold uppercase leading-none text-[#E8F0C8]" style={{ fontSize: "clamp(26px, 3.2vw, 40px)" }}>
              {COMIC.pitch.heading}
            </h3>
            <p className="tk-mono m-0 text-[18px] leading-[1.55] text-[#8A9E5C]">{fill(COMIC.pitch.body)}</p>
            {price ? (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={addToCart}
                className="tk-mono tk-btn-amber mx-auto rounded-[4px] px-7 py-[13px] text-[19px] tracking-[.1em]"
              >
                {fill(COMIC.pitch.cta)}
              </button>
            ) : (
              <span className="tk-mono mx-auto rounded-[4px] border border-[#FFB000]/40 px-7 py-[11px] text-[19px] tracking-[.1em] text-[#FFB000]/60">
                {COMIC.printCtaUnavailable}
              </span>
            )}
            <p className="tk-mono m-0 text-[13px] tracking-[.12em] text-[#8A9E5C]/80">
              {[preorder, COMIC.pitch.footnote].filter(Boolean).join(" · ")}
            </p>
          </div>
        }
      />
    </>
  );
}
