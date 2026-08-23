import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import { ALL_PERSONA_TAGS, NON_BRAND_CONTEXT } from "@/lib/personas";
import { listSubscribers, type SubscriberFilters, type SubscriberListRow } from "./actions";
import { SubscribersTable } from "./SubscribersTable";

export const dynamic = "force-dynamic";

/** /admin/subscribers — read table with email search, brand/persona/date filters, code status, CSV export, delete. */
export default async function AdminSubscribersPage({ searchParams }: { searchParams: Promise<SubscriberFilters> }) {
  const sp = await searchParams;
  const filters: SubscriberFilters = {
    q: sp.q?.trim() || undefined,
    brand: sp.brand || undefined,
    persona: sp.persona || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  };
  let rows: SubscriberListRow[] = [];
  let loadError: string | null = null;
  try {
    rows = await listSubscribers(filters);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load subscribers.";
  }
  const inputCls = "h-9 rounded-md border bg-white px-3 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Subscribers</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Newsletter signups (persona `Website Sign-up – {"{Brand}"}`, guardrail #7) with their one-time 15% code and
          PSM sync state. Export the current view as CSV; delete handles removal requests (row removed, code expired,
          Stripe promotion code deactivated when present).
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded border bg-white p-3">
        <label className="text-xs text-neutral-600">
          Email
          <input name="q" defaultValue={filters.q ?? ""} placeholder="search…" className={`${inputCls} ml-2 min-w-52`} />
        </label>
        <label className="text-xs text-neutral-600">
          Brand
          <select name="brand" defaultValue={filters.brand ?? ""} className={`${inputCls} ml-2`}>
            <option value="">All</option>
            <option value={NON_BRAND_CONTEXT}>{NON_BRAND_CONTEXT}</option>
            {BRANDS.map((b) => (
              <option key={b.slug} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Persona
          <select name="persona" defaultValue={filters.persona ?? ""} className={`${inputCls} ml-2`}>
            <option value="">All</option>
            {ALL_PERSONA_TAGS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          From
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={`${inputCls} ml-2`} />
        </label>
        <label className="text-xs text-neutral-600">
          To
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={`${inputCls} ml-2`} />
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
          Filter
        </button>
        <Link href="/admin/subscribers" className="text-xs text-neutral-500 underline">
          Clear
        </Link>
      </form>

      {loadError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : <SubscribersTable rows={rows} filters={filters} />}
    </div>
  );
}
