import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZIP_RE, type ShippingOption, type ShippingQuote, type ShippingService } from "@/lib/commerce/config";
import { parcelForLines, quoteUsps } from "@/lib/shipping/shippo";
import { createStripePromotionCode, stripeConfigured } from "@/lib/commerce/stripe";
import { normalizeImages } from "@/lib/merchImages";

/**
 * Server-side cart pricing — THE only source of truth for amounts. The client
 * sends (variantId, qty); we re-read merch_variants + merch_products and refuse
 * inactive / unknown lines. Also: promo validation against discount_codes
 * (single-use, first order only — mirrors the Stripe restriction so PayPal
 * orders behave identically). Shipping is quoted here too (D-120): the cart
 * page asks /api/shipping/quote for options, and each rail RE-QUOTES from the
 * ZIP + cart at checkout, so a browser can never alter the shipping amount.
 */

export interface CartLineInput {
  variantId: string;
  qty: number;
}

export interface PricedLine {
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  variantLabel: string;
  fulfillmentProvider: string;
  imageUrl: string | null;
  unitCents: number;
  qty: number;
  /** After proportional discount allocation (used for tax parity). */
  discountedCents: number;
  /** Packed parcel data for USPS rating; null → store default (D-120). */
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  /** Pre-order: ISO date the product ships by; null = ships now (D-123). */
  shipsAfter: string | null;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  /** Latest ships_after across the cart (the order's pre-order promise), or null. */
  shipsAfter: string | null;
}

/** A PricedCart plus the shipping the buyer chose, re-quoted server-side. */
export interface ShippedCart extends PricedCart {
  shippingCents: number;
  shippingService: ShippingService;
  shippingQuoteId: string | null;
  shippingQuoteFallback: boolean;
  shippingOption: ShippingOption;
}

export class PricingError extends Error {}

export async function priceCart(input: CartLineInput[]): Promise<PricedCart> {
  const clean = (input ?? [])
    .filter((l) => l && typeof l.variantId === "string" && Number.isInteger(l.qty) && l.qty > 0)
    .map((l) => ({ variantId: l.variantId, qty: Math.min(10, l.qty) }));
  if (clean.length === 0) throw new PricingError("Your cart is empty.");

  const db = createAdminClient();
  const { data, error } = await db
    .from("merch_variants")
    .select(
      "id, sku, size, color, price_cents, is_active, product_id, weight_oz, length_in, width_in, height_in, merch_products(id, name, images, is_active, fulfillment_provider, ships_after)",
    )
    .in(
      "id",
      clean.map((l) => l.variantId),
    );
  if (error) throw new PricingError(error.message);

  const byId = new Map((data ?? []).map((v) => [v.id, v]));
  const lines: PricedLine[] = [];
  for (const l of clean) {
    const v = byId.get(l.variantId);
    const p = v?.merch_products as
      | { id: string; name: string; images: unknown; is_active: boolean; fulfillment_provider: string; ships_after: string | null }
      | null
      | undefined;
    if (!v || !p) throw new PricingError("An item in your cart is no longer available.");
    if (!v.is_active || !p.is_active) throw new PricingError(`${p.name} is no longer available.`);
    const images = normalizeImages(p.images).map((i) => i.url);
    lines.push({
      variantId: v.id,
      productId: p.id,
      title: p.name,
      sku: v.sku,
      variantLabel: [v.size, v.color].filter(Boolean).join(" · "),
      fulfillmentProvider: p.fulfillment_provider,
      imageUrl: images[0] ?? null,
      unitCents: v.price_cents,
      qty: l.qty,
      discountedCents: v.price_cents * l.qty,
      weightOz: v.weight_oz,
      lengthIn: v.length_in,
      widthIn: v.width_in,
      heightIn: v.height_in,
      shipsAfter: p.ships_after,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const shipsAfter = lines.reduce<string | null>((latest, l) => (l.shipsAfter && (!latest || l.shipsAfter > latest) ? l.shipsAfter : latest), null);
  return { lines, subtotalCents: subtotal, shipsAfter };
}

/** Both USPS options for this cart to this ZIP (fallback-flagged when Shippo is unavailable). */
export async function quoteCart(cart: PricedCart, zip: string): Promise<ShippingQuote> {
  const z = (zip ?? "").trim();
  if (!ZIP_RE.test(z)) throw new PricingError("Enter a 5-digit US ZIP code for shipping.");
  return quoteUsps(z, parcelForLines(cart.lines), cart.subtotalCents);
}

/**
 * Resolve the buyer's chosen service into the amount to charge, re-quoting
 * from the ZIP. A service that is no longer offered (Priority during fallback)
 * is a customer-facing error, not a silent downgrade.
 */
export async function shipCart(cart: PricedCart, zip: string, service: ShippingService): Promise<ShippedCart> {
  const quote = await quoteCart(cart, zip);
  const option = quote.options.find((o) => o.service === service);
  if (!option) throw new PricingError("That shipping option isn't available right now — please pick again on the cart page.");
  return {
    ...cart,
    shippingCents: option.cents,
    shippingService: option.service,
    shippingQuoteId: option.rateId,
    shippingQuoteFallback: quote.fallback,
    shippingOption: option,
  };
}

export interface ValidPromo {
  id: string;
  code: string;
  pct: number;
  stripePromotionCodeId: string;
}

/**
 * Validate a newsletter code: exists, not redeemed, not expired, and (when we
 * know the email) the customer has no prior paid order. Returns null when no
 * code was supplied; throws PricingError with a customer-safe message otherwise.
 * When Stripe is configured and the row still has the pre-Stripe stub id, the
 * real promotion code is created now so the card rail can use it.
 */
export async function validatePromo(code: string | null | undefined, email: string | null): Promise<ValidPromo | null> {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return null;
  const db = createAdminClient();
  const { data: row } = await db.from("discount_codes").select("*").eq("code", c).maybeSingle();
  if (!row) throw new PricingError("That promo code isn't valid.");
  if (row.redeemed_at) throw new PricingError("That promo code has already been used.");
  if (row.expires_at && new Date(row.expires_at) < new Date()) throw new PricingError("That promo code has expired.");
  if (email) {
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .in("status", ["paid", "submitted_to_provider", "shipped", "delivered"]);
    if ((count ?? 0) > 0) throw new PricingError("Newsletter codes are valid on a first order only.");
  }
  let stripeId = row.stripe_promotion_code_id;
  if (stripeId.startsWith("stub") && stripeConfigured()) {
    stripeId = await createStripePromotionCode(row.code);
    await db.from("discount_codes").update({ stripe_promotion_code_id: stripeId }).eq("id", row.id);
  }
  return { id: row.id, code: row.code, pct: row.pct, stripePromotionCodeId: stripeId };
}

/** Percent discount on the merchandise subtotal (never on shipping), allocated across lines for tax parity. */
export function applyDiscount(cart: PricedCart, pct: number): { discountCents: number; lines: PricedLine[] } {
  const discountCents = Math.round((cart.subtotalCents * pct) / 100);
  if (discountCents <= 0) return { discountCents: 0, lines: cart.lines };
  let remaining = discountCents;
  const lines = cart.lines.map((l, i) => {
    const gross = l.unitCents * l.qty;
    const share =
      i === cart.lines.length - 1 ? remaining : Math.round((gross / cart.subtotalCents) * discountCents);
    remaining -= share;
    return { ...l, discountedCents: gross - share };
  });
  return { discountCents, lines };
}
