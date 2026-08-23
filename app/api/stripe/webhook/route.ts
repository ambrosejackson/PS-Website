import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/commerce/emails";
import {
  finalizeOrderPaid,
  redeemDiscountByStripePromotionCode,
  type ShippingAddressJson,
} from "@/lib/commerce/orders";
import { getStripe, stripeConfigured } from "@/lib/commerce/stripe";

/**
 * Stripe webhook (D-041): `checkout.session.completed` (and
 * `checkout.session.async_payment_succeeded` for delayed methods) flips the
 * pending order to paid with Stripe's final amounts (subtotal / discount /
 * shipping / tax / total), shipping address + email, redeems a promo entered on
 * Stripe's page, sends the emails. `checkout.session.expired` / async failure →
 * order failed. Signature verified with STRIPE_WEBHOOK_SECRET on the RAW body.
 *
 * Dashboard: Developers → Webhooks → Add endpoint →
 *   https://<deployment>/api/stripe/webhook, events: checkout.session.completed,
 *   checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
 *   checkout.session.expired → copy the signing secret into STRIPE_WEBHOOK_SECRET.
 */
export const dynamic = "force-dynamic";

async function applyPaidSession(session: Stripe.Checkout.Session) {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!orderId) return { ok: false, reason: "no order id on session" };

  const stripe = getStripe();
  // Expand discounts so a code entered on Stripe's page can be redeemed on our side.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["total_details.breakdown", "payment_intent"],
  });
  const ship = full.collected_information?.shipping_details;
  const addr = ship?.address;
  const shippingAddress: ShippingAddressJson | null = addr
    ? {
        name: ship?.name ?? full.customer_details?.name ?? null,
        line1: addr.line1 ?? null,
        line2: addr.line2 ?? null,
        city: addr.city ?? null,
        state: addr.state ?? null,
        postal_code: addr.postal_code ?? null,
        country: addr.country ?? null,
      }
    : null;

  const breakdownDiscounts = full.total_details?.breakdown?.discounts ?? [];
  let promoCode: string | null = null;
  for (const d of breakdownDiscounts) {
    const pc = d.discount?.promotion_code;
    const pcId = typeof pc === "string" ? pc : pc?.id;
    if (pcId) {
      const code = await redeemDiscountByStripePromotionCode(pcId);
      if (code) promoCode = code;
    }
  }
  const pi = full.payment_intent;
  const paymentIntentId = typeof pi === "string" ? pi : (pi?.id ?? null);

  const result = await finalizeOrderPaid(orderId, {
    stripe_session_id: full.id,
    stripe_payment_intent: paymentIntentId,
    email: full.customer_details?.email?.toLowerCase() ?? undefined,
    customer_name: full.customer_details?.name ?? ship?.name ?? undefined,
    subtotal_cents: full.amount_subtotal ?? undefined,
    discount_cents: full.total_details?.amount_discount ?? 0,
    shipping_cents: full.total_details?.amount_shipping ?? 0,
    tax_cents: full.total_details?.amount_tax ?? 0,
    total_cents: full.amount_total ?? undefined,
    shipping_address: shippingAddress ? (shippingAddress as unknown as Record<string, string | null>) : undefined,
    ...(promoCode ? { promo_code: promoCode } : {}),
  });
  if (!result) return { ok: false, reason: "order not found" };
  if (!result.alreadyPaid) await sendOrderEmails(result.order);
  return { ok: true, alreadyPaid: result.alreadyPaid };
}

async function markFailed(session: Stripe.Checkout.Session) {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!orderId) return;
  const db = createAdminClient();
  await db.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
}

export async function POST(request: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 503 });
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "?"}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Delayed payment methods complete later via async_payment_succeeded.
        if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
          await applyPaidSession(s);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded":
        await applyPaidSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await markFailed(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook]", event.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
