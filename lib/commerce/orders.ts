import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/database.types";
import type { PricedLine } from "@/lib/commerce/pricing";

/**
 * Orders persistence shared by both rails. A PENDING order (+ item snapshots)
 * is written when checkout starts; the Stripe webhook / PayPal capture flips it
 * to paid with the final amounts. No inventory tracking (D-040).
 */

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderWithItems = OrderRow & { order_items: OrderItemRow[] };

export interface ShippingAddressJson {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export async function createPendingOrder(input: {
  provider: "stripe" | "paypal";
  email: string | null;
  customerName: string | null;
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number | null;
  promoCode: string | null;
  discountCodeId: string | null;
  shippingAddress: ShippingAddressJson | null;
  stripeTaxCalculationId?: string | null;
}): Promise<string> {
  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      payment_provider: input.provider,
      status: "pending",
      fulfillment_status: "new",
      email: input.email?.toLowerCase() ?? null,
      customer_name: input.customerName,
      subtotal_cents: input.subtotalCents,
      discount_cents: input.discountCents,
      shipping_cents: input.shippingCents,
      tax_cents: input.taxCents,
      total_cents: input.totalCents,
      promo_code: input.promoCode,
      discount_code_id: input.discountCodeId,
      shipping_address: (input.shippingAddress ?? null) as Json,
      stripe_tax_calculation_id: input.stripeTaxCalculationId ?? null,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Could not create order.");

  const { error: itemsErr } = await db.from("order_items").insert(
    input.lines.map((l) => ({
      order_id: order.id,
      variant_id: l.variantId,
      product_id: l.productId,
      qty: l.qty,
      unit_price_cents: l.unitCents,
      title: l.title,
      sku: l.sku,
      variant_label: l.variantLabel,
      fulfillment_provider: l.fulfillmentProvider,
      image_url: l.imageUrl,
    })),
  );
  if (itemsErr) throw new Error(itemsErr.message);
  return order.id;
}

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const db = createAdminClient();
  const { data } = await db.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  return (data as OrderWithItems | null) ?? null;
}

export async function updateOrder(id: string, patch: Database["public"]["Tables"]["orders"]["Update"]) {
  const db = createAdminClient();
  const { error } = await db.from("orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Mark the newsletter code redeemed (idempotent). */
export async function redeemDiscountCode(discountCodeId: string | null) {
  if (!discountCodeId) return;
  const db = createAdminClient();
  await db
    .from("discount_codes")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", discountCodeId)
    .is("redeemed_at", null);
}

export async function redeemDiscountByStripePromotionCode(promotionCodeId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("discount_codes")
    .select("id, code")
    .eq("stripe_promotion_code_id", promotionCodeId)
    .maybeSingle();
  if (!data) return null;
  await redeemDiscountCode(data.id);
  return data.code;
}
