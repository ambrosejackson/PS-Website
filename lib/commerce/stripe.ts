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

export async function ensureNewsletterCoupon(stripe: Stripe): Promise<string> {
  try {
    await stripe.coupons.retrieve(NEWSLETTER_COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: NEWSLETTER_COUPON_ID,
      name: "Newsletter 15% (one-time)",
      percent_off: 15,
      duration: "once",
    });
  }
  return NEWSLETTER_COUPON_ID;
}

/**
 * Create the Stripe promotion code for a newsletter discount code:
 * single use, first order only (Stripe enforces first_time_transaction on the
 * card rail; we enforce the same rule ourselves on the PayPal rail).
 */
export async function createStripePromotionCode(code: string): Promise<string> {
  const stripe = getStripe();
  const coupon = await ensureNewsletterCoupon(stripe);
  const existing = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon },
    code,
    max_redemptions: 1,
    restrictions: { first_time_transaction: true },
  });
  return promo.id;
}
