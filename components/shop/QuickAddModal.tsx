"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/context";
import type { ShopProduct } from "@/lib/merch/queries";
import { normalizeImages, primaryImage } from "@/lib/merchImages";
import { DESKTOP_QUERY, useMediaQuery } from "./useMediaQuery";
import { priceLabel, productHref, sizeOptions, variantLabel, type SizeOption } from "./product-utils";

/**
 * Quick-add size picker (D-076, D-081): a centered modal on desktop, a bottom
 * sheet on mobile — the reference's behaviour — with the brief's interior
 * rules: sizes in SIZE_ORDER, sold-out pills disabled + struck through, Add to
 * cart enabled once a size is chosen, opening focuses the first enabled pill,
 * Escape / × / backdrop close and focus returns to the trigger. Adds through
 * the existing cart context (drawer opens on add — D-075).
 */
export function QuickAddModal({
  product,
  color,
  open,
  onOpenChange,
}: {
  product: ShopProduct;
  color: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const cart = useCart();
  const options = sizeOptions(product, color);
  const [picked, setPicked] = useState<SizeOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstPillRef = useRef<HTMLButtonElement | null>(null);
  const images = normalizeImages(product.images);
  const image = primaryImage(images, color);
  const firstEnabledIdx = options.findIndex((o) => !o.soldOut);

  function add() {
    if (!picked || picked.soldOut) {
      setError("Select a size.");
      return;
    }
    try {
      cart.add({
        variantId: picked.variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variantLabel(picked.variant),
        sku: picked.variant.sku,
        priceCents: picked.variant.price_cents,
        image: image?.url ?? null,
      });
      setError(null);
      setPicked(null);
      onOpenChange(false);
    } catch {
      setError("Could not add to cart — please try again.");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked(null);
      setError(null);
    }
    onOpenChange(next);
  }

  const body = (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
      <div className="relative hidden aspect-square w-full overflow-hidden bg-[#f0f0f0] md:block">
        {image ? (
          <Image src={image.url} alt={image.alt ?? product.name} fill sizes="(min-width: 768px) 40vw, 0px" className="object-cover" />
        ) : null}
      </div>
      <div className="flex flex-col md:pt-8">
        <p className="font-condensed text-2xl font-bold uppercase tracking-tight text-ink md:text-3xl">{product.name}</p>
        <p className="mt-2 text-base text-ink">{priceLabel(product, color)}</p>
        {color && <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{color}</p>}
        <hr className="my-5 border-hairline" />
        <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">Size</p>
        <div className="mt-2 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Size">
          {options.map((o, i) => {
            const selected = picked?.size === o.size;
            return (
              <button
                key={o.size}
                ref={i === firstEnabledIdx ? firstPillRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={o.soldOut || undefined}
                disabled={o.soldOut}
                onClick={() => {
                  setPicked(o);
                  setError(null);
                }}
                className={`h-9 border font-condensed text-xs font-semibold uppercase tracking-wide transition-colors ${
                  selected ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                } disabled:cursor-not-allowed disabled:border-hairline disabled:text-neutral-300 disabled:line-through disabled:hover:border-hairline`}
              >
                {o.size}
              </button>
            );
          })}
        </div>
        {options.length === 0 && <p className="mt-2 text-xs text-neutral-500">Sizing is being finalized.</p>}
        <button
          type="button"
          onClick={add}
          disabled={!picked}
          className="mt-8 w-full bg-ink py-4 font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to cart
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        <Link
          href={productHref(product, color)}
          onClick={() => handleOpenChange(false)}
          className="nav-underline mt-4 self-start font-condensed text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Product details →
        </Link>
      </div>
    </div>
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          initialFocus={firstPillRef}
          className="w-[min(1080px,calc(100%-2rem))] max-w-none rounded-none bg-white p-8 motion-reduce:animate-none md:p-10 sm:max-w-none"
        >
          <DialogTitle className="sr-only">Select a size — {product.name}</DialogTitle>
          <DialogDescription className="sr-only">Choose a size, then add to cart.</DialogDescription>
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" initialFocus={firstPillRef} className="max-h-[85svh] overflow-y-auto rounded-t-none bg-white px-5 pb-8 pt-10 motion-reduce:transition-none">
        <SheetTitle className="sr-only">Select a size — {product.name}</SheetTitle>
        <SheetDescription className="sr-only">Choose a size, then add to cart.</SheetDescription>
        {body}
      </SheetContent>
    </Sheet>
  );
}
