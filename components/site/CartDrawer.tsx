"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { money } from "@/lib/commerce/config";
import { pairWithProducts } from "@/lib/merch/actions";
import type { ShopProduct } from "@/lib/merch/queries";
import { normalizeImages, primaryImage } from "@/lib/merchImages";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CartLines, CartSummary } from "@/components/shop/CartLines";
import { QuickAddModal } from "@/components/shop/QuickAddModal";
import { isOneSize, priceLabel, sizeOptions, variantLabel } from "@/components/shop/product-utils";

/**
 * Cart drawer (D-067): opens on every add and from the header cart icon.
 * Right-side sheet, ~420 px desktop / full width mobile. Header "Cart" +
 * close · empty state · line items · "Pair with" (up to 3 products from the
 * last-added item's collection, not already in the cart) · Items / Subtotal ·
 * Check Out (→ existing checkout) · View cart (→ /apparel/cart) · disclaimer.
 * Base UI Sheet provides the focus trap, Escape, aria-modal and scroll lock.
 */
export function CartDrawer() {
  const cart = useCart();
  const close = () => cart.setOpen(false);
  const last = cart.lines[cart.lines.length - 1];
  const lastProductId = last?.productId ?? null;
  const productIdsKey = cart.lines.map((l) => l.productId).join(",");
  const [pair, setPair] = useState<{ key: string; products: ShopProduct[] }>({ key: "", products: [] });

  useEffect(() => {
    if (!cart.open || !lastProductId) return;
    const key = `${lastProductId}|${productIdsKey}`;
    if (pair.key === key) return;
    let cancelled = false;
    pairWithProducts({ productId: lastProductId, excludeProductIds: productIdsKey.split(",").filter(Boolean) })
      .then((products) => {
        if (!cancelled) setPair({ key, products });
      })
      .catch(() => {
        if (!cancelled) setPair({ key, products: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [cart.open, lastProductId, productIdsKey, pair.key]);

  return (
    <Sheet open={cart.open} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-white p-0 motion-reduce:transition-none sm:max-w-[420px]">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <SheetTitle className="font-condensed text-lg font-bold uppercase tracking-wide text-ink">
            Cart{cart.count > 0 ? ` (${cart.count})` : ""}
          </SheetTitle>
          <SheetDescription className="sr-only">Your shopping cart.</SheetDescription>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 text-center">
            <p className="font-condensed text-base uppercase tracking-wide text-ink">Your cart is empty</p>
            <button
              type="button"
              onClick={close}
              className="bg-ink px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines lines={cart.lines} onNavigate={close} compact />
              {pair.products.length > 0 && (
                <div className="border-t border-hairline py-4">
                  <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">Pair with</p>
                  <ul className="mt-3 space-y-3">
                    {pair.products.map((p) => (
                      <PairRow key={p.id} product={p} onNavigate={close} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="border-t border-hairline px-5 py-4">
              <CartSummary />
              <Link
                href="/apparel/checkout"
                onClick={close}
                className="mt-4 block bg-ink py-3.5 text-center font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
              >
                Check out — {money(cart.subtotalCents)}
              </Link>
              <Link href="/apparel/cart" onClick={close} className="nav-underline mx-auto mt-3 block w-fit font-condensed text-xs font-semibold uppercase tracking-wide text-ink">
                View cart
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Compact "Pair with" row: thumb, name, price, `+` (One Size adds directly, else the size modal). */
function PairRow({ product, onNavigate }: { product: ShopProduct; onNavigate: () => void }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const images = normalizeImages(product.images);
  const image = primaryImage(images, null);
  const options = sizeOptions(product, null);
  const oneSize = isOneSize(options);
  function add() {
    if (oneSize && !options[0].soldOut) {
      const o = options[0];
      cart.add({
        variantId: o.variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variantLabel(o.variant),
        sku: o.variant.sku,
        priceCents: o.variant.price_cents,
        image: image?.url ?? null,
      });
      return;
    }
    setOpen(true);
  }
  return (
    <li className="flex items-center gap-3">
      <Link href={`/apparel/${product.slug}`} onClick={onNavigate} className="h-14 w-14 shrink-0 overflow-hidden bg-[#f0f0f0]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/apparel/${product.slug}`} onClick={onNavigate} className="block truncate font-condensed text-xs font-semibold uppercase tracking-wide text-ink">
          {product.name}
        </Link>
        <p className="text-xs text-neutral-500">{priceLabel(product, null)}</p>
      </div>
      {options.length > 0 && !options.every((o) => o.soldOut) && (
        <button
          type="button"
          onClick={add}
          aria-label={oneSize ? `Add ${product.name} to cart` : `Choose a size for ${product.name}`}
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center border border-ink bg-white text-base leading-none text-ink hover:bg-ink hover:text-white"
        >
          +
        </button>
      )}
      {!oneSize && <QuickAddModal product={product} color={null} open={open} onOpenChange={setOpen} />}
    </li>
  );
}
