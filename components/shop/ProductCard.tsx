"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import type { ShopProduct } from "@/lib/merch/queries";
import { colorHexFor } from "@/lib/merchCategories";
import { defaultColor, hoverImage, normalizeImages, primaryImage, swatchImage } from "@/lib/merchImages";
import { isProductSoldOut, STOCK_BADGE_LABEL, stockBadge } from "@/lib/merchStock";
import { QuickAddModal } from "./QuickAddModal";
import { colorsOf, isOneSize, priceLabel, productHref, sizeOptions, variantLabel, type SizeOption } from "./product-utils";

/**
 * Apparel shop product card — built to the reference measurements (D-081),
 * NOT the landing page's components/site/ProductCard (which stays as is).
 *
 *   image 1:1 · `+` quick-add bottom-left, always visible · badge bottom-right
 *   name / price row (Add to Cart at right) → on desktop hover / focus-within
 *   the row swaps to [Select size ▾] [Add to cart]; image crossfades ONLY when
 *   an image is tagged role='hover' · swatches: hover previews, click commits ·
 *   "See all" past 4 colours · image + name link to the PDP with ?color=.
 */

const SWATCH_LIMIT = 4;
const PLACEHOLDER = "/placeholders/merch-1.png";

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
}: {
  product: ShopProduct;
  priority?: boolean;
  sizes?: string;
}) {
  const cart = useCart();
  const images = normalizeImages(product.images);
  const colors = colorsOf(product);
  const [selectedColor, setSelectedColor] = useState<string | null>(() =>
    colors.length ? (defaultColor(images, product.merch_variants) ?? colors[0]) : null,
  );
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [seeAll, setSeeAll] = useState(false);
  const [hoverSize, setHoverSize] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);

  const viewColor = previewColor ?? selectedColor;
  const primary = primaryImage(images, viewColor);
  const hover = hoverImage(images, viewColor);
  const badge = stockBadge(product.merch_variants, product.low_stock_threshold, selectedColor);
  const soldOut = isProductSoldOut(product.merch_variants, selectedColor);
  const options = sizeOptions(product, selectedColor);
  const oneSize = isOneSize(options);
  const href = productHref(product, selectedColor);
  const shownColors = seeAll ? colors : colors.slice(0, SWATCH_LIMIT);

  function addVariant(o: SizeOption) {
    cart.add({
      variantId: o.variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variantLabel(o.variant),
      sku: o.variant.sku,
      priceCents: o.variant.price_cents,
      image: primary?.url ?? null,
    });
  }

  /** `+`, the Add to Cart button and the hover row all funnel here (D-076). */
  function quickAdd() {
    if (soldOut || options.length === 0) return;
    if (oneSize && !options[0].soldOut) {
      addVariant(options[0]);
      return;
    }
    const chosen = hoverSize ? options.find((o) => o.size === hoverSize && !o.soldOut) : null;
    if (chosen) {
      addVariant(chosen);
      return;
    }
    setModalOpen(true);
  }

  function commitColor(c: string) {
    setSelectedColor(c);
    setPreviewColor(null);
    setHoverSize("");
  }

  return (
    <article className="group relative flex flex-col" data-product={product.slug}>
      {/* Image */}
      <div className="relative">
        <Link href={href} className="block" aria-label={product.name} tabIndex={-1}>
          <div className={`relative aspect-square w-full overflow-hidden bg-[#f0f0f0] ${soldOut ? "opacity-60" : ""}`}>
            <Image
              src={primary?.url ?? PLACEHOLDER}
              alt={primary?.alt ?? product.name}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover"
            />
            {hover && (
              <Image
                src={hover.url}
                alt=""
                fill
                sizes={sizes}
                className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                aria-hidden
              />
            )}
          </div>
        </Link>
        {!soldOut && options.length > 0 && (
          <button
            type="button"
            onClick={quickAdd}
            aria-haspopup={oneSize ? undefined : "dialog"}
            aria-expanded={oneSize ? undefined : modalOpen}
            aria-label={oneSize ? `Add ${product.name} to cart` : `Choose a size for ${product.name}`}
            className="absolute bottom-3 left-3 flex h-[22px] w-[22px] items-center justify-center bg-white text-base font-semibold leading-none text-ink shadow-sm transition-colors hover:bg-ink hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {modalOpen ? "×" : "+"}
          </button>
        )}
        {badge && (
          <span className="pointer-events-none absolute bottom-3 right-0 bg-ink px-2 py-[3px] font-condensed text-[10px] font-bold uppercase tracking-wide text-white">
            {STOCK_BADGE_LABEL[badge]}
          </span>
        )}
      </div>

      {/* Text row — swaps on hover / focus-within (desktop only; hover: variants are hover-media gated) */}
      <div className="relative mt-2 min-h-[40px]">
        <div className="flex items-start justify-between gap-3 group-hover:invisible md:group-focus-within:invisible">
          <div className="min-w-0">
            <Link href={href} className="block truncate font-condensed text-[11px] font-semibold uppercase tracking-wide text-ink">
              {product.name}
            </Link>
            <p className="mt-0.5 text-sm text-ink">{priceLabel(product, selectedColor)}</p>
          </div>
          {!soldOut && options.length > 0 ? (
            <button
              type="button"
              onClick={quickAdd}
              className="shrink-0 font-condensed text-[11px] font-bold uppercase tracking-wide text-ink hover:underline"
            >
              Add to cart
            </button>
          ) : soldOut ? (
            <span className="shrink-0 font-condensed text-[11px] font-bold uppercase tracking-wide text-neutral-400">Sold out</span>
          ) : null}
        </div>
        {!soldOut && options.length > 0 && (
          <div className="invisible absolute inset-x-0 top-0 flex items-center gap-2 group-hover:visible md:group-focus-within:visible">
            {oneSize ? (
              <span className="flex h-9 flex-1 items-center border border-hairline px-3 text-xs text-neutral-600">{options[0].size}</span>
            ) : (
              <select
                aria-label={`Size for ${product.name}`}
                value={hoverSize}
                onChange={(e) => setHoverSize(e.target.value)}
                className="h-9 min-w-0 flex-1 border border-hairline bg-white px-2 text-xs text-ink"
              >
                <option value="">Select size</option>
                {options.map((o) => (
                  <option key={o.size} value={o.size} disabled={o.soldOut}>
                    {o.size}
                    {o.soldOut ? " — sold out" : ""}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={quickAdd}
              className="h-9 flex-1 border border-ink bg-white font-condensed text-[11px] font-bold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Add to cart
            </button>
          </div>
        )}
      </div>

      {/* Swatches */}
      {colors.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {shownColors.map((c) => {
            const thumb = swatchImage(images, c);
            const selected = (selectedColor ?? "").toUpperCase() === c.toUpperCase();
            return (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={selected}
                title={c}
                onMouseEnter={() => setPreviewColor(c)}
                onMouseLeave={() => setPreviewColor(null)}
                onFocus={() => setPreviewColor(c)}
                onBlur={() => setPreviewColor(null)}
                onClick={() => commitColor(c)}
                className={`relative h-[26px] w-[26px] overflow-hidden rounded-full border bg-white p-[2px] transition-shadow ${
                  selected ? "border-ink ring-1 ring-ink ring-offset-1" : "border-hairline hover:border-ink"
                }`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="block h-full w-full rounded-full" style={{ background: colorHexFor(c) }} />
                )}
              </button>
            );
          })}
          {colors.length > SWATCH_LIMIT && !seeAll && (
            <button type="button" onClick={() => setSeeAll(true)} className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-ink underline">
              See all
            </button>
          )}
          {colors.length > SWATCH_LIMIT && <span className="text-[11px] text-neutral-500">{colors.length} colors</span>}
        </div>
      )}

      {!oneSize && <QuickAddModal product={product} color={selectedColor} open={modalOpen} onOpenChange={setModalOpen} />}
    </article>
  );
}
