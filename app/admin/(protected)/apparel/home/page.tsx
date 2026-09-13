import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { heroAnchorId } from "../../heroes/hero-config";
import { ApparelTabs } from "../ApparelTabs";
import { HomeSettingsForm, type CollectionOption } from "./HomeSettingsForm";
import { TabTilesEditor } from "./TabTilesEditor";
import type { SettingsRow, TileRow } from "./actions";

export const dynamic = "force-dynamic";

/** /admin/apparel/home — the /apparel showcase: merch_settings (D-079) + category tiles. */
export default async function AdminApparelHomePage() {
  let settings: SettingsRow | null = null;
  let collections: CollectionOption[] = [];
  let tiles: TileRow[] = [];
  let heroStatus: "set" | "placeholder" | "none" = "none";
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const [s, c, t, h] = await Promise.all([
      db.from("merch_settings").select("*").eq("id", true).maybeSingle(),
      db.from("merch_collections").select("id, name, slug").order("sort_order", { ascending: true }),
      db.from("merch_tab_tiles").select("*").order("sort_order", { ascending: true }),
      db.from("content_heroes").select("media_url").eq("page", "/apparel").eq("is_default", true).eq("is_active", true).maybeSingle(),
    ]);
    const err = s.error ?? c.error ?? t.error ?? h.error;
    if (err) loadError = err.message;
    settings = s.data ?? null;
    collections = c.data ?? [];
    tiles = t.data ?? [];
    heroStatus = h.data ? (h.data.media_url.startsWith("/placeholders/") ? "placeholder" : "set") : "none";
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load home settings.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Apparel</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          The <code>/apparel</code> showcase home: hero copy and CTA, the featured collection, how many New Releases to
          show, and the category tiles. Hero <em>media</em> lives in Heroes; collections live in the Collections tab.
        </p>
      </div>
      <ApparelTabs />

      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm ${
          heroStatus === "set" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <span>
          {heroStatus === "set" && "Hero media for /apparel is set."}
          {heroStatus === "placeholder" && "Hero media for /apparel is still the placeholder — upload the real asset in Heroes."}
          {heroStatus === "none" && "No active default hero for /apparel — the page shows the static fallback."}
        </span>
        <Link href={`/admin/heroes#${heroAnchorId("/apparel")}`} className="font-semibold underline">
          Manage hero media →
        </Link>
      </div>

      {loadError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <HomeSettingsForm settings={settings} collections={collections} />
      <TabTilesEditor tiles={tiles} />
    </div>
  );
}
