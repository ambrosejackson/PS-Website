/**
 * /admin/orders — paid merch orders are worked here (D-041; PSM mirror deferred
 * to W4). Stub: the list / fulfillment workflow lands in a later session.
 */
export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Orders</h1>
      <p className="mt-2 max-w-prose text-sm text-neutral-600">
        Paid merch orders from Stripe and PayPal. Work each order through
        new → placed with provider → packed → shipped → delivered; self-fulfilled
        items skip the provider step.
      </p>
      <p className="mt-6 rounded border border-dashed p-6 text-sm text-neutral-400">
        No orders yet
      </p>
    </div>
  );
}
