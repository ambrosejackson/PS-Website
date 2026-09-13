"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MerchListing } from "@/lib/data";
import { useCart } from "@/lib/cart/context";
import { galleryImages, normalizeImages } from "@/lib/merchImages";
import { isProductSoldOut, STOCK_BADGE_LABEL, stockBadge } from "@/lib/merchStock";
import { colorsOf, sizeOptions, variantLabel } from "@/components/shop/product-utils";

/**
 * Apparel product detail (client): gallery (lib/merchImages — the selected
 * colour's images first), colour picker, size pills with the SAME stock rules
 * as the card (lib/merchStock — sold-out sizes disabled + struck through,
 * Low Stock / Sold Out badge), quantity, Add to Cart → cart context (drawer
 * opens). `?color=` preselects a colour when valid (§6.8) — read on the
 * client so the page stays statically rendered.
 */

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

function QueryColor({ onColor }: { onColor: (c: string) => void }) {
  const params = useSearchParams();
  const color = params.get("color");
  useEffect(() => {
    if (color) onColor(color);
  }, [color, onColor]);
  return null;
}

export function ApparelDetail({ product }: { product: MerchListing }) {
  const images = useMemo(() => normalizeImages(product.images), [product.images]);
  const variants = useMemo(() => product.merch_variants.filter((v) => v.is_active), [product.merch_variants]);
  const colors = useMemo(() => colorsOf(product), [product]);

  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [size, setSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();

  const gallery = useMemo(() => galleryImages(images, color), [images, color]);
  const options = useMemo(() => sizeOptions(product, color), [product, color]);
  const badge = stockBadge(variants, product.low_stock_threshold, color);
  const soldOut = isProductSoldOut(variants, color);
  const needsColor = colors.length > 1 && !color;
  const selected = !needsColor ? options.find((o) => o.size === size && !o.soldOut)?.variant ?? null : null;
  // Auto-select the only size once a colour is known.
  const effectiveSelected = selected ?? (!needsColor && options.length === 1 && !options[0].soldOut ? options[0].variant : null);

  const prices = (color ? variants.filter((v) => (v.color ?? "").toUpperCase() === color.toUpperCase()) : variants).map((v) => v.price_cents);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const priceLabel = effectiveSelected
    ? money(effectiveSelected.price_cents)
    : minPrice === null
      ? "—"
      : minPrice === maxPrice
        ? money(minPrice)
        : `${money(minPrice)} – ${money(maxPrice!)}`;

  function applyColor(c: string) {
    const match = colors.find((x) => x.toUpperCase() === c.trim().toUpperCase());
    if (!match) return;
    setColor(match);
    setSize(null);
    setImgIdx(0);
    setAdded(false);
  }

  function addToCart() {
    if (!effectiveSelected) return;
    cart.add(
      {
        variantId: effectiveSelected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variantLabel(effectiveSelected),
        sku: effectiveSelected.sku,
        priceCents: effectiveSelected.price_cents,
        image: gallery[0]?.url ?? null,
      },
      qty,
    );
    setAdded(true);
  }

  const current = gallery[Math.min(imgIdx, Math.max(0, gallery.length - 1))];

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-16">
      <Suspense fallback={null}>
        <QueryColor onColor={applyColor} />
      </Suspense>

      {/* Gallery */}
      <div>
        <div className={`relative flex aspect-square items-center justify-center overflow-hidden bg-[#f5f5f5] ${soldOut ? "opacity-60" : ""}`}>
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={current.alt ?? product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-condensed text-xs uppercase tracking-wide text-neutral-400">Photos coming soon</span>
          )}
          {badge && (
            <span className="absolute bottom-3 right-0 bg-ink px-2 py-[3px] font-condensed text-[10px] font-bold uppercase tracking-wide text-white">
              {STOCK_BADGE_LABEL[badge]}
            </span>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {gallery.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                onClick={() => setImgIdx(i)}
                aria-label={img.alt ?? `Image ${i + 1}`}
                aria-pressed={i === imgIdx}
                className={`aspect-square overflow-hidden border ${i === imgIdx ? "border-ink" : "border-hairline"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        {product.brand && (
          <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">{product.brand}</p>
        )}
        <h1 className="mt-2 font-condensed text-3xl font-bold uppercase leading-tight tracking-tight text-ink md:text-4xl">
          {product.name}
        </h1>
        <p className="mt-3 text-xl text-ink">{priceLabel}</p>
        {product.description && <p className="mt-6 leading-relaxed text-neutral-600">{product.description}</p>}

        {variants.length === 0 ? (
          <p className="mt-8 border border-dashed border-hairline p-6 text-center text-sm text-neutral-400">
            Sizing and pricing are being finalized — check back soon.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            {colors.length > 1 && (
              <div>
                <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Color{color ? <span className="ml-2 normal-case text-ink">{color}</span> : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={color === c}
                      onClick={() => applyColor(c)}
                      className={`border px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wide ${
                        color === c ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(options.length > 1 || (options.length === 1 && options[0].size !== "One Size")) && (
              <div>
                <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Size</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                  {options.map((o) => (
                    <button
                      key={o.size}
                      type="button"
                      role="radio"
                      aria-checked={size === o.size}
                      aria-disabled={o.soldOut || needsColor || undefined}
                      disabled={o.soldOut || needsColor}
                      onClick={() => {
                        setSize(o.size);
                        setAdded(false);
                      }}
                      className={`min-w-12 border px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wide ${
                        size === o.size ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                      } disabled:cursor-not-allowed disabled:opacity-40 ${o.soldOut ? "line-through" : ""}`}
                    >
                      {o.size}
                    </button>
                  ))}
                </div>
                {needsColor && <p className="mt-2 text-xs text-neutral-500">Pick a color first.</p>}
              </div>
            )}
            <div>
              <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Quantity</p>
              <div className="mt-2 inline-flex items-center border border-hairline">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-ink" aria-label="Decrease">
                  −
                </button>
                <span className="min-w-10 text-center text-sm">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} className="px-3 py-2 text-ink" aria-label="Increase">
                  +
                </button>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={addToCart}
                disabled={!effectiveSelected || soldOut}
                className="w-full bg-ink px-8 py-4 font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
              >
                {soldOut ? "Sold out" : effectiveSelected ? `Add to Cart — ${money(effectiveSelected.price_cents * qty)}` : "Select options"}
              </button>
              {effectiveSelected && <p className="mt-2 text-xs text-neutral-400">SKU {effectiveSelected.sku}</p>}
              {added && (
                <p className="mt-3 border border-hairline bg-[#fafafa] p-3 text-sm text-ink" role="status">
                  Added to your cart.{" "}
                  <button type="button" onClick={() => cart.setOpen(true)} className="font-semibold underline">
                    View cart
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
