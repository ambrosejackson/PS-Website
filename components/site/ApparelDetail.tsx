"use client";

import { useMemo, useState } from "react";
import type { MerchListing } from "@/lib/data";

/**
 * Apparel product detail (client): gallery, size/color variant picker that
 * updates the price, quantity, Add to Cart. The cart drawer + checkout arrive
 * next session — for now the click stores the intent in localStorage
 * ("ps_cart") and shows "Checkout launching shortly".
 */

const CART_KEY = "ps_cart";
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export function ApparelDetail({ product }: { product: MerchListing }) {
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const variants = useMemo(() => product.merch_variants.filter((v) => v.is_active), [product.merch_variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))], [variants]);
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter((c): c is string => !!c))], [variants]);

  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find(
    (v) => (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color),
  );
  const prices = variants.map((v) => v.price_cents);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const priceLabel = selected
    ? money(selected.price_cents)
    : minPrice === null
      ? "—"
      : minPrice === maxPrice
        ? money(minPrice)
        : `${money(minPrice)} – ${money(maxPrice!)}`;

  const availableColorsForSize = (s: string) => new Set(variants.filter((v) => v.size === s).map((v) => v.color));
  const availableSizesForColor = (c: string) => new Set(variants.filter((v) => v.color === c).map((v) => v.size));

  function addToCart() {
    if (!selected) return;
    try {
      const raw = localStorage.getItem(CART_KEY);
      const cart: { variantId: string; qty: number; slug: string; sku: string }[] = raw ? JSON.parse(raw) : [];
      const existing = cart.find((l) => l.variantId === selected.id);
      if (existing) existing.qty += qty;
      else cart.push({ variantId: selected.id, qty, slug: product.slug, sku: selected.sku });
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable — intent still acknowledged */
    }
    setAdded(true);
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-16">
      {/* Gallery */}
      <div>
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#f5f5f5]">
          {images[imgIdx] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[imgIdx]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-condensed text-xs uppercase tracking-wide text-neutral-400">Photos coming soon</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {images.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={() => setImgIdx(i)}
                aria-label={`Image ${i + 1}`}
                className={`aspect-square overflow-hidden border ${i === imgIdx ? "border-ink" : "border-hairline"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
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
            {sizes.length > 0 && (
              <div>
                <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Size</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const disabled = !!color && !availableSizesForColor(color).has(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSize(s);
                          setAdded(false);
                        }}
                        className={`min-w-12 border px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wide ${
                          size === s ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {colors.length > 0 && (
              <div>
                <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Color</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const disabled = !!size && !availableColorsForSize(size).has(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setColor(c);
                          setAdded(false);
                        }}
                        className={`border px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wide ${
                          color === c ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
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
                disabled={!selected}
                className="w-full bg-ink px-8 py-4 font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
              >
                {selected ? `Add to Cart — ${money(selected.price_cents * qty)}` : "Select options"}
              </button>
              {selected && <p className="mt-2 text-xs text-neutral-400">SKU {selected.sku}</p>}
              {added && (
                <p className="mt-3 border border-hairline bg-[#fafafa] p-3 text-sm text-ink" role="status">
                  Added. <span className="font-semibold">Checkout launching shortly</span> — secure checkout with Apple Pay,
                  Google Pay, cards and PayPal is on the way; your selection is saved in this browser.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
