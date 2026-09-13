import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { heroAnchorId } from "../../../heroes/hero-config";
import { CollectionEditor } from "../CollectionEditor";
import type { BannerRow, CollectionRow } from "../actions";

export const dynamic = "force-dynamic";

/** /admin/apparel/collections/[id] — "new" creates; otherwise edits a collection + its banners. */
export default async function AdminCollectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let collection: CollectionRow | null = null;
  let banners: BannerRow[] = [];
  let heroStatus: "set" | "placeholder" | "none" = "none";
  if (id !== "new") {
    const db = createAdminClient();
    const { data } = await db.from("merch_collections").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    collection = data;
    const [b, h] = await Promise.all([
      db.from("merch_collection_banners").select("*").eq("collection_id", id).order("insert_after", { ascending: true }),
      db.from("content_heroes").select("media_url").eq("page", data.hero_page).eq("is_default", true).eq("is_active", true).maybeSingle(),
    ]);
    banners = b.data ?? [];
    heroStatus = h.data ? (h.data.media_url.startsWith("/placeholders/") ? "placeholder" : "set") : "none";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/apparel/collections" className="text-xs text-neutral-500 hover:underline">
          ← Collections
        </Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">{collection ? collection.name : "New collection"}</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          {collection?.slug === "all"
            ? "The reserved shop-all row: no cover, never in the carousel, cannot be deleted. Its banners appear on /apparel/shop."
            : "Cover image is the carousel card (4:5). The collection's hero banner is managed in Heroes; saving a new collection creates its hero row with placeholder media."}
        </p>
      </div>
      {collection && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm ${
            heroStatus === "set" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span>
            Hero for <code>{collection.hero_page}</code>:{" "}
            {heroStatus === "set" ? "set." : heroStatus === "placeholder" ? "placeholder — upload the real banner in Heroes." : "none — the page shows the static fallback."}
          </span>
          <Link href={`/admin/heroes#${heroAnchorId(collection.hero_page)}`} className="font-semibold underline">
            Manage hero media →
          </Link>
        </div>
      )}
      <CollectionEditor collection={collection} banners={banners} />
    </div>
  );
}
