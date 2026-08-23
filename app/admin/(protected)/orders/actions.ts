"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { sendOrderEmails, sendShippingEmail } from "@/lib/commerce/emails";
import { getOrderWithItems, updateOrder } from "@/lib/commerce/orders";
import type { Json } from "@/lib/database.types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const FULFILLMENT = ["new", "placed_with_provider", "packed", "shipped", "delivered", "canceled"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT)[number];

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

function touch(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function setFulfillmentStatus(id: string, status: FulfillmentStatus): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!FULFILLMENT.includes(status)) return { ok: false, error: "Bad status." };
  try {
    await updateOrder(id, {
      fulfillment_status: status,
      ...(status === "shipped" ? { shipped_at: new Date().toISOString() } : {}),
    });
    touch(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

/** Save carrier + number (+ optional URL) to tracking jsonb, mark shipped, email the customer. */
export async function saveTracking(
  id: string,
  input: { carrier: string; number: string; url?: string | null; notify: boolean },
): Promise<ActionResult<{ emailed: boolean }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const carrier = input.carrier.trim();
  const number = input.number.trim();
  if (!carrier || !number) return { ok: false, error: "Carrier and tracking number are required." };
  const url = input.url?.trim() || guessTrackingUrl(carrier, number);
  const tracking = { carrier, number, url, added_at: new Date().toISOString() };
  try {
    await updateOrder(id, {
      tracking: tracking as unknown as Json,
      fulfillment_status: "shipped",
      shipped_at: new Date().toISOString(),
    });
    let emailed = false;
    if (input.notify) {
      const order = await getOrderWithItems(id);
      if (order) {
        const r = await sendShippingEmail(order, tracking);
        emailed = r.ok && !("skipped" in r && r.skipped);
      }
    }
    touch(id);
    return { ok: true, data: { emailed } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

/** Re-send the customer confirmation + staff notification (e.g. after fixing email DNS). */
export async function resendOrderEmails(id: string): Promise<ActionResult<{ results: string[] }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const order = await getOrderWithItems(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "pending" || order.status === "failed") return { ok: false, error: "Order isn't paid." };
  const results = await sendOrderEmails(order);
  const summary = results.map((r) => (r.ok ? ("skipped" in r && r.skipped ? `skipped (${r.reason})` : "sent") : `failed: ${r.error}`));
  if (results.some((r) => !r.ok)) return { ok: false, error: summary.join(" · ") };
  return { ok: true, data: { results: summary } };
}

export async function saveInternalNote(id: string, note: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  try {
    await updateOrder(id, { internal_note: note.trim() || null });
    touch(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

/** Manual refund MARKER only — the actual refund is issued in Stripe / PayPal. */
export async function setRefundFlag(id: string, refunded: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  try {
    await updateOrder(id, { status: refunded ? "refunded" : "paid" });
    touch(id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

function guessTrackingUrl(carrier: string, number: string): string | null {
  const c = carrier.toLowerCase();
  const n = encodeURIComponent(number);
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
  return null;
}
