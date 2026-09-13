import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from "@/lib/commerce/config";

/**
 * One thin full-width strip BELOW the hero (guardrail #4 — never above or over
 * it). Not sticky, not dismissible, not a banner component. Copy comes from the
 * shipping rule in lib/commerce/config so it can never drift from checkout.
 */
export function ShippingLine() {
  const flat = `$${(SHIPPING_FLAT_CENTS / 100).toFixed(2)}`;
  const free = `$${Math.round(FREE_SHIPPING_THRESHOLD_CENTS / 100)}`;
  return (
    <p className="border-b border-hairline bg-white py-2 text-center font-condensed text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
      Flat {flat} shipping · Free over {free}
    </p>
  );
}
