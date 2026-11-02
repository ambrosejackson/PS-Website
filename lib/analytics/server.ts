import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT } from "@/lib/analytics/schema";

/**
 * Server-side analytics writes (D-140): the `purchase` event and Stripe
 * refunds. Both are called from payment flows, so they must never throw into
 * the caller — a failed analytics write is logged, not surfaced.
 */

type Db = ReturnType<typeof createAdminClient>;

/**
 * One `purchase` row per order that flips to paid, on either rail. Attribution
 * comes from the ids stored on the order at checkout start. When they are
 * missing (consent declined, direct link, pre-P2 session) the row is still
 * written with session_id = 'server:<order id>' and props.unattributed = true,
 * so revenue-bearing events are never silently undercounted.
 */
export async function recordPurchaseEvent(
  db: Db,
  order: { id: string; total_cents: number | null; web_session_id: string | null; web_visitor_id: string | null },
): Promise<void> {
  try {
    const attributed = !!order.web_session_id;
    const { error } = await db.from("web_events").insert({
      session_id: order.web_session_id ?? `server:${order.id}`,
      visitor_id: order.web_visitor_id,
      path: "/checkout",
      event_type: EVENT.purchase,
      brand: null,
      device: null,
      props: {
        order_id: order.id,
        cents: order.total_cents ?? 0,
        ...(attributed ? {} : { unattributed: true }),
      },
    });
    if (error) console.error("[analytics] purchase event failed", order.id, error.message);
  } catch (e) {
    console.error("[analytics] purchase event failed", order.id, e instanceof Error ? e.message : e);
  }
}

/**
 * Stripe `charge.refunded`: `amount_refunded` is the cumulative total for the
 * charge, so it is assigned, never added — replays are idempotent. A refund
 * covering the whole order total moves status to 'refunded'.
 */
export async function applyStripeRefund(
  db: Db,
  input: { paymentIntentId: string; amountRefundedCents: number },
): Promise<{ ok: boolean; reason?: string }> {
  const { data: order, error } = await db
    .from("orders")
    .select("id, total_cents, status")
    .eq("stripe_payment_intent", input.paymentIntentId)
    .maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!order) return { ok: false, reason: "order not found for payment intent" };

  const full = order.total_cents !== null && input.amountRefundedCents >= order.total_cents;
  const { error: upErr } = await db
    .from("orders")
    .update({
      refunded_cents: input.amountRefundedCents,
      refunded_at: new Date().toISOString(),
      ...(full && order.status !== "refunded" ? { status: "refunded" } : {}),
    })
    .eq("id", order.id);
  if (upErr) return { ok: false, reason: upErr.message };
  return { ok: true };
}
