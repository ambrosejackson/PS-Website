import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISCOUNT_STATUSES, DISCOUNT_STATUS_LABEL, isDiscountStatus } from "@/lib/commerce/discount-codes";
import { listDiscountCodes, type DiscountFilters, type DiscountList } from "@/lib/commerce/discounts";
import { DiscountsTable } from "./DiscountsTable";

export const dynamic = "force-dynamic";

/**
 * /admin/discounts (D-142): every discount code — newsletter 15% codes and
 * admin-issued batches — with status, subscriber, expiry and redemption.
 * Filters by status and code/email search; 50 per page.
 */
export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filters: DiscountFilters = {
    status: isDiscountStatus(sp.status) ? sp.status : "",
    q: sp.q?.trim() || undefined,
    page: Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1),
  };
  let list: DiscountList = { rows: [], total: 0, page: filters.page ?? 1, pageSize: 50 };
  let loadError: string | null = null;
  try {
    list = await listDiscountCodes(filters);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load discount codes.";
  }
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (filters.status) q.set("status", filters.status);
    if (filters.q) q.set("q", filters.q);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/discounts${s ? `?${s}` : ""}`;
  };
  const inputCls = "h-9 rounded-md border bg-white px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Discounts</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Single-use percent codes. Newsletter codes (15%, first order only) are issued at signup; admin codes are
            issued here and carry no first-order rule. &ldquo;Expire now&rdquo; closes a code here and on Stripe.
          </p>
        </div>
        <Button render={<Link href="/admin/discounts/new" />} size="lg">
          <Plus data-icon="inline-start" /> Discount
        </Button>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded border bg-white p-3">
        <label className="text-xs text-neutral-600">
          Search
          <input name="q" defaultValue={filters.q ?? ""} placeholder="code or email" className={`${inputCls} ml-2 min-w-52`} />
        </label>
        <label className="text-xs text-neutral-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={`${inputCls} ml-2`}>
            <option value="">All</option>
            {DISCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DISCOUNT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Filter
        </button>
        <Link href="/admin/discounts" className="text-xs text-neutral-500 underline">
          Clear
        </Link>
      </form>

      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <>
          <DiscountsTable rows={list.rows} />
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              {list.total.toLocaleString("en-US")} {list.total === 1 ? "code" : "codes"}
              {pages > 1 && ` · page ${list.page} of ${pages}`}
            </span>
            {pages > 1 && (
              <span className="flex gap-3">
                {list.page > 1 && (
                  <Link href={pageHref(list.page - 1)} className="underline">
                    Previous
                  </Link>
                )}
                {list.page < pages && (
                  <Link href={pageHref(list.page + 1)} className="underline">
                    Next
                  </Link>
                )}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
