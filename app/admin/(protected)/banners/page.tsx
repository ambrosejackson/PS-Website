import { createAdminClient } from "@/lib/supabase/admin";
import { BannerForm } from "./BannerForm";
import { BannersTable } from "./BannersTable";
import type { BannerRow } from "./actions";

export const dynamic = "force-dynamic";

/** /admin/banners — landing-only rotating banner slides (D-044): media, link, badge, schedule, order, active. */
export default async function AdminBannersPage() {
  let rows: BannerRow[] = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await createAdminClient()
      .from("content_banners")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load banners.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Banners</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Rotating promo slides on the landing page, BELOW the hero (guardrail #4; landing only per D-044). The
          carousel shows active slides inside their schedule window, in this order, auto-rotating every ~6 s (pauses
          on hover, swipe on mobile).
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Add a banner</h2>
        <BannerForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Slides</h2>
        {loadError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : <BannersTable rows={rows} />}
      </section>
    </div>
  );
}
