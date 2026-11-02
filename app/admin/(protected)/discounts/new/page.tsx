import Link from "next/link";
import { chicagoDayKey } from "@/lib/admin/chicago";
import { NewDiscountForm } from "./NewDiscountForm";

export const dynamic = "force-dynamic";

/** /admin/discounts/new (D-142): mint a batch of single-use admin codes. */
export default function NewDiscountPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-500">
          <Link href="/admin/discounts" className="hover:underline">
            Discounts
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">New discount codes</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Each code is single-use, percent-off the merchandise subtotal (never shipping), and works on both rails. Admin
          codes have no first-order rule. Multi-use and fixed-amount codes are not available.
        </p>
      </div>
      <NewDiscountForm today={chicagoDayKey()} />
    </div>
  );
}
