"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { revalidateFor } from "@/lib/revalidate";
import { slugify } from "@/lib/sheet-sync/map";
import type { Database } from "@/lib/database.types";

export type CollectionRow = Database["public"]["Tables"]["merch_collections"]["Row"];
export type BannerRow = Database["public"]["Tables"]["merch_collection_banners"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PLACEHOLDER_HERO = "/placeholders/hero-default.webp";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}
const admin = () => createAdminClient();

function cleanText(v: string | null | undefined, max = 200): string | null {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
}
function cleanUrl(v: string | null | undefined): string | null | false {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 300);
  if (/^https?:\/\//i.test(s)) return s.slice(0, 500);
  return false;
}
/** datetime-local value (or ISO) → ISO string; empty → null; garbage → false. */
function cleanDate(v: string | null | undefined): string | null | false {
  const s = (v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? false : d.toISOString();
}

export async function checkCollectionSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  let q = admin().from("merch_collections").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

export interface CollectionInput {
  id?: string;
  name: string;
  slug: string;
  tagline: string;
  subtitle: string;
  cover_image_url: string;
  is_active: boolean;
  sort_order: number | null;
  starts_at: string;
  ends_at: string;
}

/**
 * Create / update a collection. Creating also creates the collection's default
 * content_heroes row (placeholder media) under its generated hero_page so
 * /admin/heroes lists it immediately; renaming the slug moves those hero rows.
 */
export async function saveCollection(input: CollectionInput): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  if (!slug || !SLUG_RE.test(slug)) return { ok: false, error: "Slug must be lowercase letters, digits and single hyphens." };
  const starts = cleanDate(input.starts_at);
  const ends = cleanDate(input.ends_at);
  if (starts === false || ends === false) return { ok: false, error: "Enter valid start / end dates." };
  if (starts && ends && starts >= ends) return { ok: false, error: "Start must be before end." };
  const cover = cleanUrl(input.cover_image_url);
  if (cover === false) return { ok: false, error: "Cover image must be an uploaded URL." };

  let existing: CollectionRow | null = null;
  if (input.id) {
    const { data } = await db.from("merch_collections").select("*").eq("id", input.id).maybeSingle();
    if (!data) return { ok: false, error: "Collection not found." };
    existing = data;
  }
  const isAll = existing?.slug === "all";
  if (!existing && slug === "all") return { ok: false, error: "'all' is the reserved shop-all collection." };
  if (isAll && slug !== "all") return { ok: false, error: "The reserved 'all' collection cannot be renamed." };
  if (slug !== existing?.slug && !(await checkCollectionSlugAvailable(slug, existing?.id))) {
    return { ok: false, error: `Slug "${slug}" is already in use.` };
  }

  const base = {
    name,
    slug,
    tagline: cleanText(input.tagline, 120),
    subtitle: cleanText(input.subtitle, 80),
    cover_image_url: isAll ? null : cover, // the shop-all row never gets a cover (D-070)
    is_active: !!input.is_active,
    sort_order: input.sort_order ?? existing?.sort_order ?? 0,
    starts_at: starts,
    ends_at: ends,
  };

  if (existing) {
    const { data, error } = await db.from("merch_collections").update(base).eq("id", existing.id).select("id, slug, hero_page").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
    if (data.hero_page !== existing.hero_page) {
      // Slug renamed → the generated hero_page changed; carry the hero rows along.
      await db.from("content_heroes").update({ page: data.hero_page }).eq("page", existing.hero_page);
      revalidateFor({ kind: "heroes", page: existing.hero_page });
    }
    revalidateFor({ kind: "apparel-collection", slug: existing.slug }, { kind: "apparel-collection", slug: data.slug }, { kind: "heroes", page: data.hero_page });
    return { ok: true, data: { id: data.id, slug: data.slug } };
  }

  const { data: maxRow } = await db
    .from("merch_collections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await db
    .from("merch_collections")
    .insert({ ...base, sort_order: input.sort_order ?? (maxRow?.sort_order ?? 0) + 1 })
    .select("id, slug, hero_page")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  // Default hero row so /admin/heroes shows the page right away (placeholder media).
  const { data: existingHero } = await db.from("content_heroes").select("id").eq("page", data.hero_page).limit(1);
  if (!existingHero || existingHero.length === 0) {
    await db.from("content_heroes").insert({
      page: data.hero_page,
      media_url: PLACEHOLDER_HERO,
      media_type: "image",
      theme: "dark",
      is_default: true,
      sort_order: 0,
      is_active: true,
    });
  }
  revalidateFor({ kind: "apparel-collection", slug: data.slug });
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function setCollectionActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const { data, error } = await admin().from("merch_collections").update({ is_active: active }).eq("id", id).select("slug").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
  revalidateFor({ kind: "apparel-collection", slug: data.slug });
  return { ok: true, data: undefined };
}

/** Delete a collection (never 'all'). Products keep existing with collection_id = null; banners cascade; hero rows are removed. */
export async function deleteCollection(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: row } = await db.from("merch_collections").select("slug, hero_page").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Collection not found." };
  if (row.slug === "all") return { ok: false, error: "The reserved 'all' collection cannot be deleted." };
  const { error } = await db.from("merch_collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("content_heroes").delete().eq("page", row.hero_page);
  revalidateFor({ kind: "apparel-collection", slug: row.slug }, { kind: "heroes", page: row.hero_page });
  return { ok: true, data: undefined };
}

// ===== Interstitial banners (D-070) =====

export interface BannerInput {
  id?: string;
  collection_id: string;
  insert_after: number;
  media_url: string;
  media_url_mobile: string;
  media_type: "image" | "video";
  link_url: string;
  alt: string;
  is_active: boolean;
}

export async function saveCollectionBanner(input: BannerInput): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: col } = await db.from("merch_collections").select("slug").eq("id", input.collection_id).maybeSingle();
  if (!col) return { ok: false, error: "Collection not found." };
  const after = Math.round(Number(input.insert_after));
  if (!Number.isFinite(after) || after < 1) return { ok: false, error: "Insert after must be 1 or more (product position)." };
  const media = (input.media_url ?? "").trim();
  if (!/^https?:\/\//.test(media)) return { ok: false, error: "Upload the desktop media first." };
  const mobile = (input.media_url_mobile ?? "").trim();
  if (mobile && !/^https?:\/\//.test(mobile)) return { ok: false, error: "Mobile media must be an uploaded URL." };
  const link = cleanUrl(input.link_url);
  if (link === false) return { ok: false, error: "Link must be a site path or https:// URL." };
  const mediaType = input.media_type === "video" ? "video" : "image";

  const row = {
    collection_id: input.collection_id,
    insert_after: after,
    media_url: media,
    media_url_mobile: mobile || null,
    media_type: mediaType,
    link_url: link,
    alt: cleanText(input.alt, 160),
    is_active: !!input.is_active,
  };
  let id = input.id;
  if (id) {
    const { error } = await db.from("merch_collection_banners").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await db.from("merch_collection_banners").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
    id = data.id;
  }
  revalidateFor({ kind: "apparel-collection", slug: col.slug });
  return { ok: true, data: { id } };
}

export async function deleteCollectionBanner(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: b } = await db.from("merch_collection_banners").select("collection_id").eq("id", id).maybeSingle();
  if (!b) return { ok: false, error: "Banner not found." };
  const { error } = await db.from("merch_collection_banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  const { data: col } = await db.from("merch_collections").select("slug").eq("id", b.collection_id).maybeSingle();
  revalidateFor({ kind: "apparel-collection", slug: col?.slug });
  return { ok: true, data: undefined };
}
