"use client";

import { useCart } from "@/lib/cart/context";
import { FREE_SHIPPING_THRESHOLD_CENTS, SERVICE_LABEL, ZIP_RE, money } from "@/lib/commerce/config";
import { preorderLine } from "@/lib/commerce/preorder";

/**
 * ZIP → USPS options (D-120). Lives on the cart page and the checkout summary;
 * state is in the cart context so both show the same choice. Standard is free
 * at $75+; Priority always costs its quote. During a Shippo outage only the
 * flat Standard fallback is offered.
 */
export function ShippingPicker({ compact = false }: { compact?: boolean }) {
  const cart = useCart();
  const { zip, service, status, quote, option, error, setZip, setService } = cart.shipping;
  const zipOk = ZIP_RE.test(zip);
  const preorder = preorderLine(cart.shipsAfter);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <label className="block">
        <span className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Ship to ZIP code
        </span>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="60601"
          aria-invalid={zip.length > 0 && !zipOk}
          className="mt-1 h-10 w-full border border-hairline px-3 font-mono text-sm text-ink outline-none focus:border-ink md:max-w-[180px]"
        />
      </label>

      {!zipOk && <p className="text-xs text-neutral-500">Enter your ZIP to see USPS rates. US addresses only.</p>}

      {zipOk && status === "loading" && <p className="text-xs text-neutral-500">Getting USPS rates…</p>}

      {zipOk && status === "error" && (
        <p className="text-xs text-red-700">{error ?? "Could not get shipping rates — please try again."}</p>
      )}

      {zipOk && status === "ready" && quote && (
        <fieldset className="space-y-1.5">
          <legend className="sr-only">Shipping service</legend>
          {quote.options.map((o) => {
            const label = SERVICE_LABEL[o.service];
            const chosen = option?.service === o.service;
            return (
              <label
                key={o.service}
                className={`flex cursor-pointer items-start justify-between gap-3 border px-3 py-2 text-sm ${
                  chosen ? "border-ink" : "border-hairline hover:border-neutral-400"
                }`}
              >
                <span className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="ship-service"
                    value={o.service}
                    checked={chosen}
                    onChange={() => setService(o.service)}
                    className="mt-1 accent-ink"
                  />
                  <span>
                    <span className="font-condensed font-semibold uppercase tracking-wide text-ink">{label.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {label.carrier}
                      {o.days ? ` · about ${o.days} ${o.days === 1 ? "day" : "days"}` : ""}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {o.cents === 0 ? (
                    <>
                      <span className="font-semibold text-green-700">FREE</span>
                      <span className="block text-[11px] text-neutral-400 line-through">{money(o.quotedCents)}</span>
                    </>
                  ) : (
                    <span className="font-medium text-ink">{money(o.cents)}</span>
                  )}
                </span>
              </label>
            );
          })}
          {quote.fallback && (
            <p className="text-xs text-amber-700">
              Live USPS rates are unavailable right now, so a flat Standard rate is shown.
            </p>
          )}
          {service === "standard" && cart.subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS && (
            <p className="text-xs text-neutral-500">
              Standard shipping is free on merchandise orders of {money(FREE_SHIPPING_THRESHOLD_CENTS)}+.
            </p>
          )}
        </fieldset>
      )}

      {preorder && (
        <p className="border-l-2 border-ink pl-3 text-xs text-ink">
          {preorder}. Your whole order ships together once the pre-order item arrives.
        </p>
      )}
    </div>
  );
}
