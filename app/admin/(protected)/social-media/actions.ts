"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { deleteUploadedObject } from "@/lib/admin/upload-actions";
import { revalidateFor } from "@/lib/revalidate";
import type { Database } from "@/lib/database.types";

/**
 * /admin/social-media (D-064): images for the landing-page FOLLOW US strip.
 * No per-image links — the strip + lightbox exist to push the IG/FB buttons.
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

/** Append one or more freshly uploaded images (active, at the end of the order). */
export async function addSocialImages(urls: string[]): Promise<ActionResult<{ added: number }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const clean = urls.map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  if (clean.length === 0) return { ok: false, error: "Upload at least one image first." };

  const db = createAdminClient();
  const { count } = await db
    .from("content_social_images")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const active = count ?? 0;
  if (active + clean.length > SOCIAL_MAX_ACTIVE) {
    return {
      ok: false,
      error: `That would make ${active + clean.length} active images; the cap is ${SOCIAL_MAX_ACTIVE}. Hide or delete some first.`,
    };
  }

  const { data: maxRow } = await db
    .from("content_social_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (maxRow?.sort_order ?? 0) + 1;
  const rows = clean.map((image_url) => ({ image_url, sort_order: next++, is_active: true }));
  const { error } = await db.from("content_social_images").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "social" });
  return { ok: true, data: { added: rows.length } };
}

export async function setSocialImageActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  if (active) {
    const { count } = await db
      .from("content_social_images")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if ((count ?? 0) >= SOCIAL_MAX_ACTIVE) {
      return { ok: false, error: `Already ${SOCIAL_MAX_ACTIVE} active images (the cap). Hide one first.` };
    }
  }
  const { error } = await db.from("content_social_images").update({ is_active: active }).eq("id", id);
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
  const { data: row } = await db.from("content_social_images").select("image_url").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Image not found." };
  const { error } = await db.from("content_social_images").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await deleteUploadedObject(row.image_url);
  revalidateFor({ kind: "social" });
  return { ok: true, data: undefined };
}
