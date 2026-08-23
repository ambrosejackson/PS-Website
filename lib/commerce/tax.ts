import "server-only";
import { CURRENCY, TAX_CODE_GOODS, TAX_CODE_SHIPPING } from "@/lib/commerce/config";
import type { PricedLine } from "@/lib/commerce/pricing";
import type { ShippingAddressJson } from "@/lib/commerce/orders";
import { getStripe } from "@/lib/commerce/stripe";

/**
 * Stripe Tax calculation for the PayPal rail (D-039: "Stripe Tax everywhere").
 * Same line items (post-discount, exclusive), same shipping amount and the
 * same tax codes Stripe Checkout uses, so both rails charge identical tax.
 */
export async function calculateTax(input: {
  lines: PricedLine[];
  shippingCents: number;
  address: ShippingAddressJson;
}): Promise<{ taxCents: number; calculationId: string | null }> {
  const stripe = getStripe();
  const calc = await stripe.tax.calculations.create({
    currency: CURRENCY,
    line_items: input.lines.map((l) => ({
      amount: l.discountedCents,
      quantity: l.qty,
      reference: l.sku || l.variantId,
      tax_behavior: "exclusive",
      tax_code: TAX_CODE_GOODS,
    })),
    shipping_cost: {
      amount: input.shippingCents,
      tax_behavior: "exclusive",
      tax_code: TAX_CODE_SHIPPING,
    },
    customer_details: {
      address: {
        line1: input.address.line1 ?? undefined,
        line2: input.address.line2 ?? undefined,
        city: input.address.city ?? undefined,
        state: input.address.state ?? undefined,
        postal_code: input.address.postal_code ?? undefined,
        country: input.address.country ?? "US",
      },
      address_source: "shipping",
    },
    expand: [],
  });
  return { taxCents: calc.tax_amount_exclusive, calculationId: calc.id ?? null };
}
