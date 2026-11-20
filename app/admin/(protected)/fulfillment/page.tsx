import Link from "next/link";
import { loadProviders } from "@/lib/commerce/providers.server";
import { FulfillmentTable } from "./FulfillmentTable";

export const dynamic = "force-dynamic";

/**
 * /admin/fulfillment — print-on-demand vendor settings (D-146). Vendors are
 * fulfilled by hand (D-145): no store connection, no API. Customers never see a
 * vendor name; they see only the made-to-order line previewed on each card.
 */
export default async function AdminFulfillmentPage() {
  const providers = await loadProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Fulfillment</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          The print-on-demand vendors you place orders with by hand. Set each vendor&apos;s production window so
          its products show “Made to order · ships in X–Y business days”; leave the days blank to show just
          “Made to order”. Vendor names and links stay internal — pick the vendor per product under{" "}
          <Link href="/admin/apparel" className="underline">
            Apparel
          </Link>
          .
        </p>
      </div>

      {providers.length === 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No vendors found. Apply <code>supabase/migrations/20261120120000_pod_providers.sql</code> in the Supabase SQL
          editor — it creates the <code>fulfillment_providers</code> table with the four vendors.
        </p>
      ) : (
        <FulfillmentTable providers={providers} />
      )}
    </div>
  );
}
