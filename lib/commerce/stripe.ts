import "server-only";
import Stripe from "stripe";

/** Lazily-constructed Stripe client (STRIPE_SECRET_KEY — test keys on preview). */
let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!client) client = new Stripe(key, { typescript: true });
  return client;
}

/** Coupon shared by every newsletter promotion code: 15% off, once. */
export const NEWSLETTER_COUPON_ID = "PS_NEWSLETTER_15";

/** Coupon shared by every admin-issued code of one percentage (D-142): `PS_ADMIN_20` etc. */
export function adminCouponId(pct: number): string {
  return `PS_ADMIN_${pct}`;
}

/** Retrieve-or-create a fixed-id percent coupon; the id is the cache. */
async function ensureCoupon(stripe: Stripe, id: string, name: string, pct: number): Promise<string> {
  try {
    await stripe.coupons.retrieve(id);
  } catch {
    await stripe.coupons.create({ id, name, percent_off: pct, duration: "once" });
  }
  return id;
}

export function ensureNewsletterCoupon(stripe: Stripe): Promise<string> {
  return ensureCoupon(stripe, NEWSLETTER_COUPON_ID, "Newsletter 15% (one-time)", 15);
}

export function ensureAdminCoupon(stripe: Stripe, pct: number): Promise<string> {
  return ensureCoupon(stripe, adminCouponId(pct), `Admin ${pct}% (one-time)`, pct);
}

/**
 * Which rules a promotion code carries (D-142):
 *  - newsletter: first order only (Stripe enforces first_time_transaction on
 *    the card rail; lib/commerce/pricing.validatePromo mirrors it for PayPal).
 *  - admin: no first-order rule; optional expiry mirrored onto Stripe so the
 *    code fails on the hosted page after that date too.
 */
export type PromotionKind = { kind: "newsletter" } | { kind: "admin"; pct: number; expiresAt?: Date | null };

/** Create (or find) the single-use Stripe promotion code for a discount_codes row. */
export async function createStripePromotionCode(code: string, kind: PromotionKind = { kind: "newsletter" }): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  if (kind.kind === "newsletter") {
    const coupon = await ensureNewsletterCoupon(stripe);
    const promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon },
      code,
      max_redemptions: 1,
      restrictions: { first_time_transaction: true },
    });
    return promo.id;
  }
  const coupon = await ensureAdminCoupon(stripe, kind.pct);
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon },
    code,
    max_redemptions: 1,
    ...(kind.expiresAt ? { expires_at: Math.floor(kind.expiresAt.getTime() / 1000) } : {}),
  });
  return promo.id;
}

/**
 * Deactivate a promotion code so it fails at checkout. Idempotent (Stripe
 * accepts active:false on an inactive code). Stub ids (rows created before
 * Stripe was configured) have nothing to deactivate. Returns whether Stripe
 * was actually updated.
 */
export async function deactivateStripePromotionCode(promotionCodeId: string | null | undefined): Promise<boolean> {
  if (!promotionCodeId || promotionCodeId.startsWith("stub") || !stripeConfigured()) return false;
  await getStripe().promotionCodes.update(promotionCodeId, { active: false });
  return true;
}
