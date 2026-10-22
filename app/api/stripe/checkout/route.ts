import { NextResponse } from "next/server";
import { CURRENCY, SERVICE_LABEL, SHIP_COUNTRIES, TAX_CODE_GOODS, TAX_CODE_SHIPPING, isShippingService } from "@/lib/commerce/config";
import { createPendingOrder, updateOrder } from "@/lib/commerce/orders";
import { applyDiscount, priceCart, PricingError, shipCart, validatePromo } from "@/lib/commerce/pricing";
import { formatShipsAfter } from "@/lib/commerce/preorder";
import { getStripe, stripeConfigured } from "@/lib/commerce/stripe";

/**
 * Stripe rail (D-039): Checkout Session, mode=payment, built ONLY from
 * server-verified variant prices. Stripe Tax (automatic_tax), the USPS service
 * the buyer picked on the cart page RE-QUOTED here from their ZIP (D-120) as
 * the session's single ad-hoc shipping_rate, wallets via Stripe's
 * automatic payment methods (Apple Pay / Google Pay / Link / Cash App Pay are
 * enabled in the Dashboard), shipping address collected by Stripe, newsletter
 * promo codes honoured (entered here → pre-applied; otherwise
 * allow_promotion_codes on Stripe's page, with first_time_transaction).
 * A PENDING order row is written first; the webhook flips it to paid.
 */
export const dynamic = "force-dynamic";

function siteOrigin(request: Request): string {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = h.get("origin");
  if (origin) return origin;
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";
}

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Card checkout isn't configured yet." }, { status: 503 });
  }
  let body: {
    lines?: { variantId: string; qty: number }[];
    promoCode?: string | null;
    email?: string | null;
    shipZip?: string;
    shipService?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() || null;

  if (!isShippingService(body.shipService)) {
    return NextResponse.json({ error: "Pick a shipping option on the cart page first." }, { status: 400 });
  }

  try {
    const priced = await priceCart(body.lines ?? []);
    const cart = await shipCart(priced, body.shipZip ?? "", body.shipService);
    const promo = await validatePromo(body.promoCode, email);
    const { discountCents } = promo ? applyDiscount(cart, promo.pct) : { discountCents: 0 };
    const service = SERVICE_LABEL[cart.shippingService];
    const shipsAfterText = formatShipsAfter(cart.shipsAfter);

    const orderId = await createPendingOrder({
      provider: "stripe",
      email,
      customerName: null,
      lines: cart.lines,
      subtotalCents: cart.subtotalCents,
      discountCents,
      shippingCents: cart.shippingCents,
      taxCents: 0, // Stripe Tax computes it on the hosted page; webhook records the final number
      totalCents: null,
      promoCode: promo?.code ?? null,
      discountCodeId: promo?.id ?? null,
      shippingAddress: null,
      shippingService: cart.shippingService,
      shippingQuoteId: cart.shippingQuoteId,
      shippingQuoteFallback: cart.shippingQuoteFallback,
      shipsAfter: cart.shipsAfter,
    });

    const origin = siteOrigin(request);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      customer_email: email ?? undefined,
      customer_creation: "if_required",
      line_items: cart.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: l.unitCents,
          tax_behavior: "exclusive",
          product_data: {
            name: l.variantLabel ? `${l.title} — ${l.variantLabel}` : l.title,
            ...(l.shipsAfter ? { description: `Pre-order · ships by ${formatShipsAfter(l.shipsAfter)}` } : {}),
            tax_code: TAX_CODE_GOODS,
            metadata: { variant_id: l.variantId, sku: l.sku, fulfillment_provider: l.fulfillmentProvider },
            ...(l.imageUrl && /^https?:\/\//.test(l.imageUrl) ? { images: [l.imageUrl] } : {}),
          },
        },
      })),
      automatic_tax: { enabled: true },
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name:
              cart.shippingCents === 0 ? `Free ${service.name} shipping (${service.carrier})` : `${service.name} — ${service.carrier}`,
            fixed_amount: { amount: cart.shippingCents, currency: CURRENCY },
            tax_behavior: "exclusive",
            tax_code: TAX_CODE_SHIPPING,
            ...(cart.shippingOption.days
              ? {
                  delivery_estimate: {
                    minimum: { unit: "business_day", value: Math.max(1, cart.shippingOption.days - 1) },
                    maximum: { unit: "business_day", value: cart.shippingOption.days + 2 },
                  },
                }
              : {}),
          },
        },
      ],
      ...(shipsAfterText
        ? {
            custom_text: {
              shipping_address: { message: `Pre-order: this order ships by ${shipsAfterText}.` },
              submit: { message: `Pre-order — ships by ${shipsAfterText}. Shipping was quoted for ZIP ${body.shipZip}; use the same ZIP here.` },
            },
          }
        : {
            custom_text: { submit: { message: `Shipping was quoted for ZIP ${body.shipZip}. Use the same ZIP here.` } },
          }),
      ...(promo
        ? { discounts: [{ promotion_code: promo.stripePromotionCodeId }] }
        : { allow_promotion_codes: true }),
      billing_address_collection: "auto",
      success_url: `${origin}/apparel/order/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/apparel/checkout`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    });

    await updateOrder(orderId, { stripe_session_id: session.id });
    return NextResponse.json({ url: session.url, orderId });
  } catch (e) {
    if (e instanceof PricingError) return NextResponse.json({ error: e.message }, { status: 400 });
    const msg = e instanceof Error ? e.message : "Checkout failed.";
    console.error("[stripe/checkout]", msg);
    return NextResponse.json({ error: "Could not start checkout — please try again." }, { status: 500 });
  }
}
