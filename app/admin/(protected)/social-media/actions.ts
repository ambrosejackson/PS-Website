"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { deleteUploadedObject } from "@/lib/admin/upload-actions";
import { revalidateFor } from "@/lib/revalidate";
import { brandBySlug } from "@/lib/brands";
import type { Database } from "@/lib/database.types";

/**
 * /admin/social-media (D-064): images for the landing-page FOLLOW US strip.
 * Tiles are images or short muted videos; each may link to its Instagram post (D-068).
 */

export type SocialImageRow = Database["public"]["Tables"]["content_social_images"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

import { SOCIAL_MAX_ACTIVE } from "./config";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export interface NewSocialTile {
  url: string;
  mediaType: "image" | "video";
  posterUrl?: string | null;
}

const IG_POST = /^https:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/;

/** null/"" → landing strip; otherwise must be a lib/brands.ts slug (guardrail #3). */
function normalizeBrand(raw: string | null | undefined): { brand: string | null } | { error: string } {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return { brand: null };
  if (!brandBySlug(t)) return { error: `Unknown brand "${t}".` };
  return { brand: t };
}

/** Active-tile count in one pool (landing = null brand, else the brand slug). */
async function activeInPool(db: ReturnType<typeof createAdminClient>, brand: string | null): Promise<number> {
  let q = db.from("content_social_images").select("id", { count: "exact", head: true }).eq("is_active", true);
  q = brand === null ? q.is("brand", null) : q.eq("brand", brand);
  const { count } = await q;
  return count ?? 0;
}

/** Normalize an Instagram post URL; "" → null; anything else → error string. */
function normalizeLink(raw: string | null | undefined): { url: string | null } | { error: string } {
  const t = (raw ?? "").trim();
  if (!t) return { url: null };
  const withScheme = /^https?:\/\//.test(t) ? t : `https://${t}`;
  if (!IG_POST.test(withScheme)) {
    return { error: "Link must be an Instagram post or reel URL, e.g. https://www.instagram.com/p/ABC123/" };
  }
  return { url: withScheme.replace(/\?.*$/, "").replace(/\/?$/, "/") };
}

/** Append freshly uploaded tiles (active, at the end of their pool's order). */
export async function addSocialImages(
  tiles: NewSocialTile[],
  brandRaw?: string | null,
): Promise<ActionResult<{ added: number }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const clean = tiles.filter((t) => /^https?:\/\//.test(t.url.trim()));
  if (clean.length === 0) return { ok: false, error: "Upload at least one image or video first." };
  const nb = normalizeBrand(brandRaw);
  if ("error" in nb) return { ok: false, error: nb.error };

  const db = createAdminClient();
  const active = await activeInPool(db, nb.brand);
  if (active + clean.length > SOCIAL_MAX_ACTIVE) {
    return {
      ok: false,
      error: `That would make ${active + clean.length} active tiles; the cap is ${SOCIAL_MAX_ACTIVE}. Hide or delete some first.`,
    };
  }

  const { data: maxRow } = await db
    .from("content_social_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (maxRow?.sort_order ?? 0) + 1;
  const rows = clean.map((t) => ({
    image_url: t.url.trim(),
    media_type: t.mediaType,
    poster_url: t.mediaType === "video" ? t.posterUrl?.trim() || null : null,
    sort_order: next++,
    is_active: true,
    brand: nb.brand,
  }));
  const { error } = await db.from("content_social_images").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: { added: rows.length } };
}

/** Set / clear the Instagram post a tile opens (D-068). */
export async function updateSocialImageLink(id: string, link: string): Promise<ActionResult<{ url: string | null }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const n = normalizeLink(link);
  if ("error" in n) return { ok: false, error: n.error };
  const { error } = await createAdminClient().from("content_social_images").update({ link_url: n.url }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: { url: n.url } };
}

export async function setSocialImageActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  if (active) {
    const { data: row } = await db.from("content_social_images").select("brand").eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "Tile not found." };
    if ((await activeInPool(db, row.brand)) >= SOCIAL_MAX_ACTIVE) {
      return { ok: false, error: `Already ${SOCIAL_MAX_ACTIVE} active tiles in this pool (the cap). Hide one first.` };
    }
  }
  const { error } = await db.from("content_social_images").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}

/** Move a tile between pools (landing strip ↔ a brand page's feed). */
export async function updateSocialImageBrand(id: string, brandRaw: string | null): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const nb = normalizeBrand(brandRaw);
  if ("error" in nb) return { ok: false, error: nb.error };
  const db = createAdminClient();
  const { data: row } = await db.from("content_social_images").select("brand, is_active").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Tile not found." };
  if (row.brand === nb.brand) return { ok: true, data: undefined };
  if (row.is_active && (await activeInPool(db, nb.brand)) >= SOCIAL_MAX_ACTIVE) {
    return { ok: false, error: `The destination pool already has ${SOCIAL_MAX_ACTIVE} active tiles (the cap).` };
  }
  const { error } = await db.from("content_social_images").update({ brand: nb.brand }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}

export async function updateSocialImageAlt(id: string, alt: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const { error } = await createAdminClient()
    .from("content_social_images")
    .update({ alt: alt.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}

/** Persist a full drag-reorder; sort_order becomes 1..n in the given order. */
export async function reorderSocialImages(orderedIds: string[]): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db.from("content_social_images").update({ sort_order: i + 1 }).eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}

export async function deleteSocialImage(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  const { data: row } = await db.from("content_social_images").select("image_url, poster_url").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Tile not found." };
  const { error } = await db.from("content_social_images").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await deleteUploadedObject(row.image_url);
  if (row.poster_url) await deleteUploadedObject(row.poster_url);
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}
