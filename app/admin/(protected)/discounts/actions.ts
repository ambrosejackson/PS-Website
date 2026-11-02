"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/events/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createAdminDiscountCodes,
  expireDiscountCode,
  parseCreateDiscountsInput,
  type CreatedDiscounts,
} from "@/lib/commerce/discounts";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/** "Expire now": expires_at = now() + Stripe promotion code deactivated (D-142). Idempotent. */
export async function expireDiscount(id: string): Promise<ActionResult<{ alreadyExpired: boolean; stripeDeactivated: boolean }>> {
  if (!(await isAdmin())) return { ok: false, error: "Unauthorized." };
  try {
    const r = await expireDiscountCode(createAdminClient(), id);
    if (!r.found) return { ok: false, error: "Code not found." };
    revalidatePath("/admin/discounts");
    return { ok: true, data: { alreadyExpired: r.alreadyExpired, stripeDeactivated: r.stripeDeactivated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not expire the code." };
  }
}

/** "+ Discount": 1–50 single-use admin codes of one percentage, optional expiry day. */
export async function createDiscounts(raw: { pct: unknown; count: unknown; expiresOn: unknown }): Promise<ActionResult<CreatedDiscounts>> {
  if (!(await isAdmin())) return { ok: false, error: "Unauthorized." };
  const parsed = parseCreateDiscountsInput(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  try {
    const created = await createAdminDiscountCodes(parsed.input);
    revalidatePath("/admin/discounts");
    return { ok: true, data: created };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create codes." };
  }
}
