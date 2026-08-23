import { createAdminClient } from "@/lib/supabase/admin";
import type { HeroAsset } from "@/lib/data";
import { HeroUploadForm } from "./HeroUploadForm";
import { HeroRowActions } from "./HeroRowActions";

export const dynamic = "force-dynamic";

/**
 * /admin/heroes — hero media per page (build plan decision 3 + 9). Upload
 * images/MP4s to the public `heroes` bucket, set theme, default and nav
 * hover target; toggle/delete existing rows. Reads with the service role so
 * inactive rows are visible too.
 */
export default async function AdminHeroesPage() {
  let rows: HeroAsset[] = [];
  let loadError: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("content_heroes")
      .select("*")
      .order("page", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load heroes.";
  }

  const byPage = new Map<string, HeroAsset[]>();
  for (const r of rows) {
    const list = byPage.get(r.page) ?? [];
    list.push(r);
    byPage.set(r.page, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Heroes</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Hero media per page — upload, set light/dark theme, choose defaults and
          nav hover targets. The TerpKings CRT hero plays the <strong>default video</strong>{" "}
          row for page <code>/terpkings</code>; with no video row it falls back to
          the gradient-only CRT.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Upload hero media
        </h2>
        <HeroUploadForm defaultPage="/terpkings" />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Existing heroes
        </h2>
        {loadError && (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </p>
        )}
        {!loadError && rows.length === 0 && (
          <p className="rounded border border-dashed p-6 text-sm text-neutral-400">
            No hero rows yet.
          </p>
        )}
        {[...byPage.entries()].map(([page, list]) => (
          <div key={page} className="rounded border bg-white">
            <div className="border-b px-4 py-2 font-mono text-sm">{page}</div>
            <ul className="divide-y">
              {list.map((h) => (
                <li key={h.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-neutral-200">
                    {h.media_type === "video" ? (
                      <video
                        src={h.media_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.media_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">
                        {h.media_type}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">
                        theme: {h.theme}
                      </span>
                      {h.is_default && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          default
                        </span>
                      )}
                      {h.nav_target && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          hover: {h.nav_target}
                        </span>
                      )}
                      {!h.is_active && (
                        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                          inactive
                        </span>
                      )}
                    </div>
                    <a
                      href={h.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-neutral-500 underline"
                    >
                      {h.media_url}
                    </a>
                  </div>
                  <HeroRowActions
                    id={h.id}
                    isDefault={h.is_default}
                    isActive={h.is_active}
                    theme={h.theme}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
