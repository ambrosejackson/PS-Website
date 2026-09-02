import { createAdminClient } from "@/lib/supabase/admin";
import { SocialUploader } from "./SocialUploader";
import { SocialImagesTable } from "./SocialImagesTable";
import { SOCIAL_MAX_ACTIVE, SOCIAL_SOFT_MIN } from "./config";
import type { SocialImageRow } from "./actions";

export const dynamic = "force-dynamic";

/** /admin/social-media — images for the landing-page FOLLOW US strip + lightbox (D-064). */
export default async function AdminSocialMediaPage() {
  let rows: SocialImageRow[] = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await createAdminClient()
      .from("content_social_images")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load images.";
  }
  const active = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Social Media</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Images for the FOLLOW US strip on the landing page. They scroll continuously in this order; clicking one opens
          a larger view with the Instagram and Facebook buttons. Images don&apos;t link anywhere — the goal is the
          buttons. Keep {SOCIAL_SOFT_MIN}–{SOCIAL_MAX_ACTIVE} active.
        </p>
        <p className={`mt-2 text-sm font-semibold ${active < SOCIAL_SOFT_MIN ? "text-amber-700" : "text-neutral-700"}`}>
          {active} of {SOCIAL_MAX_ACTIVE} active
          {active === 0 ? " — site is showing placeholders" : active < SOCIAL_SOFT_MIN ? ` — under ${SOCIAL_SOFT_MIN}, the strip will repeat visibly` : ""}
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Add images</h2>
        <SocialUploader activeCount={active} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Strip images</h2>
        {loadError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : <SocialImagesTable rows={rows} />}
      </section>
    </div>
  );
}
