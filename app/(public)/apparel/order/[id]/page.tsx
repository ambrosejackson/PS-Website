import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getOrderWithItems, type OrderWithItems, type ShippingAddressJson } from "@/lib/commerce/orders";
import { getStripe, stripeConfigured } from "@/lib/commerce/stripe";
import {
  addressLines,
  FULFILLMENT_LABEL,
  OrderItems,
  OrderTotals,
  shortOrderId,
} from "@/components/site/OrderSummary";
import { ClearCartOnLoad } from "@/components/site/ClearCartOnLoad";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /apparel/order/[id] — confirmation + status page, no auth. Access proof is
 * ONE of: Stripe `session_id` that belongs to this order (success redirect),
 * PayPal `token` (the PayPal order id on this order), or the customer's email
 * (lookup form). Shows items, totals, status, tracking.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function proveAccess(
  order: OrderWithItems,
  p: { session_id?: string; token?: string; email?: string },
): Promise<"session" | "token" | "email" | null> {
  if (p.session_id && order.stripe_session_id === p.session_id) return "session";
  if (p.session_id && stripeConfigured()) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(p.session_id);
      if (s.client_reference_id === order.id || s.metadata?.order_id === order.id) return "session";
    } catch {
      /* invalid session id */
    }
  }
  if (p.token && order.paypal_order_id === p.token) return "token";
  if (p.email && order.email && p.email.trim().toLowerCase() === order.email.toLowerCase()) return "email";
  return null;
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string; token?: string; email?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = UUID.test(id) ? await getOrderWithItems(id) : null;
  const access = order ? await proveAccess(order, sp) : null;

  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 md:py-16">
        {!order || !access ? (
          <>
            <h1 className="font-condensed text-3xl font-bold uppercase tracking-tight text-ink">Find your order</h1>
            <p className="mt-2 text-sm text-neutral-500">
              {order
                ? "Enter the email you used at checkout to view this order."
                : "We couldn't find that order. Check the link in your confirmation email, or enter your details below."}
            </p>
            <form method="get" className="mt-6 flex max-w-md flex-col gap-2">
              <input
                type="email"
                name="email"
                required
                defaultValue={sp.email ?? ""}
                placeholder="Email used at checkout"
                className="h-11 border border-hairline px-3 text-sm outline-none focus:border-ink"
              />
              <button type="submit" className="bg-ink py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85">
                View order
              </button>
              {sp.email && order && <p className="text-xs text-red-600">That email doesn&apos;t match this order.</p>}
            </form>
            <p className="mt-8 text-xs text-neutral-400">
              Questions? <Link href="/contact" className="underline">Contact us</Link>.
            </p>
          </>
        ) : (
          <OrderView order={order} justPaid={access === "session" || access === "token"} />
        )}
      </section>
      <Footer />
    </main>
  );
}

function OrderView({ order, justPaid }: { order: OrderWithItems; justPaid: boolean }) {
  const addr = order.shipping_address as ShippingAddressJson | null;
  const tracking = (order.tracking as { carrier?: string; number?: string; url?: string | null } | null) ?? null;
  const processing = order.status === "pending";
  const failed = order.status === "failed";
  return (
    <>
      {justPaid && <ClearCartOnLoad />}
      {processing && (
        // Stripe webhook can land a second or two after the redirect.
        <meta httpEquiv="refresh" content="4" />
      )}
      <p className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Order #{shortOrderId(order.id)} · {new Date(order.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
      <h1 className="mt-2 font-condensed text-3xl font-bold uppercase tracking-tight text-ink md:text-4xl">
        {failed ? "Payment not completed" : processing ? "Confirming your payment…" : justPaid ? "Thank you — order confirmed" : "Your order"}
      </h1>
      {processing && (
        <p className="mt-2 text-sm text-neutral-500">This page refreshes automatically. Your confirmation email is on its way.</p>
      )}
      {failed && (
        <p className="mt-2 text-sm text-neutral-500">
          This checkout wasn&apos;t completed. <Link href="/apparel/checkout" className="underline">Return to checkout</Link>.
        </p>
      )}

      {!failed && (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_260px]">
          <div>
            <OrderItems items={order.order_items} />
            <OrderTotals o={order} />
          </div>
          <aside className="space-y-5 text-sm">
            <div>
              <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Status</h2>
              <p className="mt-1 font-medium text-ink">
                {order.status === "refunded"
                  ? "Refunded"
                  : processing
                    ? "Payment processing"
                    : (FULFILLMENT_LABEL[order.fulfillment_status] ?? order.fulfillment_status)}
              </p>
              {!processing && order.fulfillment_status !== "shipped" && order.fulfillment_status !== "delivered" && order.status === "paid" && (
                <p className="mt-1 text-xs text-neutral-500">You&apos;ll get an email with tracking as soon as it ships.</p>
              )}
            </div>
            {tracking?.number && (
              <div>
                <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Tracking</h2>
                <p className="mt-1 text-ink">
                  {tracking.carrier}{" "}
                  {tracking.url ? (
                    <a href={tracking.url} target="_blank" rel="noreferrer" className="font-mono underline">
                      {tracking.number}
                    </a>
                  ) : (
                    <span className="font-mono">{tracking.number}</span>
                  )}
                </p>
              </div>
            )}
            {addr && (
              <div>
                <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Shipping to</h2>
                <p className="mt-1 whitespace-pre-line text-ink">{addressLines(addr).join("\n")}</p>
              </div>
            )}
            <div>
              <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Paid with</h2>
              <p className="mt-1 text-ink">{order.payment_provider === "paypal" ? "PayPal" : "Card / wallet"}</p>
            </div>
          </aside>
        </div>
      )}
      <p className="mt-10 text-xs text-neutral-400">
        Keep this link to check your order anytime. Questions? <Link href="/contact" className="underline">Contact us</Link>.
      </p>
    </>
  );
}
