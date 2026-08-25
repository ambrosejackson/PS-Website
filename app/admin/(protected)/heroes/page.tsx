import { createAdminClient } from "@/lib/supabase/admin";
import type { HeroAsset } from "@/lib/data";
import { HeroUploadForm } from "./HeroUploadForm";
import { HeroRowActions } from "./HeroRowActions";
import { HERO_PAGES, navTargetLabel } from "./hero-config";

export const dynamic = "force-dynamic";

/**
 * /admin/heroes — hero media per public page (D-044). Grouped in the spec's
 * page order; exactly one default per page; landing rows carry the nav hover
 * target. Public pages read their default via getHeroesForPage() and fall back
 * to a styled static hero when a page has no active row.
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
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load heroes.";
  }

  const byPage = new Map<string, HeroAsset[]>();
  for (const r of rows) byPage.set(r.page, [...(byPage.get(r.page) ?? []), r]);
  const knownPages = new Set<string>(HERO_PAGES.map((p) => p.page));
  const extraPages = [...byPage.keys()].filter((p) => !knownPages.has(p));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Heroes</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          One default hero per page (image or MP4). Theme is auto-computed from the asset&apos;s top band and can be
          overridden; it drives the header text color on brand pages. Landing heroes can additionally be assigned to a
          nav hover target (BRANDS / STORE LOCATOR / YOUR REWARDS). Pages with no active hero show a styled static
          fallback. TerpKings keeps its CRT layering with the video underneath.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Add a hero</h2>
        <HeroUploadForm defaultPage="/" />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Heroes by page</h2>
        {loadError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
        {[...HERO_PAGES.map((p) => ({ page: p.page, label: p.label })), ...extraPages.map((p) => ({ page: p, label: p }))].map(
          ({ page, label }) => {
            const list = byPage.get(page) ?? [];
            const hasDefault = list.some((h) => h.is_default && h.is_active);
            return (
              <div key={page} className="rounded border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
                  <div>
                    <span className="font-condensed text-sm font-semibold uppercase tracking-wide">{label}</span>
                    <span className="ml-2 font-mono text-xs text-neutral-500">{page}</span>
                  </div>
                  <span className={`text-xs ${hasDefault ? "text-green-700" : "text-amber-700"}`}>
                    {hasDefault ? "default set" : list.length ? "no active default — page shows the static fallback" : "no heroes — page shows the static fallback"}
                  </span>
                </div>
                {list.length > 0 && (
                  <ul className="divide-y">
                    {list.map((h) => (
                      <li key={h.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                        <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-neutral-200">
                          {h.media_type === "video" ? (
                            <video src={h.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={h.media_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">{h.media_type}</span>
                            <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">theme: {h.theme}</span>
                            {h.is_default && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">default</span>}
                            {h.nav_target && (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">hover: {navTargetLabel(h.nav_target)}</span>
                            )}
                            {!h.is_active && <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">inactive</span>}
                            {h.media_type === "video" &&
                              (h.poster_url ? (
                                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800" title={h.poster_url}>poster ✓</span>
                              ) : (
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">no poster — gradient flash until generated</span>
                              ))}
                            {h.media_type === "video" && h.has_audio && (
                              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">audio ✓</span>
                            )}
                            {h.media_type === "video" && h.audio_autoplay && (
                              <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">AUTOPLAY AUDIO</span>
                            )}
                            {h.media_type === "video" && h.audio_autoplay && !h.is_default && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">⚠ audio ignored — only the default hero plays sound</span>
                            )}
                            {h.media_type === "video" && !h.video_loop && (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">no loop — plays once</span>
                            )}
                            {h.media_type === "video" && h.media_url_mobile && (
                              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700" title={h.media_url_mobile}>mobile ✓</span>
                            )}
                          </div>
                          <a href={h.media_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-neutral-500 underline">
                            {h.media_url}
                          </a>
                        </div>
                        <HeroRowActions
                          id={h.id}
                          page={h.page}
                          isDefault={h.is_default}
                          isActive={h.is_active}
                          theme={h.theme}
                          navTarget={h.nav_target}
                          mediaUrl={h.media_url}
                          mediaType={h.media_type}
                          posterUrl={h.poster_url}
                          hasAudio={h.has_audio}
                          audioAutoplay={h.audio_autoplay}
                          audioVolume={h.audio_volume}
                          mediaUrlMobile={h.media_url_mobile}
                          videoLoop={h.video_loop}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          },
        )}
      </section>
    </div>
  );
}
