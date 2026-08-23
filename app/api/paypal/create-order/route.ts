import { NextResponse } from "next/server";
import { CURRENCY } from "@/lib/commerce/config";
import { createPendingOrder, updateOrder, type ShippingAddressJson } from "@/lib/commerce/orders";
import { cents, createPayPalOrder, paypalConfigured } from "@/lib/commerce/paypal";
import { applyDiscount, priceCart, PricingError, validatePromo } from "@/lib/commerce/pricing";
import { stripeConfigured } from "@/lib/commerce/stripe";
import { calculateTax } from "@/lib/commerce/tax";

/**
 * PayPal rail, step 1 (D-039): same server-side pricing, same shipping rule,
 * same promo rules, and Stripe Tax calculated on the same (discounted) line
 * items + shipping address → totals identical to the Stripe rail. Writes the
 * PENDING order, creates the PayPal order and returns its id for the buttons.
 */
export const dynamic = "force-dynamic";

interface Body {
  lines?: { variantId: string; qty: number }[];
  email?: string;
  promoCode?: string | null;
  address?: ShippingAddressJson;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal isn't configured yet." }, { status: 503 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Tax calculation isn't configured yet." }, { status: 503 });
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const a = body.address ?? {};
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email for your receipt." }, { status: 400 });
  if (!a.name?.trim() || !a.line1?.trim() || !a.city?.trim() || !a.state?.trim() || !a.postal_code?.trim()) {
    return NextResponse.json({ error: "Enter your full shipping address (name, street, city, state, ZIP)." }, { status: 400 });
  }
  const address: ShippingAddressJson = {
    name: a.name.trim(),
    line1: a.line1.trim(),
    line2: a.line2?.trim() || null,
    city: a.city.trim(),
    state: a.state.trim().toUpperCase(),
    postal_code: a.postal_code.trim(),
    country: (a.country ?? "US").toUpperCase(),
  };

  try {
    const cart = await priceCart(body.lines ?? []);
    const promo = await validatePromo(body.promoCode, email);
    const { discountCents, lines } = promo ? applyDiscount(cart, promo.pct) : { discountCents: 0, lines: cart.lines };
    const { taxCents, calculationId } = await calculateTax({ lines, shippingCents: cart.shippingCents, address });
    const totalCents = cart.subtotalCents - discountCents + cart.shippingCents + taxCents;

    const orderId = await createPendingOrder({
      provider: "paypal",
      email,
      customerName: address.name ?? null,
      lines,
      subtotalCents: cart.subtotalCents,
      discountCents,
      shippingCents: cart.shippingCents,
      taxCents,
      totalCents,
      promoCode: promo?.code ?? null,
      discountCodeId: promo?.id ?? null,
      shippingAddress: address,
      stripeTaxCalculationId: calculationId,
    });

    const pp = await createPayPalOrder({
      orderId,
      email,
      currency: CURRENCY.toUpperCase(),
      value: cents(totalCents),
      breakdown: {
        item_total: cents(cart.subtotalCents),
        shipping: cents(cart.shippingCents),
        tax_total: cents(taxCents),
        ...(discountCents > 0 ? { discount: cents(discountCents) } : {}),
      },
      items: cart.lines.map((l) => ({
        name: l.variantLabel ? `${l.title} — ${l.variantLabel}` : l.title,
        sku: l.sku,
        quantity: l.qty,
        unitValue: cents(l.unitCents),
      })),
      shipping: {
        fullName: address.name!,
        line1: address.line1!,
        line2: address.line2 ?? undefined,
        city: address.city!,
        state: address.state!,
        postalCode: address.postal_code!,
        country: address.country!,
      },
    });

    await updateOrder(orderId, { paypal_order_id: pp.id });
    return NextResponse.json({ id: pp.id, orderId, totals: { subtotalCents: cart.subtotalCents, discountCents, shippingCents: cart.shippingCents, taxCents, totalCents } });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[paypal/create-order]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not start PayPal checkout — please try again." }, { status: 500 });
  }
}
