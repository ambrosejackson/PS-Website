import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeOrderPaid } from "@/lib/commerce/orders";
import { capturePayPalOrder, paypalConfigured } from "@/lib/commerce/paypal";
import { sendOrderEmails } from "@/lib/commerce/emails";

/**
 * PayPal rail, step 2: capture the approved PayPal order, flip our pending
 * order to paid (idempotent), redeem the promo, send the emails.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal isn't configured yet." }, { status: 503 });
  let body: { paypalOrderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const paypalOrderId = body.paypalOrderId?.trim();
  if (!paypalOrderId) return NextResponse.json({ error: "Missing PayPal order id." }, { status: 400 });

  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, status").eq("paypal_order_id", paypalOrderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ orderId: order.id, alreadyPaid: true });

  try {
    const captured = await capturePayPalOrder(paypalOrderId);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (captured.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
      await db.from("orders").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
      return NextResponse.json({ error: `PayPal payment not completed (${capture?.status ?? captured.status}).` }, { status: 402 });
    }
    const payerEmail = captured.payer?.email_address?.toLowerCase();
    const result = await finalizeOrderPaid(order.id, {
      paypal_capture_id: capture.id,
      ...(payerEmail ? {} : {}),
    });
    if (result && !result.alreadyPaid) {
      await sendOrderEmails(result.order);
    }
    return NextResponse.json({ orderId: order.id });
  } catch (e) {
    console.error("[paypal/capture-order]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "PayPal capture failed — you have not been charged twice; please retry." }, { status: 500 });
  }
}
